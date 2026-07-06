import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { PipelineType } from '../enums/pipeline-type.enum';

export class UpdatePipelineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PipelineType)
  @IsOptional()
  type?: PipelineType;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
