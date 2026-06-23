import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

/**
 * Thin wrapper around the OpenSearch client.
 * Provides typed index, delete, search, and exists operations
 * used by domain-specific search services.
 */
@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly client: Client;

  constructor() {
    const node = process.env.OPENSEARCH_URL || 'http://localhost:9200';
    const username = process.env.OPENSEARCH_USERNAME;
    const password = process.env.OPENSEARCH_PASSWORD;

    this.client = new Client({
      node,
      // Only attach auth if credentials are explicitly provided in env
      ...(username && password
        ? { auth: { username, password }, ssl: { rejectUnauthorized: false } }
        : {}),
    });
  }

  /**
   * Validates the connection to the OpenSearch cluster on application startup.
   * Logs a warning (does not crash) if OpenSearch is unreachable.
   */
  async onModuleInit(): Promise<void> {
    try {
      const info = await this.client.info();
      this.logger.log(
        `Connected to OpenSearch cluster: ${(info.body as Record<string, unknown>)['cluster_name'] as string}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `OpenSearch connection check failed — search features may be degraded: ${message}`,
      );
    }
  }

  /**
   * Checks whether a given index already exists in OpenSearch.
   *
   * @param index - The index name to check.
   * @returns A promise resolving to true if the index exists.
   */
  async indexExists(index: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index });
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  /**
   * Creates an index with the provided mapping settings.
   *
   * @param index - The index name to create.
   * @param body - The mapping and settings body object.
   */
  async createIndex(
    index: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await this.client.indices.create({ index, body });
  }

  /**
   * Upserts (indexes or updates) a document into a given index.
   *
   * @param index - The target index name.
   * @param id - The document ID (used for upsert).
   * @param body - The document body to index.
   */
  async index(
    index: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await this.client.index({ index, id, body, refresh: 'wait_for' });
  }

  /**
   * Removes a document from a given index by ID.
   *
   * @param index - The target index name.
   * @param id - The document ID to remove.
   */
  async delete(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({ index, id, refresh: 'wait_for' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete document ${id} from ${index}: ${message}`);
    }
  }

  /**
   * Executes a search query against a given index.
   *
   * @param index - The target index name.
   * @param body - The full OpenSearch query DSL body.
   * @returns The raw OpenSearch response body.
   */
  async search(
    index: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.client.search({ index, body });
    return response.body as Record<string, unknown>;
  }

  /**
   * Bulk indexes multiple documents in a single API call.
   *
   * @param index - The target index name.
   * @param documents - Array of objects with `id` and `body` to index.
   */
  async bulkIndex(
    index: string,
    documents: Array<{ id: string; body: Record<string, unknown> }>,
  ): Promise<void> {
    if (documents.length === 0) return;

    const body = documents.flatMap((doc) => [
      { index: { _index: index, _id: doc.id } },
      doc.body,
    ]);

    await this.client.bulk({ body, refresh: 'wait_for' });
  }
}
