import { Controller, Get, Query } from '@nestjs/common';
import { ModelsSearchService } from '../services/models-search.service';
import { SearchResult } from '../interfaces/search.interface';
import { SearchModelsDto } from '../dto/search-models.dto';

@Controller('models/search')
export class SearchController {
  constructor(private readonly modelsSearchService: ModelsSearchService) {}

  @Get()
  async search(@Query() query: SearchModelsDto): Promise<SearchResult> {
    return this.modelsSearchService.search({
      q: query.q,
      type: query.type,
      framework: query.framework,
      taskType: query.taskType,
      page: query.page,
      limit: query.limit,
    });
  }
}
