import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenSearchService } from '../../../shared/opensearch/opensearch.service';
import { Model } from '../entities/model.entity';
import {
  ModelDocument,
  AggregationResult,
  OpenSearchHitsWrapper,
  SearchResult,
  SearchParams,
} from '../interfaces/search.interface';

const INDEX_NAME = process.env.OPENSEARCH_INDEX || 'mlhub-models';

@Injectable()
export class ModelsSearchService implements OnModuleInit {
  private readonly logger = new Logger(ModelsSearchService.name);

  constructor(private readonly openSearchService: OpenSearchService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureIndexExists();
  }

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
            id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'mlhub_analyzer',
              fields: { keyword: { type: 'keyword' } },
            },
            description: { type: 'text', analyzer: 'mlhub_analyzer' },
            type: { type: 'keyword' },
            taskType: { type: 'keyword' },
            framework: { type: 'keyword' },
            isPublic: { type: 'boolean' },
            marketplaceVerified: { type: 'boolean' },
            organizationName: { type: 'keyword' },
            publisherEmail: { type: 'keyword' },
            versionCount: { type: 'integer' },
            hasLiveDeployment: { type: 'boolean' },
            createdAt: { type: 'date' },
            averageRating: { type: 'float' },
            reviewCount: { type: 'integer' },
          },
        },
      });

      this.logger.log(`Created OpenSearch index: ${INDEX_NAME}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not ensure index exists: ${message}`);
    }
  }

  async indexModel(model: Model): Promise<void> {
    try {
      await this.ensureIndexExists();
      const doc = this.buildDocument(model);
      await this.openSearchService.index(
        INDEX_NAME,
        model.id,
        doc as unknown as Record<string, unknown>,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to index model ${model.id}: ${message}`);
    }
  }

  async deleteFromIndex(modelId: string): Promise<void> {
    await this.openSearchService.delete(INDEX_NAME, modelId);
  }

  async bulkIndex(models: Model[]): Promise<void> {
    await this.ensureIndexExists();
    const documents = models.map((model) => ({
      id: model.id,
      body: this.buildDocument(model) as unknown as Record<string, unknown>,
    }));
    await this.openSearchService.bulkIndex(INDEX_NAME, documents);
    this.logger.log(`Bulk indexed ${models.length} models into ${INDEX_NAME}`);
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const { q, type, framework, taskType, page = 1, limit = 20 } = params;

    const from = (page - 1) * limit;

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

      sort: q ? ['_score', { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
    };

    try {
      const raw = await this.openSearchService.search(INDEX_NAME, queryDsl);
      return this.parseSearchResponse(raw, page, limit);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenSearch query failed: ${message}`);

      return {
        hits: [],
        total: 0,
        page,
        limit,
        facets: { types: [], frameworks: [], taskTypes: [] },
      };
    }
  }

  private buildDocument(model: Model): ModelDocument {
    const hasLiveDeployment =
      model.versions?.some((v) =>
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
      marketplaceVerified: model.marketplaceVerified,
      organizationName: model.organization?.name ?? null,
      publisherEmail: model.user?.email ?? '',
      versionCount: model.versions?.length ?? 0,
      hasLiveDeployment,
      createdAt: model.createdAt?.toISOString?.() ?? new Date().toISOString(),
      averageRating: Number(model.averageRating ?? 0),
      reviewCount: Number(model.reviewCount ?? 0),
    };
  }

  private parseSearchResponse(
    raw: Record<string, unknown>,
    page: number,
    limit: number,
  ): SearchResult {
    const hitsWrapper = raw['hits'] as OpenSearchHitsWrapper;
    const aggs = raw['aggregations'] as
      | Record<string, AggregationResult>
      | undefined;

    const hits: ModelDocument[] =
      hitsWrapper?.hits?.map((h) => h._source) ?? [];
    const total: number = hitsWrapper?.total?.value ?? 0;

    return {
      hits,
      total,
      page,
      limit,
      facets: {
        types: aggs?.['by_type']?.buckets ?? [],
        frameworks: aggs?.['by_framework']?.buckets ?? [],
        taskTypes: aggs?.['by_taskType']?.buckets ?? [],
      },
    };
  }
}
