import {
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { PipelinePinPolicy } from '../enums/pipeline-pin-policy.enum';

/** Data Transfer Object for editing an existing pipeline step. */
export class UpdateStepDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsUUID()
  @IsOptional()
  modelVersionId?: string;

  @IsString()
  @IsOptional()
  label?: string;

  /** Disambiguates this step from its stage siblings when parallel. */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  role?: string;

  @IsEnum(PipelinePinPolicy)
  @IsOptional()
  pinPolicy?: PipelinePinPolicy;

  @IsInt()
  @Min(0)
  @IsOptional()
  timeoutMs?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxRetries?: number;
}
