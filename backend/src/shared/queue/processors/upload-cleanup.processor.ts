import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MinioService } from '../../minio/minio.service';

@Processor('upload-cleanup-queue', {
  concurrency: 1,
})
export class UploadCleanupProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(UploadCleanupProcessor.name);

  constructor(
    private readonly minioService: MinioService,
    @InjectQueue('upload-cleanup-queue')
    private readonly uploadCleanupQueue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    try {
      const repeatableJobs = await this.uploadCleanupQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name === 'sweep-orphaned-uploads') {
          await this.uploadCleanupQueue.removeRepeatableByKey(job.key);
        }
      }
      await this.uploadCleanupQueue.add(
        'sweep-orphaned-uploads',
        {},
        { repeat: { pattern: '0 3 * * *' } },
      );
      this.logger.log(
        'Registered daily orphaned multipart upload cleanup job.',
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to register upload cleanup repeatable job: ${message}`,
      );
    }
  }

  async process(job: Job): Promise<{ aborted: number; inspected: number }> {
    const thresholdHours = parseInt(
      process.env.UPLOAD_ORPHAN_CLEANUP_HOURS || '24',
      10,
    );
    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    const now = Date.now();

    const incompleteUploads =
      await this.minioService.listIncompleteUploadsWithAge();
    let abortedCount = 0;

    for (const upload of incompleteUploads) {
      const ageMs = now - upload.initiatedAt.getTime();
      if (ageMs < thresholdMs) {
        continue;
      }
      try {
        await this.minioService.abortMultipartUpload(
          upload.objectName,
          upload.uploadId,
        );
        abortedCount += 1;
        this.logger.log(
          `Aborted orphaned upload ${upload.objectName} (age ${Math.round(ageMs / 3600000)}h).`,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to abort orphaned upload ${upload.objectName}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Upload cleanup sweep complete: inspected ${incompleteUploads.length}, aborted ${abortedCount}.`,
    );
    return { aborted: abortedCount, inspected: incompleteUploads.length };
  }
}
