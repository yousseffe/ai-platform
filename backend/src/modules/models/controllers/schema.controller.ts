import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Logger,
  Body,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ModelsService } from '../services/models.service';

const execPromise = promisify(exec);

/**
 * Controller exposing endpoints for model schema detection and verification.
 */
@Controller('models')
export class SchemaController {
  private readonly logger = new Logger(SchemaController.name);

  constructor(private readonly modelsService: ModelsService) {}

  /**
   * Accepts a model file, writes it temporarily, executes detect_schema.py to inspect the model features/task,
   * and returns the auto-generated JSON schema and sample templates.
   *
   * @param file - The model file binary uploaded via Multer.
   * @returns A promise resolving to the schema detection result object.
   * @throws {BadRequestException} If no file is provided or if schema generation execution fails.
   */
  @UseGuards(JwtAuthGuard)
  @Post('detect-schema')
  @UseInterceptors(
    FileInterceptor('model', {
      limits: { fileSize: 15 * 1024 * 1024 * 1024 }, // 15GB limit for schema detection
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, 'temp-detect-' + uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async detectSchema(
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: { modelType?: string; originalFilename?: string },
  ): Promise<Record<string, unknown>> {
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

    try {
      // Execute the python schema generator
      const command = `python3 "${scriptPath}" "${tempFilePath}"`;
      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        this.logger.warn(`Python stderr output: ${stderr}`);
      }

      // Parse the JSON result
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
      // Ensure the temporary file is deleted
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError: unknown) {
        this.logger.error(
          `Failed to clean up temp model file ${tempFilePath}: ${
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError)
          }`,
        );
      }
    }
  }

  /**
   * Finalizes the schema configuration and dispatches the build process for a model version.
   *
   * @param versionId - The UUID of the model version to build.
   * @param body - JSON request body containing examplePayload and expectedResult strings.
   * @returns A promise resolving to the updated ModelVersion.
   */
  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/build')
  async startBuild(
    @Param('versionId') versionId: string,
    @Body() body: { examplePayload?: string; expectedResult?: string },
  ): Promise<Record<string, unknown>> {
    const version = await this.modelsService.startBuild(
      versionId,
      body.examplePayload,
      body.expectedResult,
    );
    return version as unknown as Record<string, unknown>;
  }
}
