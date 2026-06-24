import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service providing integration with MinIO S3 object storage for uploading,
 * downloading, and deleting model artifacts and scalers.
 * Falls back to local disk storage if MinIO is not running.
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketName = process.env.MINIO_BUCKET || 'models';
  private useLocalFallback = false;

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
   * If S3 connection fails, activates local filesystem storage fallback.
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
      this.logger.warn(
        `MinIO connection failed: ${message}. Falling back to local filesystem storage.`,
      );
      this.useLocalFallback = true;
      const fallbackDir = path.join(
        process.cwd(),
        'uploads',
        'local-s3',
        this.bucketName,
      );
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
    }
  }

  /**
   * Uploads a local file to the MinIO bucket or local fallback directory.
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
    if (this.useLocalFallback) {
      const targetPath = path.join(
        process.cwd(),
        'uploads',
        'local-s3',
        this.bucketName,
        objectName,
      );
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(filePath, targetPath);
      this.logger.log(
        `[Fallback] Stored ${objectName} locally at ${targetPath}`,
      );
      return objectName;
    }
    await this.minioClient.fPutObject(this.bucketName, objectName, filePath, {
      'Content-Type': mimeType,
    });
    return objectName;
  }

  /**
   * Downloads an object from MinIO or copies from local storage fallback.
   *
   * @param objectName - Key identifying the object inside the bucket.
   * @param destPath - Destination path on the local disk.
   */
  async downloadFile(objectName: string, destPath: string): Promise<void> {
    if (this.useLocalFallback) {
      const srcPath = path.join(
        process.cwd(),
        'uploads',
        'local-s3',
        this.bucketName,
        objectName,
      );
      if (!fs.existsSync(srcPath)) {
        throw new Error(
          `[Fallback] File ${objectName} not found at ${srcPath}`,
        );
      }
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      this.logger.log(
        `[Fallback] Loaded ${objectName} from local storage to ${destPath}`,
      );
      return;
    }
    await this.minioClient.fGetObject(this.bucketName, objectName, destPath);
  }

  /**
   * Generates a temporary URL for downloading the object.
   *
   * @param objectName - Key identifying the object.
   * @returns A promise resolving to the download URL.
   */
  async getFileUrl(objectName: string): Promise<string> {
    if (this.useLocalFallback) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const backendUrl = frontendUrl.replace('3001', '5000');
      return `${backendUrl}/uploads/local-s3/${this.bucketName}/${objectName}`;
    }
    return this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      24 * 60 * 60,
    );
  }

  /**
   * Deletes an object from the MinIO bucket or local storage fallback.
   *
   * @param objectName - Key identifying the object to remove.
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      if (this.useLocalFallback) {
        const filePath = path.join(
          process.cwd(),
          'uploads',
          'local-s3',
          this.bucketName,
          objectName,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`[Fallback] Deleted local file ${objectName}`);
        }
        return;
      }
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error deleting file ${objectName} from MinIO: ${message}`,
      );
    }
  }
}
