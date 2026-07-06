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
import * as os from 'os';
import * as path from 'path';
import * as Docker from 'dockerode';
import { Logger } from '@nestjs/common';
import { BuildJobPayload } from '../interfaces/queue.interface';
import { MinioService } from '../../minio/minio.service';
import { getDockerOptions } from '../../docker/docker.util';
import {
  isZipFile,
  moveDirOrFile,
  detectModelMetadata,
} from '../utils/build-processor.utils';

@Processor('build-queue', {
  concurrency: parseInt(process.env.BUILD_QUEUE_CONCURRENCY || '2', 10),
  lockDuration: 600000,
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

  async onModuleInit(): Promise<void> {
    this.logger.log('Scheduling repeatable prune-docker-images job...');
    try {
      await this.buildQueue.add(
        'prune-docker-images',
        {},
        {
          repeat: { pattern: '0 * * * *' },
          jobId: 'prune-docker-images',
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to register prune-docker-images: ${message}`);
    }
  }

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

  private async updateProgress(
    versionId: string,
    progress: number,
    logs?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { buildProgress: progress };
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
      } catch (inspectErr: unknown) {}
    }

    await this.modelVersionsRepository.update(versionId, {
      status: VersionStatus.BUILDING,
      buildProgress: 0,
      buildLogs: logsBuffer.join('\n'),
    });

    try {
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

      const buildDir = path.join(os.tmpdir(), `build-${versionId}`);
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

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
              } catch (e: unknown) {
                this.logger.warn(
                  `Failed to inspect/auto-fix model_index.json: ${(e as Error).message || e}`,
                );
              }
            }
          } catch (err: unknown) {
            this.logger.error(
              `Failed to extract ZIP archive: ${(err as Error).message || err}`,
            );
            throw err;
          }
        }
      }

      const { detectedFramework, detectedType, detectedTaskType } =
        detectModelMetadata({
          originalFileName: version.modelFilePath
            ? path.basename(version.modelFilePath)
            : '',
          buildDir,
          currentFramework: version.model.framework,
          currentType: version.model.type,
          currentTaskType: version.model.taskType,
        });

      if (
        detectedFramework !== version.model.framework ||
        detectedType !== version.model.type
      ) {
        const warnMsg =
          `Mismatch detected! Registered as framework: ${version.model.framework}, type: ${version.model.type}. ` +
          `Auto-corrected to framework: ${detectedFramework}, type: ${detectedType}. Updating model metadata.`;
        await logInfo(warnMsg);

        await this.dataSource.getRepository(Model).update(version.model.id, {
          framework: detectedFramework,
          type: detectedType,
          taskType: detectedTaskType,
        });

        version.model.framework = detectedFramework;
        version.model.type = detectedType;
        version.model.taskType = detectedTaskType;
      }

      let weightsRelocated = false;
      let versionWeightsDir = '';
      const unzippedDir = path.join(buildDir, 'unzipped_model');
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

          try {
            if (
              fs.existsSync(versionWeightsDir) &&
              fs.readdirSync(versionWeightsDir).length === 0
            ) {
              fs.rmdirSync(versionWeightsDir);
            }
          } catch {}
        }
      }

      await this.updateProgress(versionId, 30);

      let dockerfileContent = '';

      if (version.model.type === ModelType.LLM_GGUF) {
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
          } catch (renameErr: unknown) {
            if ((renameErr as NodeJS.ErrnoException).code === 'EXDEV') {
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

                if (fs.existsSync(path.join(buildDir, `${pkg}.py`))) continue;

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
          } catch (e: unknown) {
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
          } catch (e: unknown) {
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
          } catch (e: unknown) {
            this.logger.log(
              'Base image ai-platform-tensorflow-base:latest not found. Trying sklearn base with extra tensorflow install.',
            );

            try {
              await this.docker
                .getImage('ai-platform-sklearn-base:latest')
                .inspect();
              baseImage = 'ai-platform-sklearn-base:latest';
              useBaseImage = true;
              extraPipInstall += '\nRUN pip install --no-cache-dir tensorflow';
            } catch (e2: unknown) {
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
          } catch (e: unknown) {
            this.logger.log(
              'Base image ai-platform-sklearn-base:latest not found. Falling back to python:3.9-slim.',
            );
          }
        }

        const originalModelName =
          path.basename(version.modelFilePath || '') || version.model.name;

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
          requirementsContent += '\nscikit-learn\njoblib';
        }

        fs.writeFileSync(
          path.join(buildDir, 'requirements.txt'),
          requirementsContent,
        );
      }

      fs.writeFileSync(path.join(buildDir, 'Dockerfile'), dockerfileContent);

      const dockerignoreLines = ['*.zip', '*.gguf', '.dockerignore'];
      if (weightsRelocated) {
        dockerignoreLines.push('unzipped_model/', 'model.pkl', 'scaler.pkl');
      }
      fs.writeFileSync(
        path.join(buildDir, '.dockerignore'),
        dockerignoreLines.join('\n'),
      );

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

      await this.updateProgress(versionId, 90, logsBuffer.join('\n'));

      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.READY,
        errorMessage: null,
        buildProgress: 100,
        buildLogs: logsBuffer.join('\n'),
      });

      const schemaDetectionModelPath = weightsRelocated
        ? path.join(versionWeightsDir, 'model.pkl')
        : modelLocalPath;
      this.scheduleSchemaAutoDetection(
        versionId,
        version.model.type,
        !!(version.examplePayload && version.expectedResult),
        schemaDetectionModelPath,
      );

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
