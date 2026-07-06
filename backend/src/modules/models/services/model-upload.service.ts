import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import * as fs from 'fs';
import { join, dirname } from 'path';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { CompleteUploadDto } from '../dto/complete-upload.dto';
import { AbortUploadDto } from '../dto/abort-upload.dto';
import { VersionStatus } from '../enums/version-status.enum';
import { VersionReviewStatus } from '../enums/version-review-status.enum';
import { VersionReviewAction } from '../enums/version-review-action.enum';
import { SchemaDetectionStatus } from '../enums/schema-detection-status.enum';
import { ModelsRepository } from '../repositories/models.repository';
import { ModelVersionsRepository } from '../repositories/model-versions.repository';
import { MinioService } from '../../../shared/minio/minio.service';
import { ProviderLimitsService } from '../../provider-accounts';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ModelsService } from './models.service';

@Injectable()
export class ModelUploadService {
  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelVersionsRepository: ModelVersionsRepository,
    @InjectQueue('build-queue') private readonly buildQueue: Queue,
    private readonly minioService: MinioService,
    private readonly providerLimitsService: ProviderLimitsService,
    @Inject(forwardRef(() => ModelsService))
    private readonly modelsService: ModelsService,
  ) {}

  async initiateVersionUpload(
    modelId: string,
    dto: InitiateUploadDto,
    uploaderUserId?: string,
  ): Promise<Record<string, unknown>> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'user', 'organization'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.organization) {
      if (!uploaderUserId) {
        throw new ForbiddenException('Missing authenticated uploader');
      }
      await this.modelsService.assertProviderOrgAccess(
        model.organization.id,
        uploaderUserId,
        [OrgRole.OWNER, OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR],
      );
    } else if (uploaderUserId && model.user?.id !== uploaderUserId) {
      throw new ForbiddenException('Only the model owner can upload versions');
    }

    const versionNumber = model.versions.length + 1;
    const ownerScope =
      model.organization?.slug ??
      (model.user?.email ? model.user.email.split('@')[0] : 'unknown');
    const sanitizedOwnerScope = ownerScope
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const sanitizedName = model.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();

    const result: Record<string, unknown> = {
      versionNumber,
      model: {},
    };

    const CHUNK_SIZE = 50 * 1024 * 1024;
    const chunkCount = Math.ceil(dto.modelSize / CHUNK_SIZE);
    if (chunkCount === 0) {
      throw new BadRequestException('modelSize must be greater than 0');
    }
    const modelObjectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/model-${dto.modelFilename}`;
    const uploadId = await this.minioService.initiateMultipartUpload(
      modelObjectKey,
      'application/octet-stream',
    );
    const urls: { partNumber: number; url: string }[] = [];

    for (let i = 1; i <= chunkCount; i++) {
      const url = await this.minioService.generatePresignedUrlForPut(
        modelObjectKey,
        uploadId,
        i,
      );
      urls.push({ partNumber: i, url });
    }

    result['model'] = {
      objectKey: modelObjectKey,
      uploadId,
      chunkSize: CHUNK_SIZE,
      urls,
    };

    if (dto.scalerFilename) {
      const objectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/scaler-${dto.scalerFilename}`;
      const url = await this.minioService.generatePresignedUrlForPut(objectKey);
      result['scaler'] = { objectKey, url };
    }

    if (dto.preprocessFilename) {
      const objectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/preprocess-${dto.preprocessFilename}`;
      const url = await this.minioService.generatePresignedUrlForPut(objectKey);
      result['preprocess'] = { objectKey, url };
    }

    if (dto.postprocessFilename) {
      const objectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/postprocess-${dto.postprocessFilename}`;
      const url = await this.minioService.generatePresignedUrlForPut(objectKey);
      result['postprocess'] = { objectKey, url };
    }

    return result;
  }

  async completeVersionUpload(
    modelId: string,
    dto: CompleteUploadDto,
    uploaderUserId?: string,
  ): Promise<ModelVersion> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'user', 'organization'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.organization) {
      if (!uploaderUserId) {
        throw new ForbiddenException('Missing authenticated uploader');
      }
      await this.modelsService.assertProviderOrgAccess(
        model.organization.id,
        uploaderUserId,
        [OrgRole.OWNER, OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR],
      );
      await this.providerLimitsService.assertCanCreateModelVersion(
        OwnerType.ORG,
        model.organization.id,
        model.id,
      );
    } else if (uploaderUserId && model.user?.id !== uploaderUserId) {
      throw new ForbiddenException('Only the model owner can upload versions');
    } else {
      if (!model.user) {
        throw new ForbiddenException('Missing model owner');
      }
      await this.providerLimitsService.assertCanCreateModelVersion(
        OwnerType.USER,
        model.user.id,
        model.id,
      );
    }

    const versionNumber = model.versions.length + 1;
    let prevVersion: ModelVersion | null = null;
    if (model.versions.length > 0) {
      prevVersion = [...model.versions].sort(
        (a, b) => b.versionNumber - a.versionNumber,
      )[0];
    }

    const modelObjectKey = dto.model.objectKey;
    const uploadId = dto.model.uploadId;

    this.assertPartsAreContiguous(dto.model.parts);

    if (this.minioService.isFallbackActive()) {
      const targetPath = join(
        process.cwd(),
        'uploads',
        'local-s3',
        'models',
        modelObjectKey,
      );
      const targetDir = dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(targetPath);
      const sortedParts = [...dto.model.parts].sort(
        (a, b) => a.partNumber - b.partNumber,
      );

      for (const part of sortedParts) {
        const partPath = `${targetPath}.part-${part.partNumber}`;
        if (!fs.existsSync(partPath)) {
          throw new BadRequestException(
            `Missing chunk part ${part.partNumber}`,
          );
        }
        const chunkBuffer = fs.readFileSync(partPath);
        writeStream.write(chunkBuffer);
        try {
          fs.unlinkSync(partPath);
        } catch (e: unknown) {
          console.warn(`Failed to delete part file: ${partPath}`, e);
        }
      }
      writeStream.end();
    } else {
      const mappedParts = dto.model.parts.map((p) => ({
        part: p.partNumber,
        etag: p.etag,
      }));
      await this.minioService.completeMultipartUpload(
        modelObjectKey,
        uploadId,
        mappedParts,
      );
    }

    const finalModelPath = modelObjectKey;
    const scalerPath =
      dto.scaler?.objectKey || prevVersion?.scalerFilePath || null;
    const preprocessPath =
      dto.preprocess?.objectKey || prevVersion?.preprocessFilePath || null;
    const postprocessPath =
      dto.postprocess?.objectKey || prevVersion?.postprocessFilePath || null;

    const parseJsonSafely = (val?: string): Record<string, unknown> | null => {
      if (!val) return null;
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch {
        return null;
      }
    };

    const examplePayload =
      dto.examplePayload || prevVersion?.examplePayload || null;
    const expectedResult =
      dto.expectedResult || prevVersion?.expectedResult || null;

    let schemaDetectionStatus: SchemaDetectionStatus;
    if (dto.examplePayload || dto.expectedResult) {
      schemaDetectionStatus = SchemaDetectionStatus.MANUAL;
    } else if (examplePayload || expectedResult) {
      schemaDetectionStatus =
        prevVersion?.schemaDetectionStatus ?? SchemaDetectionStatus.MANUAL;
    } else {
      schemaDetectionStatus = SchemaDetectionStatus.PENDING;
    }

    const modelVersion = this.modelVersionsRepository.create({
      model,
      uploadedBy: uploaderUserId ? { id: uploaderUserId } : null,
      versionNumber,
      status: VersionStatus.UPLOADED,
      reviewStatus: model.organization
        ? VersionReviewStatus.PENDING
        : VersionReviewStatus.NOT_REQUIRED,
      modelFilePath: finalModelPath,
      scalerFilePath: scalerPath,
      preprocessFilePath: preprocessPath,
      postprocessFilePath: postprocessPath,
      examplePayload,
      expectedResult,
      classLabels:
        parseJsonSafely(dto.classLabels) || prevVersion?.classLabels || null,
      schemaDetectionStatus,
    });

    const savedVersion = await this.modelVersionsRepository.save(modelVersion);

    await this.modelsService.recordReviewEvent({
      model,
      version: savedVersion,
      actorId: uploaderUserId,
      action: VersionReviewAction.VERSION_SUBMITTED,
      message: model.organization
        ? `Version v${versionNumber} submitted for maintainer review`
        : `Version v${versionNumber} uploaded`,
      metadata: {
        reviewRequired: Boolean(model.organization),
        files: {
          model: true,
          scaler: Boolean(dto.scaler?.objectKey),
          preprocess: Boolean(dto.preprocess?.objectKey),
          postprocess: Boolean(dto.postprocess?.objectKey),
        },
      },
    });

    if (!model.organization && dto.triggerBuild !== 'false') {
      await this.buildQueue.add('build-model', { versionId: savedVersion.id });
    }

    return savedVersion;
  }

  private assertPartsAreContiguous(parts: { partNumber: number }[]): void {
    if (!parts || parts.length === 0) {
      throw new BadRequestException('No uploaded parts were provided');
    }
    const sortedPartNumbers = [...parts]
      .map((p) => p.partNumber)
      .sort((a, b) => a - b);

    for (let i = 0; i < sortedPartNumbers.length; i++) {
      if (sortedPartNumbers[i] !== i + 1) {
        throw new BadRequestException(
          'Uploaded parts must be contiguous starting at 1, with no gaps or duplicates',
        );
      }
    }
  }

  async abortVersionUpload(
    modelId: string,
    dto: AbortUploadDto,
    requestingUserId?: string,
  ): Promise<{ success: boolean }> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'user', 'organization'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.organization) {
      if (!requestingUserId) {
        throw new ForbiddenException('Missing authenticated uploader');
      }
      await this.modelsService.assertProviderOrgAccess(
        model.organization.id,
        requestingUserId,
        [OrgRole.OWNER, OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR],
      );
    } else if (requestingUserId && model.user?.id !== requestingUserId) {
      throw new ForbiddenException('Only the model owner can abort uploads');
    }

    await this.minioService.abortMultipartUpload(dto.objectKey, dto.uploadId);
    return { success: true };
  }

  async confirmSchemaDetection(
    versionId: string,
    actorId: string,
    examplePayload?: string,
    expectedResult?: string,
  ): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization', 'model.user'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    const model = version.model;
    if (model.organization) {
      await this.modelsService.assertProviderOrgAccess(
        model.organization.id,
        actorId,
        [OrgRole.OWNER, OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR],
      );
    } else if (model.user?.id !== actorId) {
      throw new ForbiddenException(
        'Only the model owner can confirm the schema',
      );
    }

    if (examplePayload) {
      version.examplePayload = examplePayload;
    }
    if (expectedResult) {
      version.expectedResult = expectedResult;
    }
    version.schemaDetectionStatus = SchemaDetectionStatus.CONFIRMED;

    return this.modelVersionsRepository.save(version);
  }

  async startBuild(
    versionId: string,
    examplePayload?: string,
    expectedResult?: string,
    classLabels?: string | Record<string, unknown>,
  ): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Model version ${versionId} not found.`);
    }

    const parseJsonSafely = (
      val?: string | Record<string, unknown>,
    ): Record<string, unknown> | null => {
      if (!val) return null;
      if (typeof val !== 'string') return val;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    if (examplePayload) {
      version.examplePayload = examplePayload;
    }
    if (expectedResult) {
      version.expectedResult = expectedResult;
    }
    if (classLabels) {
      version.classLabels = parseJsonSafely(classLabels);
    }

    version.status = VersionStatus.BUILDING;
    const savedVersion = await this.modelVersionsRepository.save(version);

    await this.buildQueue.add('build-model', { versionId: savedVersion.id });

    return savedVersion;
  }
}
