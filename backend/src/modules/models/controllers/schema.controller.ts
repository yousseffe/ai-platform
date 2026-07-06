import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  Logger,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ModelsService } from '../services/models.service';
import { ConfirmSchemaDto } from '../dto/confirm-schema.dto';
import { ModelVersion } from '../entities/model-version.entity';

const execPromise = promisify(exec);

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    isAdmin?: boolean;
  };
}

@Controller('models')
export class SchemaController {
  private readonly logger = new Logger(SchemaController.name);

  constructor(private readonly modelsService: ModelsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('detect-schema')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'model', maxCount: 1 },
        { name: 'postprocess', maxCount: 1 },
      ],
      {
        limits: { fileSize: 15 * 1024 * 1024 * 1024 },
        storage: diskStorage({
          destination: (req, file, cb) => {
            const dir = './uploads';
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const prefix =
              file.fieldname === 'postprocess'
                ? 'temp-detect-postprocess-'
                : 'temp-detect-';
            cb(null, prefix + uniqueSuffix + extname(file.originalname));
          },
        }),
      },
    ),
  )
  async detectSchema(
    @UploadedFiles()
    files?: {
      model?: Express.Multer.File[];
      postprocess?: Express.Multer.File[];
    },
    @Body()
    body?: {
      modelType?: string;
      originalFilename?: string;
      postprocessCode?: string;
    },
  ): Promise<Record<string, unknown>> {
    const file = files?.model?.[0];
    if (!file) {
      throw new BadRequestException('No model file uploaded.');
    }

    const tempFilePath = file.path;
    const scriptPath = join(
      process.cwd(),
      'src',
      'shared',
      'utils',
      'detect_schema.py',
    );

    let postprocessPath = files?.postprocess?.[0]?.path;
    let inlinePostprocessPath: string | undefined;
    if (!postprocessPath && body?.postprocessCode?.trim()) {
      inlinePostprocessPath = join(
        process.cwd(),
        'uploads',
        `temp-detect-postprocess-inline-${Date.now()}-${Math.round(Math.random() * 1e9)}.py`,
      );
      fs.writeFileSync(inlinePostprocessPath, body.postprocessCode);
      postprocessPath = inlinePostprocessPath;
    }

    try {
      let command = `python "${scriptPath}" "${tempFilePath}"`;
      if (body?.originalFilename) {
        command += ` --filename "${body.originalFilename}"`;
      }
      if (body?.modelType) {
        command += ` --model-type "${body.modelType}"`;
      }
      if (postprocessPath) {
        command += ` --postprocess "${postprocessPath}"`;
      }
      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        this.logger.warn(`Python stderr output: ${stderr}`);
      }

      const parsed = JSON.parse(stdout) as unknown;
      const result = parsed as Record<string, unknown>;

      if (result.error) {
        const errorDetail =
          typeof result.error === 'string'
            ? result.error
            : JSON.stringify(result.error);
        throw new BadRequestException(errorDetail);
      }

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Schema detection failed: ${message}`);
      throw new BadRequestException(`Schema detection failed: ${message}`);
    } finally {
      for (const path of [
        tempFilePath,
        files?.postprocess?.[0]?.path,
        inlinePostprocessPath,
      ]) {
        if (!path) continue;
        try {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        } catch (cleanupError: unknown) {
          this.logger.error(
            `Failed to clean up temp file ${path}: ${
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError)
            }`,
          );
        }
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/build')
  async startBuild(
    @Param('versionId') versionId: string,
    @Body()
    body: {
      examplePayload?: string;
      expectedResult?: string;
      classLabels?: string | Record<string, any>;
    },
  ): Promise<Record<string, unknown>> {
    const version = await this.modelsService.startBuild(
      versionId,
      body.examplePayload,
      body.expectedResult,
      body.classLabels,
    );
    return version as unknown as Record<string, unknown>;
  }

  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/confirm-schema')
  async confirmSchema(
    @Param('versionId') versionId: string,
    @Body() body: ConfirmSchemaDto,
    @Request() req: RequestWithUser,
  ): Promise<ModelVersion> {
    return this.modelsService.confirmSchemaDetection(
      versionId,
      req.user.id,
      body.examplePayload,
      body.expectedResult,
    );
  }
}
