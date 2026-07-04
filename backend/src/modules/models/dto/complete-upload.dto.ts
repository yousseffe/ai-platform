import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object representing a single completed multipart upload part,
 * as returned by the client after uploading each chunk directly to storage.
 */
export class PartDto {
  /**
   * 1-indexed position of this part within the overall multipart upload.
   * Storage backends limit multipart uploads to a maximum of 10,000 parts.
   */
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(10000)
  partNumber: number;

  /**
   * The ETag returned by the storage backend after the part was uploaded,
   * required to stitch parts together into the final object.
   */
  @IsString()
  @IsNotEmpty()
  etag: string;
}

/**
 * Data Transfer Object describing the completed multipart upload of the
 * primary model weights artifact.
 */
export class ModelUploadDetailsDto {
  /**
   * Storage key identifying the uploaded object.
   */
  @IsString()
  objectKey: string;

  /**
   * The multipart upload session identifier issued during initiation.
   */
  @IsString()
  uploadId: string;

  /**
   * The collection of uploaded parts, which must be contiguous starting at 1.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartDto)
  parts: PartDto[];
}

/**
 * Data Transfer Object describing a simple (non-multipart) uploaded artifact,
 * such as a scaler or scripting hook.
 */
export class SimpleUploadDetailsDto {
  /**
   * Storage key identifying the uploaded object.
   */
  @IsString()
  objectKey: string;
}

/**
 * Data Transfer Object for finalizing a model version upload session by
 * stitching together the uploaded parts and registering version metadata.
 */
export class CompleteUploadDto {
  /**
   * Optional sample request payload used for prediction previews.
   */
  @IsString()
  @IsOptional()
  examplePayload?: string;

  /**
   * Optional sample expected response used for prediction previews.
   */
  @IsString()
  @IsOptional()
  expectedResult?: string;

  /**
   * Optional JSON-encoded class label mapping for classification models.
   */
  @IsString()
  @IsOptional()
  classLabels?: string;

  /**
   * Optional flag (stringified boolean) controlling whether the build queue
   * job should be dispatched immediately after upload completion.
   */
  @IsString()
  @IsOptional()
  triggerBuild?: string;

  /**
   * Completed multipart upload details for the primary model artifact.
   */
  @IsObject()
  @ValidateNested()
  @Type(() => ModelUploadDetailsDto)
  model: ModelUploadDetailsDto;

  /**
   * Completed upload details for the optional scaler artifact.
   */
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleUploadDetailsDto)
  scaler?: SimpleUploadDetailsDto;

  /**
   * Completed upload details for the optional preprocessing script.
   */
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleUploadDetailsDto)
  preprocess?: SimpleUploadDetailsDto;

  /**
   * Completed upload details for the optional postprocessing script.
   */
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleUploadDetailsDto)
  postprocess?: SimpleUploadDetailsDto;
}
