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

export class CreateStepDto {
  @IsInt()
  @Min(0)
  order: number;

  @IsUUID()
  modelVersionId: string;

  @IsString()
  @IsOptional()
  label?: string;

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
