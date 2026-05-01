import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketName = process.env.MINIO_BUCKET || 'models';

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully.`);
      }
    } catch (err) {
      this.logger.error('Error initializing MinIO bucket', err);
    }
  }

  async uploadFile(
    objectName: string,
    filePath: string,
    mimeType: string = 'application/octet-stream',
  ): Promise<string> {
    await this.minioClient.fPutObject(this.bucketName, objectName, filePath, {
      'Content-Type': mimeType,
    });
    return objectName;
  }

  async downloadFile(objectName: string, destPath: string): Promise<void> {
    await this.minioClient.fGetObject(this.bucketName, objectName, destPath);
  }

  async getFileUrl(objectName: string): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      24 * 60 * 60,
    );
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (err) {
      this.logger.error(`Error deleting file ${objectName} from MinIO`, err);
    }
  }
}
