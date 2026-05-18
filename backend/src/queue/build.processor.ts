import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelVersion, VersionStatus } from '../models/model-version.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as Docker from 'dockerode';
import { Logger } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';

@Processor('build-queue')
export class BuildProcessor extends WorkerHost {
  private docker: Docker;
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    @InjectRepository(ModelVersion)
    private modelVersionsRepository: Repository<ModelVersion>,
    private minioService: MinioService,
  ) {
    super();
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { versionId } = job.data;
    this.logger.log(`Starting build process for version: ${versionId}`);

    await this.modelVersionsRepository.update(versionId, {
      status: VersionStatus.BUILDING,
    });
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model'],
    });

    if (!version) return;

    try {
      const buildDir = path.join(
        process.cwd(),
        'uploads',
        `build-${versionId}`,
      );
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      // Download model files from Minio
      if (version.modelFilePath)
        await this.minioService.downloadFile(
          version.modelFilePath,
          path.join(buildDir, 'model.pkl'),
        );
      if (version.scalerFilePath)
        await this.minioService.downloadFile(
          version.scalerFilePath,
          path.join(buildDir, 'scaler.pkl'),
        );
      if (version.preprocessFilePath)
        await this.minioService.downloadFile(
          version.preprocessFilePath,
          path.join(buildDir, 'preprocess.py'),
        );
      if (version.postprocessFilePath)
        await this.minioService.downloadFile(
          version.postprocessFilePath,
          path.join(buildDir, 'postprocess.py'),
        );

      let dockerfileContent = '';

      if (version.model.type === 'LLM_GGUF') {
        dockerfileContent = `
FROM ghcr.io/ggml-org/llama.cpp:server
WORKDIR /app
COPY model.pkl /models/model.gguf
ENV LC_ALL=C.utf8
EXPOSE 8080
ENTRYPOINT ["/app/llama-server", "-m", "/models/model.gguf", "--port", "8080", "--host", "0.0.0.0"]
        `;
        fs.writeFileSync(path.join(buildDir, 'requirements.txt'), '');
      } else {
        let templateName = 'serve_tabular.py';
        if (version.model.type === 'NLP') templateName = 'serve_nlp.py';
        if (version.model.type === 'VISION') templateName = 'serve_vision.py';

        // Copy serve.py
        fs.copyFileSync(
          path.join(process.cwd(), 'src', 'queue', 'templates', templateName),
          path.join(buildDir, 'serve.py'),
        );

        let dockerfileContent = `
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV MODEL_PATH=model.pkl
ENV SCALER_PATH=${version.scalerFilePath ? 'scaler.pkl' : ''}
ENV PREPROCESS_PATH=${version.preprocessFilePath ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${version.postprocessFilePath ? 'postprocess.py' : ''}
ENV FRAMEWORK=${version.model.framework}
ENV TASK_TYPE=${version.model.taskType}
EXPOSE 8000
CMD ["python", "serve.py"]
        `;

        let requirementsContent = `
fastapi
uvicorn
pandas
numpy
        `;
        
        if (version.model.framework === 'SKLEARN') {
            requirementsContent += '\nscikit-learn\njoblib';
        } else if (version.model.framework === 'PYTORCH') {
            requirementsContent += '\ntorch\ntorchvision';
        } else if (version.model.framework === 'TENSORFLOW') {
            requirementsContent += '\ntensorflow';
        } else if (version.model.framework === 'ONNX') {
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

      // We will skip actual docker build here to avoid blocking and complex docker build logic in JS
      // Instead, the Deploy job will just volume mount the folder!
      // Wait, the prompt says "Run Docker container".
      // It's easier if we just build the image. But docker build from dockerode is a stream.
      // Let's do it using dockerode.
      const pack = await this.docker.buildImage(
        {
          context: buildDir,
          src: fs.readdirSync(buildDir),
        },
        { t: `model-version-${versionId}` },
      );

      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(pack, (err, res) => {
          if (err) return reject(err);
          const errorObj = Array.isArray(res) ? res.find((r: any) => r.errorDetail) : null;
          if (errorObj) return reject(new Error(errorObj.error));
          resolve(res);
        });
      });

      this.logger.log(
        `Successfully built docker image for version: ${versionId}`,
      );
      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.READY,
        errorMessage: undefined,
      });
    } catch (e) {
      const error = e as Error;
      this.logger.error(
        `Failed to build model version ${versionId}: ${error.message}`,
        error.stack,
      );
      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.FAILED,
        errorMessage: error.message || 'Unknown error during containerization',
      });
      throw error;
    }
  }
}
