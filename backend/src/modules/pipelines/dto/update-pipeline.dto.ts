import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { PipelineType } from '../enums/pipeline-type.enum';

/** Data Transfer Object for editing a pipeline's metadata. */
export class UpdatePipelineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** UI preset for the pipeline's intended shape. */
  @IsEnum(PipelineType)
  @IsOptional()
  type?: PipelineType;

  /** Whether the pipeline is listed in the public marketplace. */
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
