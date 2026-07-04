import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnModuleInit } from '@nestjs/common';
import { ModelVersion } from '../../../modules/models/entities/model-version.entity';
import { Model } from '../../../modules/models/entities/model.entity';
import { Deployment } from '../../../modules/deployments/entities/deployment.entity';
import { VersionStatus } from '../../../modules/models/enums/version-status.enum';
import { DeploymentStatus } from '../../../modules/deployments/enums/deployment-status.enum';
import { ModelType } from '../../../modules/models/enums/model-type.enum';
import { Framework } from '../../../modules/models/enums/framework.enum';
import { TaskType } from '../../../modules/models/enums/task-type.enum';
import { SchemaDetectionStatus } from '../../../modules/models/enums/schema-detection-status.enum';
import * as fs from 'fs';
import * as path from 'path';
import * as Docker from 'dockerode';
import { Logger } from '@nestjs/common';
import { BuildJobPayload } from '../interfaces/queue.interface';
import { MinioService } from '../../minio/minio.service';
import { getDockerOptions } from '../../docker/docker.util';

function isZipFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    return buffer.readUInt32LE(0) === 0x04034b50;
  } catch (err) {
    return false;
  }
}

/**
 * Moves a file or directory to `dest`, falling back to a recursive copy +
 * delete when `src` and `dest` live on different filesystems/mounts (e.g.
 * a /tmp build directory vs. a Docker named volume), where a plain rename
 * throws EXDEV.
 */
function moveDirOrFile(src: string, dest: string): void {
  try {
    fs.renameSync(src, dest);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code !== 'EXDEV') {
      throw err;
    }
    const isDir = fs.statSync(src).isDirectory();
    if (isDir) {
      fs.cpSync(src, dest, { recursive: true });
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    }
  }
}

/**
 * BullMQ processor responsible for packaging uploaded model weights and scripts
 * into standalone, self-serving Docker container images.
 */
@Processor('build-queue', {
  concurrency: parseInt(process.env.BUILD_QUEUE_CONCURRENCY || '2', 10),
  lockDuration: 600000, // 10 minutes lock duration to prevent stall on large model weights (e.g. GGUF)
  stalledInterval: 600000,
})
export class BuildProcessor extends WorkerHost implements OnModuleInit {
  private readonly docker: Docker;
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    @InjectRepository(ModelVersion)
    private readonly modelVersionsRepository: Repository<ModelVersion>,
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
    private readonly minioService: MinioService,
    private readonly dataSource: DataSource,
    @InjectQueue('build-queue') private readonly buildQueue: Queue,
  ) {
    super();
    this.docker = new Docker(getDockerOptions());
  }

  /**
   * Registers the hourly repeatable "prune-docker-images" job on the build
   * queue (B6). Pruning dangling/intermediate images used to run
   * synchronously at the end of every single build (blocking up to 30s of
   * the build job's critical path) — it now runs decoupled, on a schedule,
   * exactly like the existing `check-idle-deployments` repeatable job on the
   * deploy queue.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Scheduling repeatable prune-docker-images job...');
    try {
      await this.buildQueue.add(
        'prune-docker-images',
        {},
        {
          repeat: { pattern: '0 * * * *' }, // hourly, on the hour
          jobId: 'prune-docker-images',
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to register prune-docker-images: ${message}`);
    }
  }

  /**
   * Prunes dangling/intermediate Docker images. Runs asynchronously on an
   * hourly schedule (see {@link onModuleInit}) instead of synchronously
   * inline at the end of every build.
   */
  private async pruneDanglingImages(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      execSync('docker image prune -f', { timeout: 30000 });
      this.logger.log(
        'Successfully pruned dangling/intermediate docker images (scheduled).',
      );
    } catch (pruneError: unknown) {
      const pruneMsg =
        pruneError instanceof Error ? pruneError.message : String(pruneError);
      this.logger.warn(`Scheduled docker image prune failed: ${pruneMsg}`);
    }
  }

  /**
   * B3: Runs schema auto-detection (examplePayload/expectedResult) for a
   * model version. This spawns a Python subprocess (or, for GGUF, generates
   * a canned chat-completion example) and can take 30-60s. It is invoked
   * fire-and-forget via {@link scheduleSchemaAutoDetection} after the build
   * completes and the version is already marked READY, so it never holds up
   * the build job's BullMQ lock.
   *
   * @param versionId - The model version's ID to update once detection completes.
   * @param modelType - The model's type (used for GGUF special-casing and passed to the detector script).
   * @param hasExistingPayload - Whether examplePayload/expectedResult are already set (skips work if so).
   * @param modelLocalPath - Local filesystem path to the downloaded model weights, snapshotted before any cleanup/relocation.
   */
  private async runSchemaAutoDetection(
    versionId: string,
    modelType: string,
    hasExistingPayload: boolean,
    modelLocalPath: string,
  ): Promise<void> {
    if (hasExistingPayload) {
      return;
    }
    try {
      this.logger.log(
        `Running background schema auto-detection for version ${versionId}...`,
      );
      const scriptPath = path.join(
        process.cwd(),
        'src',
        'shared',
        'utils',
        'detect_schema.py',
      );

      const isGguf = modelType === ModelType.LLM_GGUF;

      let examplePayload: string | null | undefined;
      let expectedResult: string | null | undefined;

      if (isGguf) {
        examplePayload = JSON.stringify(
          {
            messages: [{ role: 'user', content: 'Hello, how are you?' }],
            temperature: 0.7,
            max_tokens: 128,
            stream: false,
          },
          null,
          2,
        );
        expectedResult = JSON.stringify(
          {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content:
                    "Hello! I'm an AI assistant. How can I help you today?",
                },
              },
            ],
          },
          null,
          2,
        );
      } else if (fs.existsSync(modelLocalPath)) {
        const { execSync } = require('child_process');
        const command = `python "${scriptPath}" "${modelLocalPath}" --model-type "${modelType}"`;
        const stdout = execSync(command, { encoding: 'utf8' });
        const result = JSON.parse(stdout);
        if (result && !result.error) {
          if (typeof result.example_payload === 'string') {
            examplePayload = result.example_payload;
          }
          if (typeof result.expected_result === 'string') {
            expectedResult = result.expected_result;
          }
        }
      }

      if (examplePayload || expectedResult) {
        await this.modelVersionsRepository.update(versionId, {
          examplePayload,
          expectedResult,
          schemaDetectionStatus: SchemaDetectionStatus.AUTO_DETECTED,
        });
        this.logger.log(
          `Background schema auto-detection completed for version ${versionId}`,
        );
      } else {
        await this.modelVersionsRepository.update(versionId, {
          schemaDetectionStatus: SchemaDetectionStatus.NEEDS_ATTENTION,
        });
        this.logger.warn(
          `Background schema auto-detection produced no result for version ${versionId}`,
        );
      }
    } catch (schemaErr: unknown) {
      const message =
        schemaErr instanceof Error ? schemaErr.message : String(schemaErr);
      this.logger.warn(
        `Failed to run background schema auto-detection: ${message}`,
      );
      await this.modelVersionsRepository.update(versionId, {
        schemaDetectionStatus: SchemaDetectionStatus.NEEDS_ATTENTION,
      });
    }
  }

  /**
   * Fire-and-forget scheduler for {@link runSchemaAutoDetection}. Uses
   * `setImmediate` so the call returns instantly and the build job's
   * `process()` promise can resolve/complete without waiting on it.
   */
  private scheduleSchemaAutoDetection(
    versionId: string,
    modelType: string,
    hasExistingPayload: boolean,
    modelLocalPath: string,
  ): void {
    setImmediate(() => {
      this.runSchemaAutoDetection(
        versionId,
        modelType,
        hasExistingPayload,
        modelLocalPath,
      ).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`scheduleSchemaAutoDetection failed: ${message}`);
      });
    });
  }

  /**
   * Processes a background image building job for a specific model version registry.
   * Compiles local artifacts, generates a custom Dockerfile, and runs a docker image builder.
   *
   * @param job - The background job containing the model version ID payload.
   * @returns A promise that resolves when the build is complete.
   */
  /**
   * Helper to persist build progress percentage (0-100) for real-time UI updates.
   */
  private async updateProgress(
    versionId: string,
    progress: number,
    logs?: string,
  ): Promise<void> {
    const updateData: any = { buildProgress: progress };
    if (logs !== undefined) {
      updateData.buildLogs = logs;
    }
    await this.modelVersionsRepository.update(versionId, updateData);
  }

  async process(job: Job<BuildJobPayload, void, string>): Promise<void> {
    if (job.name === 'prune-docker-images') {
      await this.pruneDanglingImages();
      return;
    }

    const { versionId } = job.data;
    const logsBuffer: string[] = [];

    const logInfo = async (msg: string) => {
      this.logger.log(msg);
      logsBuffer.push(`[${new Date().toISOString()}] INFO: ${msg}`);
      await this.modelVersionsRepository.update(versionId, {
        buildLogs: logsBuffer.join('\n'),
      });
    };

    const logError = async (msg: string, stack?: string) => {
      this.logger.error(msg, stack);
      logsBuffer.push(
        `[${new Date().toISOString()}] ERROR: ${msg}${stack ? `\n${stack}` : ''}`,
      );
      await this.modelVersionsRepository.update(versionId, {
        buildLogs: logsBuffer.join('\n'),
      });
    };

    await logInfo(`Starting build process for version: ${versionId}`);

    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model'],
    });

    if (!version) {
      await logError(`Model version ${versionId} not found in database.`);
      return;
    }

    if (version.status === VersionStatus.READY) {
      await logInfo(
        `Model version ${versionId} is already READY. Skipping build.`,
      );
      return;
    }

    // C2: Build-skip / image reuse. If a Docker image for this exact version
    // already exists (e.g. a redeploy or a retried job after the process was
    // built once already) and the version's last recorded status was not
    // FAILED, there is no need to pay the full build cost again — just mark
    // the version READY and let the deploy step pick up the existing image.
    // GGUF models never reach this point with a Docker image (they bypass
    // the build entirely further below), so this only applies to
    // pytorch/tensorflow/sklearn/diffusion image-based versions.
    if (version.status !== VersionStatus.FAILED) {
      const imageName = `model-version-${versionId}`;
      try {
        await this.docker.getImage(imageName).inspect();
        await logInfo(
          `Docker image ${imageName} already exists and last build status was not FAILED. Skipping rebuild and marking version READY.`,
        );
        await this.modelVersionsRepository.update(versionId, {
          status: VersionStatus.READY,
          errorMessage: null,
          buildProgress: 100,
        });
        return;
      } catch (inspectErr: unknown) {
        // Image does not exist locally — proceed with a normal build.
      }
    }

    await this.modelVersionsRepository.update(versionId, {
      status: VersionStatus.BUILDING,
      buildProgress: 0,
      buildLogs: logsBuffer.join('\n'),
    });

    try {
      // Phase 0: Stop active deployments for this version before rebuilding
      const activeDeployments = await this.deploymentsRepository.find({
        where: {
          modelVersion: { id: versionId },
          status: DeploymentStatus.RUNNING,
        },
      });

      for (const deployment of activeDeployments) {
        if (deployment.containerId) {
          try {
            const container = this.docker.getContainer(deployment.containerId);
            await container.stop();
            await container.remove();
            this.logger.log(
              `Stopped container ${deployment.containerId} for rebuild`,
            );
          } catch (stopErr: unknown) {
            const stopMsg =
              stopErr instanceof Error ? stopErr.message : String(stopErr);
            this.logger.warn(
              `Could not stop container ${deployment.containerId}: ${stopMsg}`,
            );
          }
        }
        await this.deploymentsRepository.update(deployment.id, {
          status: DeploymentStatus.STOPPED,
        });
      }

      const buildDir = path.join('/tmp', `build-${versionId}`);
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      // Phase 1: Download model files from MinIO in parallel (5% → 15%)
      await this.updateProgress(versionId, 5);
      const downloads: Promise<void>[] = [];
      if (version.modelFilePath) {
        downloads.push(
          this.minioService.downloadFile(
            version.modelFilePath,
            path.join(buildDir, 'model.pkl'),
          ),
        );
      }
      if (version.scalerFilePath) {
        downloads.push(
          this.minioService.downloadFile(
            version.scalerFilePath,
            path.join(buildDir, 'scaler.pkl'),
          ),
        );
      }
      if (version.preprocessFilePath) {
        downloads.push(
          this.minioService.downloadFile(
            version.preprocessFilePath,
            path.join(buildDir, 'preprocess.py'),
          ),
        );
      }
      if (version.postprocessFilePath) {
        downloads.push(
          this.minioService.downloadFile(
            version.postprocessFilePath,
            path.join(buildDir, 'postprocess.py'),
          ),
        );
      }
      await Promise.all(downloads);

      // Phase 2: Prepare build context (15% → 30%)
      await this.updateProgress(versionId, 15);

      let modelPathEnv = 'model.pkl';
      const modelLocalPath = path.join(buildDir, 'model.pkl');
      if (fs.existsSync(modelLocalPath)) {
        const isZip =
          isZipFile(modelLocalPath) &&
          version.modelFilePath?.toLowerCase().endsWith('.zip');
        if (isZip) {
          this.logger.log(
            `Detected model weights file is a ZIP archive. Extracting...`,
          );
          const unzippedDir = path.join(buildDir, 'unzipped_model');
          fs.mkdirSync(unzippedDir, { recursive: true });
          try {
            const { execSync } = require('child_process');
            execSync(`unzip -q model.pkl -d unzipped_model`, { cwd: buildDir });

            const contents = fs.readdirSync(unzippedDir);
            const subdirs = contents.filter((file) =>
              fs.statSync(path.join(unzippedDir, file)).isDirectory(),
            );
            if (contents.length === 1 && subdirs.length === 1) {
              modelPathEnv = `unzipped_model/${contents[0]}`;
            } else {
              modelPathEnv = 'unzipped_model';
            }
            fs.unlinkSync(modelLocalPath);
            this.logger.log(
              `Extraction complete. MODEL_PATH set to: ${modelPathEnv}`,
            );

            // Auto-fix tokenizer in model_index.json for Stable Diffusion if needed
            const resolvedModelDir = path.join(buildDir, modelPathEnv);
            const modelIndexJsonPath = path.join(
              resolvedModelDir,
              'model_index.json',
            );
            if (fs.existsSync(modelIndexJsonPath)) {
              try {
                const indexContent = fs.readFileSync(
                  modelIndexJsonPath,
                  'utf8',
                );
                const indexData = JSON.parse(indexContent);
                if (
                  indexData &&
                  indexData.tokenizer &&
                  indexData.tokenizer[1] === 'CLIPTokenizer'
                ) {
                  const tokenizerDir = path.join(resolvedModelDir, 'tokenizer');
                  const vocabExists = fs.existsSync(
                    path.join(tokenizerDir, 'vocab.json'),
                  );
                  const mergesExists = fs.existsSync(
                    path.join(tokenizerDir, 'merges.txt'),
                  );
                  if (!vocabExists || !mergesExists) {
                    this.logger.log(
                      `vocab.json or merges.txt is missing. Swapping CLIPTokenizer to CLIPTokenizerFast in model_index.json`,
                    );
                    indexData.tokenizer[1] = 'CLIPTokenizerFast';
                    fs.writeFileSync(
                      modelIndexJsonPath,
                      JSON.stringify(indexData, null, 2),
                      'utf8',
                    );
                  }
                }
              } catch (e: any) {
                this.logger.warn(
                  `Failed to inspect/auto-fix model_index.json: ${e.message || e}`,
                );
              }
            }
          } catch (err: any) {
            this.logger.error(
              `Failed to extract ZIP archive: ${err.message || err}`,
            );
            throw err;
          }
        }
      }

      // B3: Schema auto-detection (examplePayload/expectedResult) used to run
      // synchronously here via execSync, holding the BullMQ job lock for
      // 30-60s mid-build. Nothing later in the build depends on its result,
      // so it is now scheduled fire-and-forget (see scheduleSchemaAutoDetection
      // below, invoked after the version is marked READY) instead of awaited
      // inline. We snapshot the local model path now, before buildDir may be
      // cleaned up or the weights relocated to a persistent volume (C1).

      // Double-Safety Auto-Detection Phase
      let detectedFramework = version.model.framework;
      let detectedType = version.model.type;

      // 1. Analyze by original filename
      const originalFileName = version.modelFilePath
        ? path.basename(version.modelFilePath).toLowerCase()
        : '';
      if (
        originalFileName.endsWith('.pt') ||
        originalFileName.endsWith('.pth')
      ) {
        detectedFramework = Framework.PYTORCH;
      } else if (
        originalFileName.endsWith('.h5') ||
        originalFileName.endsWith('.keras') ||
        originalFileName.endsWith('.pb')
      ) {
        detectedFramework = Framework.TENSORFLOW;
      } else if (originalFileName.endsWith('.onnx')) {
        detectedFramework = Framework.ONNX;
      } else if (
        originalFileName.endsWith('.pkl') ||
        originalFileName.endsWith('.joblib')
      ) {
        detectedFramework = Framework.SKLEARN;
      } else if (originalFileName.endsWith('.gguf')) {
        detectedFramework = Framework.LLAMA_CPP;
        detectedType = ModelType.LLM_GGUF;
      }

      // Check filename keyword clues for task type
      if (detectedType !== ModelType.LLM_GGUF) {
        if (
          originalFileName.includes('diffusion') ||
          originalFileName.includes('stable-diffusion') ||
          originalFileName.includes('sdxl')
        ) {
          detectedType = ModelType.DIFFUSION;
        } else if (
          /mobilenet|resnet|vgg|efficientnet|vit|yolo|inception|convnext|densenet/i.test(
            originalFileName,
          )
        ) {
          detectedType = ModelType.VISION;
        } else if (
          /bert|gpt|llama|roberta|t5|distilbert|sentiment|text|nlp|translation/i.test(
            originalFileName,
          )
        ) {
          detectedType = ModelType.NLP;
        }
      }

      // 2. Check extracted ZIP directory structure if applicable
      const unzippedDir = path.join(buildDir, 'unzipped_model');
      if (
        fs.existsSync(unzippedDir) &&
        fs.statSync(unzippedDir).isDirectory()
      ) {
        const findFileRecursive = (
          dir: string,
          filename: string,
        ): string | null => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
              const res = findFileRecursive(fullPath, filename);
              if (res) return res;
            } else if (file.toLowerCase() === filename.toLowerCase()) {
              return fullPath;
            }
          }
          return null;
        };

        // Check for Stable Diffusion index
        const modelIndexJson = findFileRecursive(
          unzippedDir,
          'model_index.json',
        );
        if (modelIndexJson) {
          detectedType = ModelType.DIFFUSION;
          detectedFramework = Framework.PYTORCH;
        }

        // Check config.json for HF models
        const configJsonPath = findFileRecursive(unzippedDir, 'config.json');
        if (configJsonPath && detectedType !== ModelType.DIFFUSION) {
          try {
            const configData = JSON.parse(
              fs.readFileSync(configJsonPath, 'utf8'),
            );
            const archs = (configData.architectures || [])
              .map((a: string) => a.toLowerCase())
              .join(' ');
            const modelTypeField = (configData.model_type || '').toLowerCase();

            if (
              /vit|resnet|mobilenet|convnext|yolo|swin|deit|clip/i.test(
                archs + ' ' + modelTypeField,
              )
            ) {
              detectedType = ModelType.VISION;
              detectedFramework = Framework.PYTORCH;
            } else if (
              /bert|gpt|llama|t5|bart|roberta|distilbert|bloom|opt|mpt|falcon/i.test(
                archs + ' ' + modelTypeField,
              )
            ) {
              detectedType = ModelType.NLP;
              detectedFramework = Framework.PYTORCH;
            }
          } catch (configErr) {
            // ignore
          }
        }

        // Check for specific weight files
        if (
          findFileRecursive(unzippedDir, 'pytorch_model.bin') ||
          findFileRecursive(unzippedDir, 'model.safetensors')
        ) {
          detectedFramework = Framework.PYTORCH;
        } else if (
          findFileRecursive(unzippedDir, 'tf_model.h5') ||
          findFileRecursive(unzippedDir, 'saved_model.pb')
        ) {
          detectedFramework = Framework.TENSORFLOW;
        } else if (findFileRecursive(unzippedDir, 'model.onnx')) {
          detectedFramework = Framework.ONNX;
        }
      }

      // 3. Scan preprocess and postprocess imports/content for secondary clues
      const checkCodeHeuristics = (filePath: string) => {
        if (!fs.existsSync(filePath)) return;
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          // Framework clues
          if (/import\s+torch\b|from\s+torch\b/i.test(content)) {
            detectedFramework = Framework.PYTORCH;
          } else if (
            /import\s+tensorflow\b|from\s+tensorflow\b|import\s+keras\b|from\s+keras\b/i.test(
              content,
            )
          ) {
            detectedFramework = Framework.TENSORFLOW;
          } else if (/import\s+onnxruntime\b|import\s+onnx\b/i.test(content)) {
            detectedFramework = Framework.ONNX;
          } else if (/import\s+sklearn\b|from\s+sklearn\b/i.test(content)) {
            detectedFramework = Framework.SKLEARN;
          }

          // Type clues
          if (
            detectedType !== ModelType.DIFFUSION &&
            detectedType !== ModelType.LLM_GGUF
          ) {
            if (/diffusers\b/i.test(content)) {
              detectedType = ModelType.DIFFUSION;
            } else if (
              /cv2\b|PIL\b|Image\b|torchvision|skimage|matplotlib/i.test(
                content,
              )
            ) {
              detectedType = ModelType.VISION;
            } else if (
              /transformers\b|nltk\b|spacy\b|tokenizers\b|sentencepiece\b|gensim\b/i.test(
                content,
              )
            ) {
              detectedType = ModelType.NLP;
            }
          }
        } catch (codeErr) {
          // ignore
        }
      };

      checkCodeHeuristics(path.join(buildDir, 'preprocess.py'));
      checkCodeHeuristics(path.join(buildDir, 'postprocess.py'));

      // If mismatch detected, apply corrections
      if (
        detectedFramework !== version.model.framework ||
        detectedType !== version.model.type
      ) {
        let detectedTaskType = version.model.taskType;
        if (detectedType === ModelType.DIFFUSION) {
          detectedTaskType = TaskType.GENERATION;
        } else if (detectedType === ModelType.LLM_GGUF) {
          detectedTaskType = TaskType.CHAT;
        } else if (
          detectedType === ModelType.VISION &&
          (detectedTaskType as string) === 'OTHER'
        ) {
          detectedTaskType = TaskType.CLASSIFICATION;
        } else if (
          detectedType === ModelType.NLP &&
          (detectedTaskType as string) === 'OTHER'
        ) {
          detectedTaskType = TaskType.CLASSIFICATION;
        }

        const warnMsg =
          `Mismatch detected! Registered as framework: ${version.model.framework}, type: ${version.model.type}. ` +
          `Auto-corrected to framework: ${detectedFramework}, type: ${detectedType}. Updating model metadata.`;
        await logInfo(warnMsg);

        // Update database parent model metadata
        await this.dataSource.getRepository(Model).update(version.model.id, {
          framework: detectedFramework,
          type: detectedType,
          taskType: detectedTaskType,
        });

        // Mutate in-memory representation so current build steps use correct templates and images
        version.model.framework = detectedFramework;
        version.model.type = detectedType;
        version.model.taskType = detectedTaskType;
      }

      // C1: Volume-mount model weights instead of COPY-ing them into the
      // image. Extends the pattern already used for GGUF/LLM models (which
      // skip the Docker build entirely and mount weights from a persistent
      // named volume at deploy time) to the remaining model types
      // (pytorch/tensorflow/sklearn/diffusion). Relocating the weight
      // file(s) out of buildDir before the Dockerfile is generated/COPY'd
      // means the Docker build context — and therefore every layer commit —
      // no longer includes multi-GB weight files, and rebuilding the same
      // version's code/deps no longer re-copies unchanged weights.
      //
      // Weights are moved into a per-version subdirectory of a shared named
      // Docker volume (`ai-platform_model_weights`, mirroring
      // `ai-platform_llm_models`'s convention), which deploy.processor.ts
      // mounts read-only at /weights in the serving container. The serve_*.py
      // templates resolve MODEL_PATH/SCALER_PATH relative to their working
      // directory, so we point those env vars at the mounted /weights path.
      let weightsRelocated = false;
      let versionWeightsDir = '';
      if (version.model.type !== ModelType.LLM_GGUF) {
        const weightsStorageEnv = process.env.WEIGHTS_STORAGE_PATH;
        const weightsStorageRoot = weightsStorageEnv
          ? path.resolve(weightsStorageEnv)
          : path.join(process.cwd(), 'uploads', 'model-weights');
        versionWeightsDir = path.join(weightsStorageRoot, versionId);

        try {
          if (!fs.existsSync(versionWeightsDir)) {
            fs.mkdirSync(versionWeightsDir, { recursive: true });
          }

          // Move the primary weight artifact: either the extracted directory
          // (e.g. diffusion/HF-style models) or the single model file.
          // `buildDir` (under /tmp) and the persistent weights volume are
          // typically different filesystems/mounts, so a plain renameSync
          // throws EXDEV — fall back to copy+delete in that case (mirrors
          // the existing GGUF move pattern below).
          if (
            fs.existsSync(unzippedDir) &&
            fs.statSync(unzippedDir).isDirectory()
          ) {
            const destUnzipped = path.join(versionWeightsDir, 'unzipped_model');
            moveDirOrFile(unzippedDir, destUnzipped);
          } else if (fs.existsSync(modelLocalPath)) {
            moveDirOrFile(
              modelLocalPath,
              path.join(versionWeightsDir, 'model.pkl'),
            );
          }

          // Move the scaler alongside the weights, if present.
          const scalerLocalPath = path.join(buildDir, 'scaler.pkl');
          if (fs.existsSync(scalerLocalPath)) {
            moveDirOrFile(
              scalerLocalPath,
              path.join(versionWeightsDir, 'scaler.pkl'),
            );
          }

          weightsRelocated = true;
          this.logger.log(
            `Relocated model weights for version ${versionId} to persistent volume path: ${versionWeightsDir}`,
          );
        } catch (relocateErr: unknown) {
          const message =
            relocateErr instanceof Error
              ? relocateErr.message
              : String(relocateErr);
          this.logger.warn(
            `Failed to relocate weights to persistent volume for version ${versionId}, falling back to COPY-based image (old behavior): ${message}`,
          );
          weightsRelocated = false;
          // The mkdirSync above may have already created an empty
          // per-version directory before the failure. Remove it so
          // deploy.processor.ts's filesystem-presence check (used to decide
          // whether to bind-mount /weights) doesn't mistake it for a
          // successful relocation and mount an empty/irrelevant volume into
          // an image that actually has its weights baked in via COPY.
          try {
            if (
              fs.existsSync(versionWeightsDir) &&
              fs.readdirSync(versionWeightsDir).length === 0
            ) {
              fs.rmdirSync(versionWeightsDir);
            }
          } catch {
            // Best-effort cleanup; not worth failing the build over.
          }
        }
      }

      // Phase 3: Generate Dockerfile (30% → 50%)
      await this.updateProgress(versionId, 30);

      let dockerfileContent = '';

      if (version.model.type === ModelType.LLM_GGUF) {
        // Phase 3 & 4 bypass for LLM GGUF: We do not build a Docker image.
        // Instead, we store the downloaded GGUF file in a persistent path on the host
        // and mount it directly to the base llama.cpp container during deployment.
        await this.updateProgress(versionId, 50);

        const storageDirEnv = process.env.GGUF_STORAGE_PATH;
        const ggufStorageDir = storageDirEnv
          ? path.resolve(storageDirEnv)
          : path.join(process.cwd(), 'uploads', 'gguf-models');

        if (!fs.existsSync(ggufStorageDir)) {
          fs.mkdirSync(ggufStorageDir, { recursive: true });
        }

        const sourcePath = path.join(buildDir, 'model.pkl');
        const destPath = path.join(ggufStorageDir, `${versionId}.gguf`);

        if (fs.existsSync(sourcePath)) {
          try {
            fs.renameSync(sourcePath, destPath);
          } catch (renameErr: any) {
            if (renameErr.code === 'EXDEV') {
              fs.copyFileSync(sourcePath, destPath);
              fs.unlinkSync(sourcePath);
            } else {
              throw renameErr;
            }
          }
        } else {
          throw new Error(
            'GGUF model weights file not found in build directory after download.',
          );
        }

        await this.updateProgress(versionId, 90);

        await this.modelVersionsRepository.update(versionId, {
          status: VersionStatus.READY,
          errorMessage: null,
          buildProgress: 100,
        });

        // Cleanup local build directory
        try {
          if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true, force: true });
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to cleanup build directory: ${message}`);
        }

        this.logger.log(
          `Bypassed Docker image build for GGUF model version: ${versionId}. GGUF model saved to ${destPath}`,
        );

        // B3: schedule schema auto-detection fire-and-forget now that the
        // version is already READY; GGUF uses a canned payload so it does
        // not need the (already-relocated) local weights file.
        this.scheduleSchemaAutoDetection(
          versionId,
          version.model.type,
          !!(version.examplePayload && version.expectedResult),
          destPath,
        );
        return;
      } else {
        let templateName = 'serve_tabular.py';
        if (version.model.type === ModelType.NLP) {
          templateName = 'serve_nlp.py';
        } else if (version.model.type === ModelType.VISION) {
          templateName = 'serve_vision.py';
        } else if (version.model.type === ModelType.DIFFUSION) {
          templateName = 'serve_diffusion.py';
        }

        // Copy serve.py
        fs.copyFileSync(
          path.join(
            process.cwd(),
            'src',
            'shared',
            'queue',
            'templates',
            templateName,
          ),
          path.join(buildDir, 'serve.py'),
        );

        const hasScaler = !!version.scalerFilePath;
        const hasPreprocess = !!version.preprocessFilePath;
        const hasPostprocess = !!version.postprocessFilePath;

        // Detect if custom scripts require extra python packages not bundled in our base image
        const extraDependencies: string[] = [];
        const builtInAndBase = new Set([
          'os',
          'sys',
          'json',
          'math',
          'pickle',
          'importlib',
          'datetime',
          'time',
          're',
          'collections',
          'numpy',
          'pandas',
          'sklearn',
          'joblib',
          'fastapi',
          'uvicorn',
          'pydantic',
          'typing',
          'base64',
          'io',
          'PIL',
          'shutil',
          'hashlib',
          'uuid',
          'binascii',
          'argparse',
          'logging',
          'random',
          'torch',
          'torchvision',
          'diffusers',
          'transformers',
          'accelerate',
          // Python stdlib modules commonly used in preprocess/postprocess scripts
          'urllib',
          'dataclasses',
          '__future__',
          'abc',
          'enum',
          'functools',
          'itertools',
          'operator',
          'string',
          'struct',
          'textwrap',
          'copy',
          'pathlib',
          'tempfile',
          'glob',
          'csv',
          'configparser',
          'warnings',
          'traceback',
          'contextlib',
          'decimal',
          'fractions',
          'statistics',
          'array',
          'bisect',
          'heapq',
          'queue',
          'threading',
          'multiprocessing',
          'subprocess',
          'signal',
          'socket',
          'http',
          'email',
          'html',
          'xml',
          'codecs',
          'unicodedata',
          'locale',
          'pprint',
          'inspect',
          'dis',
          'ast',
          'token',
          'keyword',
          'tokenize',
          'unittest',
          'doctest',
          'types',
          'weakref',
          'gc',
          'platform',
          'ctypes',
          'gzip',
          'bz2',
          'lzma',
          'zipfile',
          'tarfile',
        ]);

        const scanImports = (filePath: string) => {
          if (!fs.existsSync(filePath)) return;
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
              const match = line.match(/^\s*(?:import|from)\s+([a-zA-Z0-9_]+)/);
              if (match) {
                const pkg = match[1];
                if (builtInAndBase.has(pkg)) continue;
                // Skip local modules — a .py file with the same name exists in the build dir
                if (fs.existsSync(path.join(buildDir, `${pkg}.py`))) continue;
                // Skip names that follow the local-module convention: <modelname>_preprocess / _postprocess
                if (/_preprocess$|_postprocess$/.test(pkg)) continue;
                extraDependencies.push(pkg);
              }
            }
          } catch (err: unknown) {
            this.logger.warn(
              `Failed to scan imports from ${filePath}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        };

        if (hasPreprocess) {
          scanImports(path.join(buildDir, 'preprocess.py'));
        }
        if (hasPostprocess) {
          scanImports(path.join(buildDir, 'postprocess.py'));
        }

        const uniqueExtras = Array.from(new Set(extraDependencies));
        let extraPipInstall = '';
        if (uniqueExtras.length > 0) {
          this.logger.log(
            `Detected extra script dependencies to install: ${uniqueExtras.join(', ')}`,
          );
          extraPipInstall = `\nRUN pip install --no-cache-dir ${uniqueExtras.join(' ')}`;
        }

        let baseImage = 'python:3.11-slim';
        let useBaseImage = false;

        if (version.model.type === ModelType.DIFFUSION) {
          try {
            await this.docker
              .getImage('ai-platform-diffusion-base:latest')
              .inspect();
            baseImage = 'ai-platform-diffusion-base:latest';
            useBaseImage = true;
          } catch (e) {
            this.logger.log(
              'Base image ai-platform-diffusion-base:latest not found. Falling back to python:3.9-slim.',
            );
          }
        } else if (version.model.framework === Framework.PYTORCH) {
          try {
            await this.docker
              .getImage('ai-platform-pytorch-base:latest')
              .inspect();
            baseImage = 'ai-platform-pytorch-base:latest';
            useBaseImage = true;
          } catch (e) {
            this.logger.log(
              'Base image ai-platform-pytorch-base:latest not found. Falling back to python:3.9-slim.',
            );
          }
        } else if (version.model.framework === Framework.TENSORFLOW) {
          try {
            await this.docker
              .getImage('ai-platform-tensorflow-base:latest')
              .inspect();
            baseImage = 'ai-platform-tensorflow-base:latest';
            useBaseImage = true;
          } catch (e) {
            this.logger.log(
              'Base image ai-platform-tensorflow-base:latest not found. Trying sklearn base with extra tensorflow install.',
            );
            // Fallback: use sklearn base + extra tensorflow install
            try {
              await this.docker
                .getImage('ai-platform-sklearn-base:latest')
                .inspect();
              baseImage = 'ai-platform-sklearn-base:latest';
              useBaseImage = true;
              extraPipInstall += '\nRUN pip install --no-cache-dir tensorflow';
            } catch (e2) {
              this.logger.log(
                'No base images found. Falling back to python:3.9-slim.',
              );
            }
          }
        } else if (
          version.model.framework === Framework.SKLEARN ||
          version.model.framework === Framework.CUSTOM ||
          version.model.type === ModelType.NLP ||
          version.model.type === ModelType.TABULAR
        ) {
          try {
            await this.docker
              .getImage('ai-platform-sklearn-base:latest')
              .inspect();
            baseImage = 'ai-platform-sklearn-base:latest';
            useBaseImage = true;
          } catch (e) {
            this.logger.log(
              'Base image ai-platform-sklearn-base:latest not found. Falling back to python:3.9-slim.',
            );
          }
        }

        const originalModelName =
          path.basename(version.modelFilePath || '') || version.model.name;

        // C1: When weights were successfully relocated to the persistent
        // volume, MODEL_PATH/SCALER_PATH point at the read-only /weights
        // mount that deploy.processor.ts binds in at container start,
        // instead of a path relative to the image's WORKDIR. The mounted
        // volume is shared across every version (deploy.processor.ts binds
        // the whole `ai-platform_model_weights` volume, not a per-version
        // subpath), so the path must include this version's subdirectory —
        // `/weights/<versionId>/...` — matching where build.processor.ts
        // actually relocated the files above (`versionWeightsDir`). If
        // relocation failed for any reason, fall back to the old
        // COPY-everything behavior with the original relative paths so the
        // build still succeeds correctly.
        const weightsMountRoot = path.posix.join('/weights', versionId);
        const effectiveModelPath = weightsRelocated
          ? path.posix.join(weightsMountRoot, modelPathEnv)
          : modelPathEnv;
        const effectiveScalerPath = weightsRelocated
          ? hasScaler
            ? path.posix.join(weightsMountRoot, 'scaler.pkl')
            : ''
          : hasScaler
            ? 'scaler.pkl'
            : '';

        // B5: only COPY code/dependency files into the image — model weights
        // are no longer part of the build context when relocated (C1), so a
        // blanket `COPY . .` would either fail (files moved away) or, if it
        // didn't, would defeat the whole point of C1. List code files
        // explicitly instead.
        const codeCopyLines = ['COPY serve.py .'];
        if (hasPreprocess) codeCopyLines.push('COPY preprocess.py .');
        if (hasPostprocess) codeCopyLines.push('COPY postprocess.py .');
        const codeCopyBlock = codeCopyLines.join('\n');

        if (useBaseImage) {
          dockerfileContent = weightsRelocated
            ? `FROM ${baseImage}
WORKDIR /app
${codeCopyBlock}${extraPipInstall}
ENV MODEL_PATH=${effectiveModelPath}
ENV MODEL_NAME=${originalModelName}
ENV SCALER_PATH=${effectiveScalerPath}
ENV PREPROCESS_PATH=${hasPreprocess ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${hasPostprocess ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
EXPOSE 8000
CMD ["python", "serve.py"]
`
            : `FROM ${baseImage}
WORKDIR /app
COPY . .${extraPipInstall}
ENV MODEL_PATH=${effectiveModelPath}
ENV MODEL_NAME=${originalModelName}
ENV SCALER_PATH=${effectiveScalerPath}
ENV PREPROCESS_PATH=${hasPreprocess ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${hasPostprocess ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
EXPOSE 8000
CMD ["python", "serve.py"]
`;
        } else {
          // B5: cache-mount pip install and put dependency installation
          // before the code COPY so an unchanged requirements.txt hits the
          // Docker layer cache even when serve.py/preprocess.py change.
          dockerfileContent = weightsRelocated
            ? `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
${codeCopyBlock}
ENV MODEL_PATH=${effectiveModelPath}
ENV MODEL_NAME=${originalModelName}
ENV SCALER_PATH=${effectiveScalerPath}
ENV PREPROCESS_PATH=${hasPreprocess ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${hasPostprocess ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
EXPOSE 8000
CMD ["python", "serve.py"]
`
            : `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
COPY . .
ENV MODEL_PATH=${effectiveModelPath}
ENV MODEL_NAME=${originalModelName}
ENV SCALER_PATH=${effectiveScalerPath}
ENV PREPROCESS_PATH=${hasPreprocess ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${hasPostprocess ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
EXPOSE 8000
CMD ["python", "serve.py"]
`;
        }

        let requirementsContent = `fastapi
uvicorn
pandas
numpy
`;

        if (version.model.type === ModelType.DIFFUSION) {
          requirementsContent =
            `--extra-index-url https://download.pytorch.org/whl/cpu\n` +
            requirementsContent;
          requirementsContent += '\ndiffusers\ntransformers\naccelerate\ntorch';
        } else if (version.model.framework === Framework.PYTORCH) {
          requirementsContent =
            `--extra-index-url https://download.pytorch.org/whl/cpu\n` +
            requirementsContent;
          requirementsContent += '\ntorch\ntorchvision';
        } else if (version.model.framework === Framework.SKLEARN) {
          requirementsContent += '\nscikit-learn\njoblib';
        } else if (version.model.framework === Framework.TENSORFLOW) {
          requirementsContent += '\ntensorflow\nscikit-learn\njoblib';
        } else if (version.model.framework === Framework.ONNX) {
          requirementsContent += '\nonnxruntime';
        } else {
          // Default to scikit-learn for backward compatibility or custom
          requirementsContent += '\nscikit-learn\njoblib';
        }

        fs.writeFileSync(
          path.join(buildDir, 'requirements.txt'),
          requirementsContent,
        );
      }

      fs.writeFileSync(path.join(buildDir, 'Dockerfile'), dockerfileContent);

      // B5: exclude zip artifacts / temp extraction leftovers from the build
      // context so they're never accidentally sent to the Docker daemon.
      // IMPORTANT: only exclude weight artifacts (unzipped_model/, model.pkl,
      // scaler.pkl) when C1's relocation actually succeeded — the Dockerfile
      // generated above still `COPY . .`s them in the non-relocated fallback
      // branch, and excluding them here would silently ship an image with
      // no model weights at all while the build reports success.
      const dockerignoreLines = ['*.zip', '*.gguf', '.dockerignore'];
      if (weightsRelocated) {
        dockerignoreLines.push('unzipped_model/', 'model.pkl', 'scaler.pkl');
      }
      fs.writeFileSync(
        path.join(buildDir, '.dockerignore'),
        dockerignoreLines.join('\n'),
      );

      // Phase 4: Docker build (50% → 90%)
      await this.updateProgress(versionId, 50, logsBuffer.join('\n'));

      const pack = await this.docker.buildImage(
        {
          context: buildDir,
          src: fs.readdirSync(buildDir),
        },
        { t: `model-version-${versionId}` },
      );

      await new Promise<void>((resolve, reject) => {
        let stepCount = 0;
        this.docker.modem.followProgress(
          pack,
          (err: Error | null, res: unknown[] | undefined) => {
            if (err) {
              return reject(err);
            }
            if (res && Array.isArray(res)) {
              const errorObj = res.find(
                (r) =>
                  r &&
                  typeof r === 'object' &&
                  'errorDetail' in r &&
                  r.errorDetail,
              ) as { error: string } | undefined;
              if (errorObj) {
                return reject(new Error(errorObj.error));
              }
            }
            resolve();
          },
          (event: { stream?: string; status?: string; progress?: string }) => {
            if (event?.stream) {
              const cleanStream = event.stream.trim();
              if (cleanStream) {
                this.logger.log(
                  `[ModelBuild] [Version ${versionId}] ${cleanStream}`,
                );
              }
              logsBuffer.push(cleanStream);
              if (event.stream.startsWith('Step ')) {
                stepCount++;
                // Estimate progress: each step advances from 50% toward 90%
                const buildProgress = Math.min(90, 50 + stepCount * 5);
                this.updateProgress(
                  versionId,
                  buildProgress,
                  logsBuffer.join('\n'),
                ).catch(() => {});
              } else if (logsBuffer.length % 15 === 0) {
                this.modelVersionsRepository
                  .update(versionId, {
                    buildLogs: logsBuffer.join('\n'),
                  })
                  .catch(() => {});
              }
            } else if (event?.status) {
              const statusLine =
                `${event.status} ${event.progress || ''}`.trim();
              if (statusLine) {
                this.logger.log(
                  `[ModelBuild] [Version ${versionId}] ${statusLine}`,
                );
              }
              logsBuffer.push(statusLine);
            }
          },
        );
      });

      await logInfo(
        `Successfully built docker image for version: ${versionId}`,
      );

      // Phase 5: Cleanup (90% → 95%)
      await this.updateProgress(versionId, 90, logsBuffer.join('\n'));

      // B6: Dangling/intermediate image pruning no longer runs synchronously
      // here — it used to block up to 30s of every single build's critical
      // path. It now runs on the hourly "prune-docker-images" repeatable job
      // registered in onModuleInit(), decoupled from any single build.

      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.READY,
        errorMessage: null,
        buildProgress: 100,
        buildLogs: logsBuffer.join('\n'),
      });

      // B3: schedule schema auto-detection fire-and-forget now that the
      // version is already READY and the build job's lock can be released.
      // Point it at the relocated weights path (C1) when available, since
      // buildDir/modelLocalPath are about to be deleted below.
      const schemaDetectionModelPath = weightsRelocated
        ? path.join(versionWeightsDir, 'model.pkl')
        : modelLocalPath;
      this.scheduleSchemaAutoDetection(
        versionId,
        version.model.type,
        !!(version.examplePayload && version.expectedResult),
        schemaDetectionModelPath,
      );

      // Cleanup local build files
      try {
        if (fs.existsSync(buildDir)) {
          fs.rmSync(buildDir, { recursive: true, force: true });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        await logInfo(`Failed to cleanup build directory: ${message}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await logError(
        `Failed to build model version ${versionId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.FAILED,
        errorMessage: message || 'Unknown error during containerization',
        buildLogs: logsBuffer.join('\n'),
      });
      throw error;
    }
  }
}
