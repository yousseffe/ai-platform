import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

/**
 * Service providing integration with MinIO S3 object storage for uploading,
 * downloading, and deleting model artifacts and scalers.
 */
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

  /**
   * Automatically initializes the default storage bucket upon module load.
   */
  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully.`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error initializing MinIO bucket: ${message}`);
    }
  }

  /**
   * Uploads a local file to the MinIO bucket.
   *
   * @param objectName - Key identifying the object inside the bucket.
   * @param filePath - Local disk path to the source file.
   * @param mimeType - HTTP Content-Type corresponding to the file.
   * @returns A promise resolving to the object name key of the uploaded file.
   */
  async uploadFile(
    objectName: string,
    filePath: string,
    mimeType = 'application/octet-stream',
  ): Promise<string> {
    await this.minioClient.fPutObject(this.bucketName, objectName, filePath, {
      'Content-Type': mimeType,
    });
    return objectName;
  }

  /**
   * Downloads an object from MinIO to the local file system.
   *
   * @param objectName - Key identifying the object inside the bucket.
   * @param destPath - Destination path on the local disk.
   */
  async downloadFile(objectName: string, destPath: string): Promise<void> {
    await this.minioClient.fGetObject(this.bucketName, objectName, destPath);
  }

  /**
   * Generates a temporary presigned URL for downloading the object.
   *
   * @param objectName - Key identifying the object.
   * @returns A promise resolving to the presigned URL.
   */
  async getFileUrl(objectName: string): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      24 * 60 * 60,
    );
  }

  /**
   * Deletes an object from the MinIO bucket.
   *
   * @param objectName - Key identifying the object to remove.
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting file ${objectName} from MinIO: ${message}`);
    }
  }
}
