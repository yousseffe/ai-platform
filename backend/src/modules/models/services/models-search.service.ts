import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenSearchService } from '../../../shared/opensearch/opensearch.service';
import { Model } from '../entities/model.entity';

/** Shape of a single model document stored in OpenSearch. */
interface ModelDocument {
  id: string;
  name: string;
  description: string;
  type: string;
  taskType: string;
  framework: string;
  isPublic: boolean;
  publisherEmail: string;
  versionCount: number;
  hasLiveDeployment: boolean;
  createdAt: string;
}

/** Facet bucket returned by OpenSearch aggregations. */
interface FacetBucket {
  key: string;
  doc_count: number;
}

/** Aggregation node in an OpenSearch response. */
interface AggregationResult {
  buckets: FacetBucket[];
}

/** Typed structure of the OpenSearch search response body. */
interface OpenSearchHitsWrapper {
  total: { value: number };
  hits: Array<{ _source: ModelDocument }>;
}

/** Public search result shape returned to controllers. */
export interface SearchResult {
  hits: ModelDocument[];
  total: number;
  page: number;
  limit: number;
  facets: {
    types: FacetBucket[];
    frameworks: FacetBucket[];
    taskTypes: FacetBucket[];
  };
}

/** Parameters accepted by the search method. */
export interface SearchParams {
  q?: string;
  type?: string;
  framework?: string;
  taskType?: string;
  page?: number;
  limit?: number;
}

const INDEX_NAME = process.env.OPENSEARCH_INDEX || 'mlhub-models';

/**
 * Domain service encapsulating all OpenSearch operations for the models catalog.
 * Manages index creation, document indexing/deletion, and smart full-text search
 * with fuzzy matching, field boosting, and faceted aggregation.
 */
@Injectable()
export class ModelsSearchService implements OnModuleInit {
  private readonly logger = new Logger(ModelsSearchService.name);

  constructor(private readonly openSearchService: OpenSearchService) {}

  /**
   * Ensures the OpenSearch index with its mapping exists on module startup.
   * Called automatically by NestJS lifecycle hooks.
   */
  async onModuleInit(): Promise<void> {
    await this.ensureIndexExists();
  }

  /**
   * Creates the mlhub-models index with optimized field mappings if it does not exist.
   * Uses a custom analyzer for improved tokenization and search accuracy.
   */
  private async ensureIndexExists(): Promise<void> {
    try {
      const exists = await this.openSearchService.indexExists(INDEX_NAME);
      if (exists) return;

      await this.openSearchService.createIndex(INDEX_NAME, {
        settings: {
          analysis: {
            analyzer: {
              mlhub_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'stop'],
              },
            },
          },
        },
        mappings: {
          properties: {
            id:                { type: 'keyword' },
            name:              { type: 'text', analyzer: 'mlhub_analyzer', fields: { keyword: { type: 'keyword' } } },
            description:       { type: 'text', analyzer: 'mlhub_analyzer' },
            type:              { type: 'keyword' },
            taskType:          { type: 'keyword' },
            framework:         { type: 'keyword' },
            isPublic:          { type: 'boolean' },
            publisherEmail:    { type: 'keyword' },
            versionCount:      { type: 'integer' },
            hasLiveDeployment: { type: 'boolean' },
            createdAt:         { type: 'date' },
          },
        },
      });

      this.logger.log(`Created OpenSearch index: ${INDEX_NAME}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not ensure index exists: ${message}`);
    }
  }

  /**
   * Converts a Model entity into a flat document and upserts it into OpenSearch.
   * Should be called after model creation or metadata updates.
   *
   * @param model - The full Model entity with relations loaded.
   */
  async indexModel(model: Model): Promise<void> {
    try {
      const doc = this.buildDocument(model);
      await this.openSearchService.index(INDEX_NAME, model.id, doc as unknown as Record<string, unknown>);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to index model ${model.id}: ${message}`);
    }
  }

  /**
   * Removes a model document from the OpenSearch index.
   * Should be called when a model is deleted from the database.
   *
   * @param modelId - The UUID of the model to remove from the index.
   */
  async deleteFromIndex(modelId: string): Promise<void> {
    await this.openSearchService.delete(INDEX_NAME, modelId);
  }

  /**
   * Bulk-indexes multiple models at once (used by the seed script).
   *
   * @param models - Array of Model entities to index.
   */
  async bulkIndex(models: Model[]): Promise<void> {
    const documents = models.map((model) => ({
      id: model.id,
      body: this.buildDocument(model) as unknown as Record<string, unknown>,
    }));
    await this.openSearchService.bulkIndex(INDEX_NAME, documents);
    this.logger.log(`Bulk indexed ${models.length} models into ${INDEX_NAME}`);
  }

  /**
   * Executes a smart full-text search query against the OpenSearch index.
   * Supports fuzzy matching, multi-field boosting, exact enum filters,
   * and returns aggregated facet counts for sidebar filtering.
   *
   * @param params - The search parameters including query, filters, and pagination.
   * @returns A promise resolving to the ranked search results with facets.
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const {
      q,
      type,
      framework,
      taskType,
      page = 1,
      limit = 20,
    } = params;

    const from = (page - 1) * limit;

    // Build the must clause — only added when a query string is provided
    const mustClauses: Record<string, unknown>[] = [];
    if (q && q.trim()) {
      mustClauses.push({
        multi_match: {
          query: q.trim(),
          fields: [
            'name^4',
            'framework^2.5',
            'type^2',
            'taskType^2',
            'description^1',
          ],
          fuzziness: 'AUTO',
          operator: 'or',
          type: 'best_fields',
          tie_breaker: 0.3,
        },
      });
    }

    // Exact enum filters applied via filter context (no scoring cost)
    const filterClauses: Record<string, unknown>[] = [
      { term: { isPublic: true } },
    ];
    if (type) filterClauses.push({ term: { type } });
    if (framework) filterClauses.push({ term: { framework } });
    if (taskType) filterClauses.push({ term: { taskType } });

    const queryDsl: Record<string, unknown> = {
      query: {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: filterClauses,
        },
      },
      // Faceted aggregations — always computed on the unfiltered enum axes
      aggs: {
        by_type: {
          terms: { field: 'type', size: 10 },
        },
        by_framework: {
          terms: { field: 'framework', size: 10 },
        },
        by_taskType: {
          terms: { field: 'taskType', size: 15 },
        },
      },
      from,
      size: limit,
      // Boost recently added models slightly when relevance scores are tied
      sort: q
        ? ['_score', { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
    };

    try {
      const raw = await this.openSearchService.search(INDEX_NAME, queryDsl);
      return this.parseSearchResponse(raw, page, limit);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenSearch query failed: ${message}`);
      // Gracefully degrade — return empty results
      return { hits: [], total: 0, page, limit, facets: { types: [], frameworks: [], taskTypes: [] } };
    }
  }

  /**
   * Converts a Model entity into a flat OpenSearch document object.
   *
   * @param model - The Model entity with optional relations.
   * @returns A flat ModelDocument ready for indexing.
   */
  private buildDocument(model: Model): ModelDocument {
    const hasLiveDeployment = model.versions?.some((v) =>
      v.deployments?.some((d) => d.status === 'running'),
    ) ?? false;

    return {
      id: model.id,
      name: model.name,
      description: model.description ?? '',
      type: model.type ?? '',
      taskType: model.taskType ?? '',
      framework: model.framework ?? '',
      isPublic: model.isPublic,
      publisherEmail: model.user?.email ?? '',
      versionCount: model.versions?.length ?? 0,
      hasLiveDeployment,
      createdAt: model.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  /**
   * Parses the raw OpenSearch response into the typed SearchResult shape.
   *
   * @param raw - The raw OpenSearch response body.
   * @param page - The current page number.
   * @param limit - The page size.
   * @returns A typed SearchResult object.
   */
  private parseSearchResponse(
    raw: Record<string, unknown>,
    page: number,
    limit: number,
  ): SearchResult {
    const hitsWrapper = raw['hits'] as OpenSearchHitsWrapper;
    const aggs = raw['aggregations'] as Record<string, AggregationResult> | undefined;

    const hits: ModelDocument[] = hitsWrapper?.hits?.map((h) => h._source) ?? [];
    const total: number = hitsWrapper?.total?.value ?? 0;

    return {
      hits,
      total,
      page,
      limit,
      facets: {
        types:      aggs?.['by_type']?.buckets      ?? [],
        frameworks: aggs?.['by_framework']?.buckets ?? [],
        taskTypes:  aggs?.['by_taskType']?.buckets  ?? [],
      },
    };
  }
}
