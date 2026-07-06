import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Model } from '../entities/model.entity';

@Injectable()
export class ModelsRepository extends Repository<Model> {
  constructor(private dataSource: DataSource) {
    super(Model, dataSource.createEntityManager());
  }
}
