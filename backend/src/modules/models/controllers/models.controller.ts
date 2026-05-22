import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ModelsService } from '../services/models.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DeploymentsService } from '../../deployments/services/deployments.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { CreateModelDto } from '../dto/create-model.dto';
import { UploadVersionDto } from '../dto/upload-version.dto';

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
 * Controller managing model registrations, versions uploads, and prediction routing.
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
   * Creates a new model record associated with the authenticated user.
   *
   * @param body - Data containing model name and description.
   * @param req - Authenticated user request context.
   * @returns The created Model database record.
   */
  @Post()
  async createModel(
    @Body() body: CreateModelDto,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.createModel(
      body.name,
      body.description || '',
      req.user.id,
    );
  }

  /**
   * Retrieves all models created by the authenticated user.
   *
   * @param req - Authenticated user request context.
   * @returns Array of Model entities.
   */
  @Get()
  async getModels(@Request() req: RequestWithUser) {
    return this.modelsService.getModels(req.user.id);
  }

  /**
   * Fetches metadata for a specific model by ID.
   *
   * @param id - The model identifier.
   * @returns Detailed Model metadata including its versions.
   */
  @Get(':id')
  async getModel(@Param('id') id: string) {
    return this.modelsService.getModel(id);
  }

  /**
   * Uploads version artifact files for a given model.
   * Artifacts include the serialized model weights/structure, scalers, and custom pre/post processing hooks.
   *
   * @param id - The model identifier.
   * @param body - Version parameters including examplePayload and expectedResult.
   * @param files - Map of files uploaded via Multer fields.
   * @returns The created ModelVersion record.
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
        limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
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
  ) {
    return this.modelsService.uploadVersion(
      id,
      files,
      body.examplePayload,
      body.expectedResult,
    );
  }

  /**
   * Proxies a prediction request payload to the active deployment container of a model.
   *
   * @param id - The model identifier.
   * @param data - The raw input payload for the prediction engine.
   * @returns The prediction results returned by the model microservice container.
   */
  @Post(':id/predict')
  async predict(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ): Promise<unknown> {
    const url = await this.deploymentsService.getActiveDeploymentUrl(id);
    const response = await firstValueFrom(
      this.httpService.post<unknown>(`${url}/predict`, data),
    );
    return response.data;
  }
}
