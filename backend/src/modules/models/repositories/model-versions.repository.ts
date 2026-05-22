import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ModelVersion } from '../entities/model-version.entity';

/**
 * Custom repository for ModelVersion entity operations.
 */
@Injectable()
export class ModelVersionsRepository extends Repository<ModelVersion> {
  constructor(private dataSource: DataSource) {
    super(ModelVersion, dataSource.createEntityManager());
  }
}
