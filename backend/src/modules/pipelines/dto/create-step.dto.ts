import {
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { PipelinePinPolicy } from '../enums/pipeline-pin-policy.enum';

/**
 * Data Transfer Object for adding a step to a pipeline. The step always
 * references an already-uploaded `ModelVersion` — binding a brand-new upload
 * to a step happens via the normal `POST /models/:id/versions` upload flow
 * first, then adding the resulting version's ID here.
 */
export class CreateStepDto {
  /** 0-based position of this step within the pipeline's chain. */
  @IsInt()
  @Min(0)
  order: number;

  /** UUID of the `ModelVersion` this step calls. */
  @IsUUID()
  modelVersionId: string;

  /** Display label shown in the pipeline builder. */
  @IsString()
  @IsOptional()
  label?: string;

  /** Whether to pin to the exact version above or always use the latest READY one. */
  @IsEnum(PipelinePinPolicy)
  @IsOptional()
  pinPolicy?: PipelinePinPolicy;

  /** Per-step request timeout override, in milliseconds. */
  @IsInt()
  @Min(0)
  @IsOptional()
  timeoutMs?: number;

  /** Number of retries on transient failure before failing the run. */
  @IsInt()
  @Min(0)
  @IsOptional()
  maxRetries?: number;
}
