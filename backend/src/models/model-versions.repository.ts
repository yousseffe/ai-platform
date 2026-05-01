import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ModelVersion } from './model-version.entity';

@Injectable()
export class ModelVersionsRepository extends Repository<ModelVersion> {
  constructor(private dataSource: DataSource) {
    super(ModelVersion, dataSource.createEntityManager());
  }
}
