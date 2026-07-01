import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
}
