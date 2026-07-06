import { IsOptional, IsUUID, IsObject } from 'class-validator';
import { MapperSpec } from '../interfaces/mapper-spec.interface';

export class UpsertEdgeDto {
  @IsUUID()
  @IsOptional()
  fromStepId?: string;

  @IsUUID()
  @IsOptional()
  toStepId?: string;

  @IsObject()
  spec: MapperSpec;
}
