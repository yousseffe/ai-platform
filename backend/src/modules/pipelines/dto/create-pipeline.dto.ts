import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PipelineType } from '../enums/pipeline-type.enum';

export class CreatePipelineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PipelineType)
  @IsOptional()
  type?: PipelineType;
}
