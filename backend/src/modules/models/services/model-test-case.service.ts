import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelVersionTestCase } from '../entities/model-version-test-case.entity';
import { ModelVersionsRepository } from '../repositories/model-versions.repository';
import { ModelsService } from './models.service';
import { VersionReviewAction } from '../enums/version-review-action.enum';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ModelTestCaseService {
  constructor(
    private readonly modelVersionsRepository: ModelVersionsRepository,
    @InjectRepository(ModelVersionTestCase)
    private readonly testCaseRepository: Repository<ModelVersionTestCase>,
    @Inject(forwardRef(() => ModelsService))
    private readonly modelsService: ModelsService,
  ) {}

  async addVersionTestCase(
    versionId: string,
    actorId: string,
    body: {
      name: string;
      payload: string;
      expectedResult?: string;
      notes?: string;
    },
  ): Promise<ModelVersionTestCase> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    if (version.model.organization) {
      await this.modelsService.assertProviderOrgAccess(
        version.model.organization.id,
        actorId,
      );
    }

    const testCase = this.testCaseRepository.create({
      version,
      createdBy: { id: actorId } as User,
      name: body.name,
      payload: body.payload,
      expectedResult: body.expectedResult ?? null,
      notes: body.notes ?? null,
    });
    const saved = await this.testCaseRepository.save(testCase);
    await this.modelsService.recordReviewEvent({
      model: version.model,
      version,
      actorId,
      action: VersionReviewAction.TEST_CASE_ADDED,
      message: `Test case saved: ${body.name}`,
    });
    return saved;
  }

  async getVersionTestCases(
    versionId: string,
    actorId: string,
  ): Promise<ModelVersionTestCase[]> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    if (version.model.organization) {
      await this.modelsService.assertProviderOrgAccess(
        version.model.organization.id,
        actorId,
        [
          OrgRole.OWNER,
          OrgRole.MAINTAINER,
          OrgRole.CONTRIBUTOR,
          OrgRole.VIEWER,
        ],
      );
    }
    return this.testCaseRepository.find({
      where: { version: { id: versionId } },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }
}
