import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ModelsService } from '../services/models.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DeploymentsService } from '../../deployments/services/deployments.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CreateModelDto } from '../dto/create-model.dto';
import { UploadVersionDto } from '../dto/upload-version.dto';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelLog } from '../entities/model-log.entity';
import { User } from '../../users/entities/user.entity';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { WorkspaceInterceptor } from '../../auth/guards/workspace.interceptor';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { TransactionType } from '../../wallets/enums/transaction-type.enum';
import { TransactionStatus } from '../../wallets/enums/transaction-status.enum';

/**
 * Interface representing a NestJS request authenticated with a JWT payload.
 */
interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
}

/**
 * Controller exposing REST endpoints for ML model catalog management,
 * version uploading, and proxying client prediction requests.
 */
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly deploymentsService: DeploymentsService,
    private readonly httpService: HttpService,
    private readonly walletsService: WalletsService,
    private readonly dataSource: DataSource,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Registers a new model category registry inside the database.
   *
   * @param body - The create model specifications.
   * @param req - Authenticated user request context.
   * @returns A promise resolving to the created Model.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createModel(
    @Body() body: CreateModelDto,
    @Request() req: RequestWithUser,
  ): Promise<Model> {
    return this.modelsService.createModel(
      body.name,
      body.description || '',
      body.type || ModelType.TABULAR,
      body.taskType || TaskType.OTHER,
      body.framework || Framework.CUSTOM,
      req.user.id,
      body.isPublic ?? false,
    );
  }

  /**
   * Retrieves all models created by the authenticated user.
   *
   * @param req - Authenticated user request context.
   * @returns A promise resolving to an array of Models.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getModels(@Request() req: RequestWithUser): Promise<Model[]> {
    return this.modelsService.getModels(req.user.id);
  }

  /**
   * Retrieves all public models listing inside the marketplace catalog registry.
   *
   * @returns A promise resolving to an array of public Models.
   */
  @Get('marketplace')
  async getPublicModels(): Promise<Model[]> {
    return this.modelsService.getPublicModels();
  }

  /**
   * Retrieves prediction logs made by the authenticated user (Consumer).
   *
   * @param req - Authenticated user request context.
   * @returns A list of model execution logs.
   */
  @UseGuards(JwtAuthGuard)
  @Get('logs/consumer')
  async getConsumerLogs(@Request() req: RequestWithUser): Promise<ModelLog[]> {
    return this.modelLogRepository.find({
      where: { user: { id: req.user.id } },
      relations: ['model'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Retrieves prediction logs received on models owned by the authenticated user (Provider).
   *
   * @param req - Authenticated user request context.
   * @returns A list of model execution logs.
   */
  @UseGuards(JwtAuthGuard)
  @Get('logs/provider')
  async getProviderLogs(@Request() req: RequestWithUser): Promise<ModelLog[]> {
    return this.modelLogRepository.find({
      where: { model: { user: { id: req.user.id } } },
      relations: ['model'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Fetches metadata for a specific model by ID.
   *
   * @param id - The model UUID.
   * @returns A promise resolving to the detailed Model.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getModel(@Param('id') id: string): Promise<Model> {
    return this.modelsService.getModel(id);
  }

  /**
   * Uploads model artifact files (weights, scalers, and custom pre/post processing hooks)
   * to MinIO and enqueues a packaging background task.
   *
   * @param id - The parent model UUID.
   * @param body - Version parameters including examplePayload and expectedResult.
   * @param files - Map of files uploaded via Multer.
   * @returns A promise resolving to the created ModelVersion.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/versions')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'model', maxCount: 1 },
        { name: 'scaler', maxCount: 1 },
        { name: 'preprocess', maxCount: 1 },
        { name: 'postprocess', maxCount: 1 },
      ],
      {
        limits: { fileSize: 15 * 1024 * 1024 * 1024 }, // 15GB
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(
              null,
              file.fieldname + '-' + uniqueSuffix + extname(file.originalname),
            );
          },
        }),
      },
    ),
  )
  async uploadVersion(
    @Param('id') id: string,
    @Body() body: UploadVersionDto,
    @UploadedFiles()
    files: {
      model?: Express.Multer.File[];
      scaler?: Express.Multer.File[];
      preprocess?: Express.Multer.File[];
      postprocess?: Express.Multer.File[];
    },
  ): Promise<ModelVersion> {
    return this.modelsService.uploadVersion(
      id,
      files,
      body.examplePayload,
      body.expectedResult,
    );
  }

  /**
   * Proxies a prediction request to the active container deployment.
   * Supports streaming SSE response for LLM GGUF models when requested.
   *
   * @param id - The model UUID.
   * @param data - Raw JSON payload representing inputs.
   * @param res - Express response object for SSE/streaming output.
   */
  @UseGuards(ApiKeyOrJwtGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Post(':id/predict')
  async predict(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
    @Req() req: Record<string, unknown> & {
      user: { id: string; email: string; apiKey?: string };
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Res() res: Response,
  ): Promise<void> {
    const model = await this.modelsService.getModel(id);
    const cost = typeof model.costPerRequest === 'string' ? parseFloat(model.costPerRequest) : model.costPerRequest;

    if (cost > 0) {
      const balance = await this.walletsService.getBalance(
        req.workspaceId,
        req.workspaceType,
        WalletType.CONSUMER,
      );
      if (balance < cost) {
        throw new BadRequestException('Insufficient credits to perform prediction');
      }
    }

    // Retrieve active API key of the model owner to authorize NestJS proxy call to the container.
    // The container templates enforce checking the request headers for this API key.
    const modelOwnerApiKeyEntity = await this.apiKeyRepository.findOne({
      where: { user: { id: model.user.id }, isActive: true },
    });
    const containerApiKey = modelOwnerApiKeyEntity?.key || '';

    const url = await this.deploymentsService.getActiveDeploymentUrl(id);
    const targetEndpoint =
      model.type === ModelType.LLM_GGUF ? '/v1/chat/completions' : '/predict';

    const startTime = Date.now();
    let statusCode = 200;
    let executionStatus = 'SUCCESS';

    const headers = {
      'Authorization': `Bearer ${containerApiKey}`,
      'x-api-key': containerApiKey,
    };

    try {
      if (data.stream === true) {
        const response = await firstValueFrom(
          this.httpService.post<Readable>(`${url}${targetEndpoint}`, data, {
            headers,
            responseType: 'stream',
          }),
        );

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        response.data.pipe(res);
      } else {
        const response = await firstValueFrom(
          this.httpService.post<unknown>(`${url}${targetEndpoint}`, data, {
            headers,
          }),
        );
        res.json(response.data);
      }
    } catch (err: unknown) {
      executionStatus = 'FAILED';
      statusCode = 500;
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Prediction failed: ${message}` });
      return;
    } finally {
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      // Charge the user and write transaction logs if cost > 0 and request succeeded
      if (cost > 0 && executionStatus === 'SUCCESS') {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // 1. Deduct cost from consumer wallet
          await queryRunner.manager.query(
            `UPDATE wallets SET balance = balance - $1 WHERE owner_id = $2 AND owner_type = $3 AND wallet_type = $4`,
            [cost, req.workspaceId, req.workspaceType, WalletType.CONSUMER],
          );

          // Get consumer wallet ID to write transaction
          const consumerWallet = await queryRunner.manager.findOne(Wallet, {
            where: { ownerId: req.workspaceId, ownerType: req.workspaceType, walletType: WalletType.CONSUMER },
          });

          if (consumerWallet) {
            const consumerTx = queryRunner.manager.create(Transaction, {
              walletId: consumerWallet.id,
              type: TransactionType.DEBIT,
              amount: cost,
              reference: `Inference debit for model: ${model.name}`,
              status: TransactionStatus.COMPLETED,
            });
            await queryRunner.manager.save(Transaction, consumerTx);
          }

          // 2. Pay Provider (model owner)
          const providerSharePercent = model.providerSharePercent || 80;
          const providerShare = cost * (providerSharePercent / 100);

          await queryRunner.manager.query(
            `UPDATE wallets SET balance = balance + $1 WHERE owner_id = $2 AND owner_type = $3 AND wallet_type = $4`,
            [providerShare, model.user.id, OwnerType.USER, WalletType.CONSUMER],
          );

          // Get provider wallet
          const providerWallet = await queryRunner.manager.findOne(Wallet, {
            where: { ownerId: model.user.id, ownerType: OwnerType.USER, walletType: WalletType.CONSUMER },
          });

          if (providerWallet) {
            const providerTx = queryRunner.manager.create(Transaction, {
              walletId: providerWallet.id,
              type: TransactionType.CREDIT,
              amount: providerShare,
              reference: `Inference credit share for model: ${model.name}`,
              status: TransactionStatus.COMPLETED,
            });
            await queryRunner.manager.save(Transaction, providerTx);
          }

          // 3. Pay Platform Admin
          const platformShare = cost - providerShare;
          if (platformShare > 0) {
            const systemOwnerId = '00000000-0000-0000-0000-000000000000';
            
            // Check if system wallet exists, if not create
            let systemWallet = await queryRunner.manager.findOne(Wallet, {
              where: { ownerId: systemOwnerId, ownerType: OwnerType.USER, walletType: WalletType.CONSUMER },
            });

            if (!systemWallet) {
              systemWallet = queryRunner.manager.create(Wallet, {
                walletType: WalletType.CONSUMER,
                ownerType: OwnerType.USER,
                ownerId: systemOwnerId,
                balance: 0.0,
                currency: 'CREDITS',
              });
              await queryRunner.manager.save(Wallet, systemWallet);
            }

            await queryRunner.manager.query(
              `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
              [platformShare, systemWallet.id],
            );

            const platformTx = queryRunner.manager.create(Transaction, {
              walletId: systemWallet.id,
              type: TransactionType.CREDIT,
              amount: platformShare,
              reference: `Platform commission for model: ${model.name}`,
              status: TransactionStatus.COMPLETED,
            });
            await queryRunner.manager.save(Transaction, platformTx);
          }

          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          console.error('[Billing Error] Rollback transaction:', error);
        } finally {
          await queryRunner.release();
        }
      }

      // Save execution details to ModelLog
      try {
        const callerUser = await this.dataSource.getRepository(User).findOneBy({ id: req.user.id });
        const logEntry = this.modelLogRepository.create({
          model,
          user: callerUser!,
          apiKey: req.user.apiKey || 'JWT Session',
          responseTimeMs,
          status: executionStatus,
          statusCode,
        });
        await this.modelLogRepository.save(logEntry);
      } catch (logError) {
        console.error('Failed to save model execution log:', logError);
      }
    }
  }

  /**
   * Deletes a specific model and all its versions.
   *
   * @param id - The model UUID to delete.
   * @returns Success confirmation.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteModel(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.modelsService.deleteModel(id);
    return { success: true, message: 'Model deleted successfully' };
  }

  /**
   * Deletes a specific model version iteration.
   *
   * @param versionId - The model version UUID to delete.
   * @returns Success confirmation.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('versions/:versionId')
  async deleteVersion(
    @Param('versionId') versionId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.modelsService.deleteVersion(versionId);
    return { success: true, message: 'Model version deleted successfully' };
  }
}
