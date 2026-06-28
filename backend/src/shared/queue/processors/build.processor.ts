import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelVersion } from '../../../modules/models/entities/model-version.entity';
import { Deployment } from '../../../modules/deployments/entities/deployment.entity';
import { VersionStatus } from '../../../modules/models/enums/version-status.enum';
import { DeploymentStatus } from '../../../modules/deployments/enums/deployment-status.enum';
import { ModelType } from '../../../modules/models/enums/model-type.enum';
import { Framework } from '../../../modules/models/enums/framework.enum';
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
 * BullMQ processor responsible for packaging uploaded model weights and scripts
 * into standalone, self-serving Docker container images.
 */
@Processor('build-queue')
export class BuildProcessor extends WorkerHost {
  private readonly docker: Docker;
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    @InjectRepository(ModelVersion)
    private readonly modelVersionsRepository: Repository<ModelVersion>,
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
    private readonly minioService: MinioService,
  ) {
    super();
    this.docker = new Docker(getDockerOptions());
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
  ): Promise<void> {
    await this.modelVersionsRepository.update(versionId, {
      buildProgress: progress,
    });
  }

  async process(job: Job<BuildJobPayload, void, string>): Promise<void> {
    const { versionId } = job.data;
    this.logger.log(`Starting build process for version: ${versionId}`);

    await this.modelVersionsRepository.update(versionId, {
      status: VersionStatus.BUILDING,
      buildProgress: 0,
    });
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model'],
    });

    if (!version) {
      this.logger.error(`Model version ${versionId} not found in database.`);
      return;
    }

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

      const buildDir = path.join(
        process.cwd(),
        'uploads',
        `build-${versionId}`,
      );
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
            execSync(`tar -xf model.pkl -C unzipped_model`, { cwd: buildDir });

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

      // Phase 3: Generate Dockerfile (30% → 50%)
      await this.updateProgress(versionId, 30);

      // Write output schema file if the version has an expectedResult defined
      if (version.expectedResult) {
        fs.writeFileSync(
          path.join(buildDir, 'output_schema.json'),
          version.expectedResult,
        );
      }

      let dockerfileContent = '';

      if (version.model.type === ModelType.LLM_GGUF) {
        dockerfileContent = `FROM ghcr.io/ggml-org/llama.cpp:server
WORKDIR /app
COPY model.pkl /models/model.gguf
ENV LC_ALL=C.utf8
EXPOSE 8080
ENTRYPOINT ["/app/llama-server", "-m", "/models/model.gguf", "--port", "8080", "--host", "0.0.0.0"]
`;
        fs.writeFileSync(path.join(buildDir, 'requirements.txt'), '');
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

        // Copy shared schema enforcement utilities
        fs.copyFileSync(
          path.join(
            process.cwd(),
            'src',
            'shared',
            'queue',
            'templates',
            'schema_utils.py',
          ),
          path.join(buildDir, 'schema_utils.py'),
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
                if (!builtInAndBase.has(pkg)) {
                  extraDependencies.push(pkg);
                }
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

        if (useBaseImage) {
          dockerfileContent = `FROM ${baseImage}
WORKDIR /app
COPY . .${extraPipInstall}
ENV MODEL_PATH=${modelPathEnv}
ENV MODEL_NAME=${originalModelName}
ENV SCALER_PATH=${hasScaler ? 'scaler.pkl' : ''}
ENV PREPROCESS_PATH=${hasPreprocess ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${hasPostprocess ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
ENV OUTPUT_SCHEMA_PATH=${version.expectedResult ? 'output_schema.json' : ''}
EXPOSE 8000
CMD ["python", "serve.py"]
`;
        } else {
          dockerfileContent = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV MODEL_PATH=${modelPathEnv}
ENV MODEL_NAME=${originalModelName}
ENV SCALER_PATH=${hasScaler ? 'scaler.pkl' : ''}
ENV PREPROCESS_PATH=${hasPreprocess ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${hasPostprocess ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
ENV OUTPUT_SCHEMA_PATH=${version.expectedResult ? 'output_schema.json' : ''}
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

      // Phase 4: Docker build (50% → 90%)
      await this.updateProgress(versionId, 50);

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
          (event: { stream?: string }) => {
            // Track Docker build steps to update progress (50% → 90%)
            if (event?.stream?.startsWith('Step ')) {
              stepCount++;
              // Estimate progress: each step advances from 50% toward 90%
              const buildProgress = Math.min(90, 50 + stepCount * 5);
              this.updateProgress(versionId, buildProgress).catch(() => {});
            }
          },
        );
      });

      this.logger.log(
        `Successfully built docker image for version: ${versionId}`,
      );

      // Phase 5: Cleanup (90% → 95%)
      await this.updateProgress(versionId, 90);

      // Prune dangling/intermediate build images synchronously
      try {
        const { execSync } = require('child_process');
        execSync('docker image prune -f', { timeout: 30000 });
        this.logger.log(
          'Successfully pruned dangling/intermediate docker images',
        );
      } catch (pruneError: unknown) {
        const pruneMsg =
          pruneError instanceof Error ? pruneError.message : String(pruneError);
        this.logger.warn(`Failed to prune dangling images: ${pruneMsg}`);
      }

      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.READY,
        errorMessage: null,
        buildProgress: 100,
      });

      // Cleanup local build files
      try {
        if (fs.existsSync(buildDir)) {
          fs.rmSync(buildDir, { recursive: true, force: true });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to cleanup build directory: ${message}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to build model version ${versionId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.FAILED,
        errorMessage: message || 'Unknown error during containerization',
      });
      throw error;
    }
  }
}
