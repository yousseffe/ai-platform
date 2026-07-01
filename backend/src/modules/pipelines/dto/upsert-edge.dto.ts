import { IsOptional, IsUUID, IsObject } from 'class-validator';
import { MapperSpec } from '../interfaces/mapper-spec.interface';

/**
 * Data Transfer Object for creating/replacing the mapper on one edge of a
 * pipeline. Omit `fromStepId` for the pipeline's external input edge; omit
 * `toStepId` for its external output edge.
 */
export class UpsertEdgeDto {
  /** UUID of the upstream step. Omit to represent the pipeline's external input. */
  @IsUUID()
  @IsOptional()
  fromStepId?: string;

  /** UUID of the downstream step. Omit to represent the pipeline's external output. */
  @IsUUID()
  @IsOptional()
  toStepId?: string;

  /** Declarative field-mapping rules applied to the payload crossing this edge. */
  @IsObject()
  spec: MapperSpec;
}
