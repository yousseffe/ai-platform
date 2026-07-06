import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

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

      ...(username && password
        ? { auth: { username, password }, ssl: { rejectUnauthorized: false } }
        : {}),
    });
  }

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

  async indexExists(index: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index });
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  async createIndex(
    index: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await this.client.indices.create({ index, body });
  }

  async index(
    index: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await this.client.index({ index, id, body, refresh: 'wait_for' });
  }

  async delete(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({ index, id, refresh: 'wait_for' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to delete document ${id} from ${index}: ${message}`,
      );
    }
  }

  async search(
    index: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.client.search({ index, body });
    return response.body;
  }

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
