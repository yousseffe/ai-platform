import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PipelineType } from '../enums/pipeline-type.enum';

/** Data Transfer Object for creating a new pipeline. */
export class CreatePipelineDto {
  /** Display name of the pipeline. */
  @IsString()
  @IsNotEmpty()
  name: string;

  /** Optional long-form explanation of what the pipeline does. */
  @IsString()
  @IsOptional()
  description?: string;

  /** UI preset for the pipeline's intended shape. Defaults to a sequential chain. */
  @IsEnum(PipelineType)
  @IsOptional()
  type?: PipelineType;
}
