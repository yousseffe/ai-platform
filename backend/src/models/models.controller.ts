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
  async createModel(@Body() body: CreateModelDto, @Request() req) {
    return this.modelsService.createModel(
      body.name,
      body.description || '',
      body.type || 'TABULAR',
      body.taskType || 'OTHER',
      body.framework || 'CUSTOM',
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
  ) {
    return this.modelsService.uploadVersion(
      id,
      files,
      body.examplePayload,
      body.expectedResult,
    );
  }

  @Post(':id/predict')
  async predict(@Param('id') id: string, @Body() data: any, @Res() res: Response) {
    const model = await this.modelsService.getModel(id);
    const url = await this.deploymentsService.getActiveDeploymentUrl(id);
    
    const targetEndpoint = model.type === 'LLM_GGUF' ? '/v1/chat/completions' : '/predict';
    
    if (data.stream) {
      // Proxy the stream for SSE (Server-Sent Events)
      const response = await firstValueFrom(
        this.httpService.post(`${url}${targetEndpoint}`, data, {
          responseType: 'stream',
        }),
      );
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      response.data.pipe(res);
    } else {
      // Standard JSON response
      const response = await firstValueFrom(
        this.httpService.post(`${url}${targetEndpoint}`, data),
      );
      res.json(response.data);
    }
  }

  @Delete(':id')
  async deleteModel(@Param('id') id: string) {
    await this.modelsService.deleteModel(id);
    return { success: true, message: 'Model deleted successfully' };
  }

  @Delete('versions/:versionId')
  async deleteVersion(@Param('versionId') versionId: string) {
    await this.modelsService.deleteVersion(versionId);
    return { success: true, message: 'Model version deleted successfully' };
  }
}
