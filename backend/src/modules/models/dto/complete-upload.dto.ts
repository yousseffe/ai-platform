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

export class PartDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(10000)
  partNumber: number;

  @IsString()
  @IsNotEmpty()
  etag: string;
}

export class ModelUploadDetailsDto {
  @IsString()
  objectKey: string;

  @IsString()
  uploadId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartDto)
  parts: PartDto[];
}

export class SimpleUploadDetailsDto {
  @IsString()
  objectKey: string;
}

export class CompleteUploadDto {
  @IsString()
  @IsOptional()
  examplePayload?: string;

  @IsString()
  @IsOptional()
  expectedResult?: string;

  @IsString()
  @IsOptional()
  classLabels?: string;

  @IsString()
  @IsOptional()
  triggerBuild?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ModelUploadDetailsDto)
  model: ModelUploadDetailsDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleUploadDetailsDto)
  scaler?: SimpleUploadDetailsDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleUploadDetailsDto)
  preprocess?: SimpleUploadDetailsDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleUploadDetailsDto)
  postprocess?: SimpleUploadDetailsDto;
}
