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

/**
 * Data Transfer Object for adding a step to a pipeline. The step always
 * references an already-uploaded `ModelVersion` — binding a brand-new upload
 * to a step happens via the normal `POST /models/:id/versions` upload flow
 * first, then adding the resulting version's ID here.
 */
export class CreateStepDto {
  /**
   * 0-based stage index. Steps added with the same `order` as an existing
   * step run concurrently as parallel branches of that stage.
   */
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

  /**
   * Disambiguates this step from its stage siblings when it's one of
   * several parallel branches sharing the same `order`. Required (checked
   * at validation time) whenever a stage has more than one step.
   */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  role?: string;

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
