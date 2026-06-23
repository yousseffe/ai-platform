import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelVersion } from '../../../modules/models/entities/model-version.entity';
import { VersionStatus } from '../../../modules/models/enums/version-status.enum';
import { ModelType } from '../../../modules/models/enums/model-type.enum';
import { Framework } from '../../../modules/models/enums/framework.enum';
import * as fs from 'fs';
import * as path from 'path';
import * as Docker from 'dockerode';
import { Logger } from '@nestjs/common';
import { BuildJobPayload } from '../interfaces/queue.interface';
import { MinioService } from '../../minio/minio.service';
import { getDockerOptions } from '../../docker/docker.util';

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
  async process(job: Job<BuildJobPayload, void, string>): Promise<void> {
    const { versionId } = job.data;
    this.logger.log(`Starting build process for version: ${versionId}`);

    await this.modelVersionsRepository.update(versionId, {
      status: VersionStatus.BUILDING,
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
      const buildDir = path.join(
        process.cwd(),
        'uploads',
        `build-${versionId}`,
      );
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      // Download model files from MinIO
      if (version.modelFilePath) {
        await this.minioService.downloadFile(
          version.modelFilePath,
          path.join(buildDir, 'model.pkl'),
        );
      }
      if (version.scalerFilePath) {
        await this.minioService.downloadFile(
          version.scalerFilePath,
          path.join(buildDir, 'scaler.pkl'),
        );
      }
      if (version.preprocessFilePath) {
        await this.minioService.downloadFile(
          version.preprocessFilePath,
          path.join(buildDir, 'preprocess.py'),
        );
      }
      if (version.postprocessFilePath) {
        await this.minioService.downloadFile(
          version.postprocessFilePath,
          path.join(buildDir, 'postprocess.py'),
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

        dockerfileContent = `FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV MODEL_PATH=model.pkl
ENV SCALER_PATH=${hasScaler ? 'scaler.pkl' : ''}
ENV PREPROCESS_PATH=${hasPreprocess ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${hasPostprocess ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
EXPOSE 8000
CMD ["python", "serve.py"]
`;

        let requirementsContent = `fastapi
uvicorn
pandas
numpy
`;

        if (version.model.framework === Framework.SKLEARN) {
          requirementsContent += '\nscikit-learn\njoblib';
        } else if (version.model.framework === Framework.PYTORCH) {
          requirementsContent += '\ntorch\ntorchvision';
        } else if (version.model.framework === Framework.TENSORFLOW) {
          requirementsContent += '\ntensorflow';
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

      const pack = await this.docker.buildImage(
        {
          context: buildDir,
          src: fs.readdirSync(buildDir),
        },
        { t: `model-version-${versionId}` },
      );

      await new Promise<void>((resolve, reject) => {
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
        );
      });

      this.logger.log(
        `Successfully built docker image for version: ${versionId}`,
      );
      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.READY,
        errorMessage: null,
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
