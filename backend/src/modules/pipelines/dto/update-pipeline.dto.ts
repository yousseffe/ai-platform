import { IsString, IsOptional } from 'class-validator';

/** Data Transfer Object for editing a pipeline's metadata. */
export class UpdatePipelineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
