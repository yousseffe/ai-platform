import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  EntityManager,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { ModelsSearchService } from '../services/models-search.service';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { Deployment } from '../../deployments/entities/deployment.entity';

@EventSubscriber()
@Injectable()
export class SearchSyncSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(SearchSyncSubscriber.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly modelsSearchService: ModelsSearchService,
  ) {
    this.dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<any>): Promise<void> {
    const target = event.metadata.target;
    if (target === Model) {
      await this.reindexModel(event.entity.id, event.manager);
    } else if (target === ModelVersion) {
      if (event.entity.model?.id) {
        await this.reindexModel(event.entity.model.id, event.manager);
      } else {
        await this.reindexModelByVersion(event.entity.id, event.manager);
      }
    } else if (target === Deployment) {
      if (event.entity.modelVersion?.model?.id) {
        await this.reindexModel(event.entity.modelVersion.model.id, event.manager);
      } else if (event.entity.modelVersion?.id) {
        await this.reindexModelByVersion(event.entity.modelVersion.id, event.manager);
      } else {
        await this.reindexModelByDeployment(event.entity.id, event.manager);
      }
    }
  }

  async afterUpdate(event: UpdateEvent<any>): Promise<void> {
    const target = event.metadata.target;
    if (target === Model) {
      const id = event.entity?.id || event.databaseEntity?.id;
      if (id) {
        await this.reindexModel(id, event.manager);
      }
    } else if (target === ModelVersion) {
      const id = event.entity?.id || event.databaseEntity?.id;
      if (id) {
        await this.reindexModelByVersion(id, event.manager);
      }
    } else if (target === Deployment) {
      const id = event.entity?.id || event.databaseEntity?.id;
      if (id) {
        await this.reindexModelByDeployment(id, event.manager);
      }
    }
  }

  async afterRemove(event: RemoveEvent<any>): Promise<void> {
    const target = event.metadata.target;
    if (target === Model) {
      const id = event.entityId || event.entity?.id;
      if (id) {
        await this.modelsSearchService.deleteFromIndex(id);
        this.logger.log(`Automatically deleted model ${id} from OpenSearch`);
      }
    } else if (target === ModelVersion) {
      const modelId = event.entity?.model?.id || event.entity?.modelId;
      if (modelId) {
        await this.reindexModel(modelId, event.manager);
      }
    } else if (target === Deployment) {
      const modelId = event.entity?.modelVersion?.model?.id;
      if (modelId) {
        await this.reindexModel(modelId, event.manager);
      }
    }
  }

  private async reindexModel(modelId: string, manager: EntityManager): Promise<void> {
    try {
      const fullModel = await manager.findOne(Model, {
        where: { id: modelId },
        relations: ['organization', 'versions', 'versions.deployments', 'user'],
      });
      if (fullModel) {
        await this.modelsSearchService.indexModel(fullModel);
        this.logger.log(`Automatically reindexed model ${modelId} in OpenSearch`);
      }
    } catch (error) {
      this.logger.error(`Failed to automatically reindex model ${modelId}: ${error}`);
    }
  }

  private async reindexModelByVersion(versionId: string, manager: EntityManager): Promise<void> {
    try {
      const version = await manager.findOne(ModelVersion, {
        where: { id: versionId },
        relations: ['model'],
      });
      if (version?.model) {
        await this.reindexModel(version.model.id, manager);
      }
    } catch (error) {
      this.logger.error(`Failed to reindex model by version ${versionId}: ${error}`);
    }
  }

  private async reindexModelByDeployment(deploymentId: string, manager: EntityManager): Promise<void> {
    try {
      const dep = await manager.findOne(Deployment, {
        where: { id: deploymentId },
        relations: ['modelVersion', 'modelVersion.model'],
      });
      if (dep?.modelVersion?.model) {
        await this.reindexModel(dep.modelVersion.model.id, manager);
      }
    } catch (error) {
      this.logger.error(`Failed to reindex model by deployment ${deploymentId}: ${error}`);
    }
  }
}
