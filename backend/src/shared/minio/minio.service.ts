import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly presignClient: Minio.Client;
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
      region: 'us-east-1',
    });

    let externalEndpoint =
      process.env.MINIO_ENDPOINT === 'minio'
        ? 'localhost'
        : process.env.MINIO_ENDPOINT || 'localhost';
    let externalPort = parseInt(process.env.MINIO_PORT || '9000', 10);
    let useSSL = false;

    if (process.env.MINIO_EXTERNAL_URL) {
      try {
        const parsedUrl = new global.URL(process.env.MINIO_EXTERNAL_URL);
        externalEndpoint = parsedUrl.hostname;
        externalPort = parsedUrl.port
          ? parseInt(parsedUrl.port, 10)
          : parsedUrl.protocol === 'https:'
            ? 443
            : 80;
        useSSL = parsedUrl.protocol === 'https:';
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to parse MINIO_EXTERNAL_URL: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else if (process.env.MINIO_EXTERNAL_ENDPOINT) {
      externalEndpoint = process.env.MINIO_EXTERNAL_ENDPOINT;
      externalPort = parseInt(process.env.MINIO_EXTERNAL_PORT || '9000', 10);
    }

    this.presignClient = new Minio.Client({
      endPoint: externalEndpoint,
      port: externalPort,
      useSSL: useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      region: 'us-east-1',
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully.`);
      }
      await this.applyBucketCors();
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

  private async applyBucketCors(): Promise<void> {
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    try {
      const response = await fetch(
        `http://${endpoint}:${port}/${this.bucketName}`,
        {
          method: 'OPTIONS',
          headers: {
            Origin: process.env.PUBLIC_API_URL || 'http://localhost:3001',
            'Access-Control-Request-Method': 'PUT',
          },
        },
      );
      const exposedHeaders =
        response.headers.get('access-control-expose-headers') || '';
      if (!exposedHeaders.toLowerCase().includes('etag')) {
        this.logger.warn(
          `MinIO CORS preflight to ${endpoint}:${port} did not expose the ETag header ` +
            `(Access-Control-Expose-Headers: "${exposedHeaders}"). Browser clients performing ` +
            'direct presigned PUT uploads will be unable to read part ETags, which will cause ' +
            'multipart upload completion to fail. Ensure MINIO_API_CORS_ALLOW_ORIGIN is set on the MinIO server.',
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not verify MinIO CORS configuration via preflight request: ${message}. ` +
          'Ensure MINIO_API_CORS_ALLOW_ORIGIN is set on the MinIO server so browser clients can read the ETag header during multipart uploads.',
      );
    }
  }

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

  async getFileUrl(objectName: string): Promise<string> {
    if (this.useLocalFallback) {
      const backendUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
      return `${backendUrl}/uploads/local-s3/${this.bucketName}/${objectName}`;
    }
    return this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      24 * 60 * 60,
    );
  }

  async getStorageStats(): Promise<{
    bucket: string;
    fallback: boolean;
    objectCount: number;
    totalSizeBytes: number;
  }> {
    if (this.useLocalFallback) {
      return {
        bucket: this.bucketName,
        fallback: true,
        objectCount: 0,
        totalSizeBytes: 0,
      };
    }

    return new Promise((resolve) => {
      let objectCount = 0;
      let totalSizeBytes = 0;
      const stream = this.minioClient.listObjectsV2(this.bucketName, '', true);
      stream.on('data', (obj) => {
        objectCount += 1;
        totalSizeBytes += obj.size ?? 0;
      });
      stream.on('end', () => {
        resolve({
          bucket: this.bucketName,
          fallback: false,
          objectCount,
          totalSizeBytes,
        });
      });
      stream.on('error', (error: Error) => {
        this.logger.error(`Failed to list bucket objects: ${error.message}`);
        resolve({
          bucket: this.bucketName,
          fallback: false,
          objectCount,
          totalSizeBytes,
        });
      });
    });
  }

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

  isFallbackActive(): boolean {
    return this.useLocalFallback;
  }

  async initiateMultipartUpload(
    objectName: string,
    mimeType = 'application/octet-stream',
  ): Promise<string> {
    if (this.useLocalFallback) {
      return 'local-fallback-upload';
    }
    const headers = { 'Content-Type': mimeType };
    return this.minioClient.initiateNewMultipartUpload(
      this.bucketName,
      objectName,
      headers,
    );
  }

  async completeMultipartUpload(
    objectName: string,
    uploadId: string,
    parts: { part: number; etag: string }[],
  ): Promise<Record<string, unknown>> {
    if (this.useLocalFallback) {
      return { etag: 'local-mock-etag' };
    }

    const sortedParts = [...parts].sort((a, b) => a.part - b.part);
    return this.minioClient.completeMultipartUpload(
      this.bucketName,
      objectName,
      uploadId,
      sortedParts,
    );
  }

  async abortMultipartUpload(
    objectName: string,
    uploadId: string,
  ): Promise<void> {
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
        return;
      }
      const baseName = path.basename(targetPath);
      const partFilePrefix = `${baseName}.part-`;
      for (const entry of fs.readdirSync(targetDir)) {
        if (entry.startsWith(partFilePrefix)) {
          try {
            fs.unlinkSync(path.join(targetDir, entry));
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `[Fallback] Failed to delete orphaned part file ${entry}: ${message}`,
            );
          }
        }
      }
      this.logger.log(
        `[Fallback] Aborted local multipart upload for ${objectName} (uploadId=${uploadId}).`,
      );
      return;
    }

    await this.minioClient.removeIncompleteUpload(this.bucketName, objectName);
    this.logger.log(
      `Aborted multipart upload for ${objectName} (uploadId=${uploadId}).`,
    );
  }

  async listIncompleteUploadsWithAge(): Promise<
    { objectName: string; uploadId: string; initiatedAt: Date }[]
  > {
    if (this.useLocalFallback) {
      return [];
    }

    const results: {
      objectName: string;
      uploadId: string;
      initiatedAt: Date;
    }[] = [];
    let keyMarker = '';
    let uploadIdMarker = '';
    let isTruncated = true;

    while (isTruncated) {
      const page = await this.minioClient.listIncompleteUploadsQuery(
        this.bucketName,
        '',
        keyMarker,
        uploadIdMarker,
        '',
      );
      for (const upload of page.uploads) {
        results.push({
          objectName: upload.key,
          uploadId: upload.uploadId,
          initiatedAt: upload.initiated,
        });
      }
      isTruncated = page.isTruncated;
      keyMarker = page.nextKeyMarker;
      uploadIdMarker = page.nextUploadIdMarker;
    }

    return results;
  }

  async generatePresignedUrlForPut(
    objectName: string,
    uploadId?: string,
    partNumber?: number,
  ): Promise<string> {
    if (this.useLocalFallback) {
      const backendUrl = process.env.PUBLIC_API_URL || 'http://localhost:3000';
      let url = `${backendUrl}/api/v1/models/local-upload/${objectName}`;
      const queryParams: string[] = [];
      if (uploadId) queryParams.push(`uploadId=${uploadId}`);
      if (partNumber) queryParams.push(`partNumber=${partNumber}`);
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      return url;
    }

    const expiry = 24 * 60 * 60;
    const reqParams: Record<string, string> = {};
    if (uploadId) reqParams['uploadId'] = uploadId;
    if (partNumber) reqParams['partNumber'] = partNumber.toString();

    let url = await this.presignClient.presignedUrl(
      'PUT',
      this.bucketName,
      objectName,
      expiry,
      reqParams,
    );

    const minioHost = `${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`;
    const dockerInternalMinioHost = 'minio:9000';
    if (process.env.MINIO_EXTERNAL_URL) {
      url = url.replace(`http://${minioHost}`, process.env.MINIO_EXTERNAL_URL);
    } else if (url.includes(`://${dockerInternalMinioHost}`)) {
      url = url.replace(`://${dockerInternalMinioHost}`, '://localhost:9000');
    }

    return url;
  }
}
