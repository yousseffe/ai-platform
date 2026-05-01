import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelVersion, VersionStatus } from '../models/model-version.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as Docker from 'dockerode';
import { Logger } from '@nestjs/common';

@Processor('build-queue')
export class BuildProcessor extends WorkerHost {
  private docker: Docker;
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    @InjectRepository(ModelVersion)
    private modelVersionsRepository: Repository<ModelVersion>,
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

      // Copy serve.py
      fs.copyFileSync(
        path.join(process.cwd(), 'src', 'queue', 'serve.py'),
        path.join(buildDir, 'serve.py'),
      );

      // Copy model files
      if (version.modelFilePath)
        fs.copyFileSync(
          version.modelFilePath,
          path.join(buildDir, 'model.pkl'),
        );
      if (version.scalerFilePath)
        fs.copyFileSync(
          version.scalerFilePath,
          path.join(buildDir, 'scaler.pkl'),
        );
      if (version.preprocessFilePath)
        fs.copyFileSync(
          version.preprocessFilePath,
          path.join(buildDir, 'preprocess.py'),
        );
      if (version.postprocessFilePath)
        fs.copyFileSync(
          version.postprocessFilePath,
          path.join(buildDir, 'postprocess.py'),
        );

      // Create Dockerfile
      const dockerfileContent = `
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV MODEL_PATH=model.pkl
ENV SCALER_PATH=${version.scalerFilePath ? 'scaler.pkl' : ''}
ENV PREPROCESS_PATH=${version.preprocessFilePath ? 'preprocess.py' : ''}
ENV POSTPROCESS_PATH=${version.postprocessFilePath ? 'postprocess.py' : ''}
EXPOSE 8000
CMD ["python", "serve.py"]
      `;
      fs.writeFileSync(path.join(buildDir, 'Dockerfile'), dockerfileContent);

      // Create requirements.txt
      const requirementsContent = `
fastapi
uvicorn
scikit-learn
pandas
numpy
      `;
      fs.writeFileSync(
        path.join(buildDir, 'requirements.txt'),
        requirementsContent,
      );

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
        this.docker.modem.followProgress(pack, (err, res) =>
          err ? reject(err) : resolve(res),
        );
      });

      this.logger.log(`Successfully built docker image for version: ${versionId}`);
      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.READY,
        errorMessage: undefined,
      });
    } catch (e) {
      const error = e as Error;
      this.logger.error(`Failed to build model version ${versionId}: ${error.message}`, error.stack);
      await this.modelVersionsRepository.update(versionId, {
        status: VersionStatus.FAILED,
        errorMessage: error.message || 'Unknown error during containerization',
      });
      throw error;
    }
  }
}
