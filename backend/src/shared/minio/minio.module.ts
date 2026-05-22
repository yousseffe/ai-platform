import { Module, Global } from '@nestjs/common';
import { MinioService } from './minio.service';

/**
 * Global infrastructure module providing MinIO client access for S3 object operations.
 */
@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
