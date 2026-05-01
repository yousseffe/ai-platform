import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Deployment } from './deployment.entity';

@Injectable()
export class DeploymentsRepository extends Repository<Deployment> {
  constructor(private dataSource: DataSource) {
    super(Deployment, dataSource.createEntityManager());
  }
}
