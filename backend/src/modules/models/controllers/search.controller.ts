import { Controller, Get, Query } from '@nestjs/common';
import { ModelsSearchService, SearchResult } from '../services/models-search.service';
import { SearchModelsDto } from '../dto/search-models.dto';

/**
 * Public controller exposing the smart OpenSearch-backed model catalog search endpoint.
 * No authentication guard required — only public models are returned.
 */
@Controller('models/search')
export class SearchController {
  constructor(private readonly modelsSearchService: ModelsSearchService) {}

  /**
   * Executes a smart full-text search across the public model catalog.
   * Supports fuzzy matching, multi-field relevance ranking, exact enum filters,
   * and returns faceted aggregation counts for sidebar filter UIs.
   *
   * @param query - Validated search parameters from URL query string.
   * @returns A promise resolving to ranked search hits with pagination and facets.
   *
   * @example GET /models/search?q=xgboost&type=TABULAR&page=1&limit=20
   */
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
