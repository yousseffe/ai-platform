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
import { ModelsService } from './models.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DeploymentsService } from '../deployments/deployments.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { CreateModelDto } from './dto/create-model.dto';
import { UploadVersionDto } from './dto/upload-version.dto';

@UseGuards(JwtAuthGuard)
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly deploymentsService: DeploymentsService,
    private readonly httpService: HttpService,
  ) {}

  @Post()
  async createModel(
    @Body() body: CreateModelDto,
    @Request() req,
  ) {
    return this.modelsService.createModel(
      body.name,
      body.description || '',
      req.user.id,
    );
  }

  @Get()
  async getModels(@Request() req) {
    return this.modelsService.getModels(req.user.id);
  }

  @Get(':id')
  async getModel(@Param('id') id: string) {
    return this.modelsService.getModel(id);
  }

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
    return this.modelsService.uploadVersion(id, files, body.examplePayload, body.expectedResult);
  }

  @Post(':id/predict')
  async predict(@Param('id') id: string, @Body() data: any) {
    const url = await this.deploymentsService.getActiveDeploymentUrl(id);
    const response = await firstValueFrom(
      this.httpService.post(`${url}/predict`, data),
    );
    return response.data;
  }
}
