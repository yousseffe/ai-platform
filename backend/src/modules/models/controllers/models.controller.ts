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

import { CreateModelDto } from '../dto/create-model.dto';
import { UploadVersionDto } from '../dto/upload-version.dto';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';

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
@UseGuards(JwtAuthGuard)
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly deploymentsService: DeploymentsService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Registers a new model category registry inside the database.
   *
   * @param body - The create model specifications.
   * @param req - Authenticated user request context.
   * @returns A promise resolving to the created Model.
   */
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
    );
  }

  /**
   * Retrieves all models created by the authenticated user.
   *
   * @param req - Authenticated user request context.
   * @returns A promise resolving to an array of Models.
   */
  @Get()
  async getModels(@Request() req: RequestWithUser): Promise<Model[]> {
    return this.modelsService.getModels(req.user.id);
  }

  /**
   * Fetches metadata for a specific model by ID.
   *
   * @param id - The model UUID.
   * @returns A promise resolving to the detailed Model.
   */
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
  @Post(':id/predict')
  async predict(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const model = await this.modelsService.getModel(id);
    const url = await this.deploymentsService.getActiveDeploymentUrl(id);

    const targetEndpoint =
      model.type === ModelType.LLM_GGUF ? '/v1/chat/completions' : '/predict';

    if (data.stream === true) {
      const response = await firstValueFrom(
        this.httpService.post<Readable>(`${url}${targetEndpoint}`, data, {
          responseType: 'stream',
        }),
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      response.data.pipe(res);
    } else {
      const response = await firstValueFrom(
        this.httpService.post<unknown>(`${url}${targetEndpoint}`, data),
      );
      res.json(response.data);
    }
  }

  /**
   * Deletes a specific model and all its versions.
   *
   * @param id - The model UUID to delete.
   * @returns Success confirmation.
   */
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
  @Delete('versions/:versionId')
  async deleteVersion(
    @Param('versionId') versionId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.modelsService.deleteVersion(versionId);
    return { success: true, message: 'Model version deleted successfully' };
  }
}
