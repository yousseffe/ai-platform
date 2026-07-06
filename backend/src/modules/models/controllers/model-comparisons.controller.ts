import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceInterceptor } from '../../auth/guards/workspace.interceptor';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ModelComparisonsService } from '../services/model-comparisons.service';
import {
  ComparableModelResponseDto,
  ComparisonHistoryItemResponseDto,
  ComparisonSessionResponseDto,
} from '../dto/model-comparisons-response.dto';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  };
  workspaceId?: string;
  workspaceType?: OwnerType;
  headers?: Record<string, unknown>;
  ip?: string;
  socket?: Record<string, unknown>;
}

@Controller('model-comparisons')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceInterceptor)
export class ModelComparisonsController {
  constructor(
    private readonly modelComparisonsService: ModelComparisonsService,
  ) {}

  @Get('comparable-models')
  async listComparableModels(
    @Query('q') q?: string,
    @Query('provider') provider?: string,
    @Query('category') category?: string,
    @Query('modality') modality?: string,
    @Query('status') status?: string,
    @Query('sort')
    sort?: 'popularity' | 'price_asc' | 'price_desc' | 'rating',
  ): Promise<ComparableModelResponseDto[]> {
    return this.modelComparisonsService.listComparableModels({
      q,
      provider,
      category,
      modality,
      status,
      sort,
    });
  }

  @Post()
  async runComparison(
    @Body()
    body: {
      modelIds: string[];
      prompt: string;
      requestBody?: Record<string, unknown>;
      settings?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        stream?: boolean;
        jsonMode?: boolean;
      };
      title?: string;
    },
    @Request() req: RequestWithUser,
  ): Promise<ComparisonSessionResponseDto> {
    return this.modelComparisonsService.runComparison(body, req);
  }

  @Get()
  async listHistory(
    @Request() req: RequestWithUser,
  ): Promise<ComparisonHistoryItemResponseDto[]> {
    return this.modelComparisonsService.listHistory(req);
  }

  @Get(':id')
  async getComparison(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<ComparisonSessionResponseDto> {
    return this.modelComparisonsService.getComparisonDetails(id, req);
  }

  @Patch(':id')
  async updateComparison(
    @Param('id') id: string,
    @Body() body: { title: string },
    @Request() req: RequestWithUser,
  ): Promise<ComparisonSessionResponseDto> {
    return this.modelComparisonsService.updateComparison(id, body.title, req);
  }

  @Post(':id/rerun')
  async rerunComparison(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<ComparisonSessionResponseDto> {
    return this.modelComparisonsService.rerunComparison(id, req);
  }

  @Delete(':id')
  async deleteComparison(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelComparisonsService.deleteComparison(id, req);
  }
}
