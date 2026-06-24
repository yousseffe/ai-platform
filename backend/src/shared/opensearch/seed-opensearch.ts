/**
 * One-time seed script to bulk-index all existing public models from Postgres into OpenSearch.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/shared/opensearch/seed-opensearch.ts
 *
 * This script connects to the database via TypeORM, loads all public models with their
 * relations, and pushes them into the OpenSearch index using the ModelsSearchService.
 * Run this once after initial OpenSearch setup, or whenever the index needs to be rebuilt.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { Client } from '@opensearch-project/opensearch';
import { Model } from '../../modules/models/entities/model.entity';
import { ModelVersion } from '../../modules/models/entities/model-version.entity';
import { User } from '../../modules/users/entities/user.entity';
import { AuditLog } from '../../modules/users/entities/audit-log.entity';
import { Deployment } from '../../modules/deployments/entities/deployment.entity';
import { Wallet } from '../../modules/wallets/entities/wallet.entity';
import { Transaction } from '../../modules/wallets/entities/transaction.entity';
import { ProcessedWebhook } from '../../modules/wallets/entities/processed-webhook.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { OrgMember } from '../../modules/organizations/entities/org-member.entity';
import { VerificationCode } from '../../modules/auth/entities/verification-code.entity';

const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX || 'mlhub-models';
const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200';

async function seed(): Promise<void> {
  // --- Connect to Postgres ---
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'aidb',
    entities: [
      User,
      AuditLog,
      Model,
      ModelVersion,
      Deployment,
      Wallet,
      Transaction,
      ProcessedWebhook,
      Organization,
      OrgMember,
      VerificationCode,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✓ Connected to Postgres');

  // --- Connect to OpenSearch ---
  const client = new Client({
    node: OPENSEARCH_URL,
    auth: {
      username: process.env.OPENSEARCH_USERNAME || 'admin',
      password: process.env.OPENSEARCH_PASSWORD || 'admin',
    },
    ssl: { rejectUnauthorized: false },
  });

  // --- Delete and recreate the index ---
  try {
    await client.indices.delete({ index: OPENSEARCH_INDEX });
    console.log(`✓ Deleted existing index: ${OPENSEARCH_INDEX}`);
  } catch {
    console.log(
      `  Index ${OPENSEARCH_INDEX} did not exist yet — creating fresh.`,
    );
  }

  await client.indices.create({
    index: OPENSEARCH_INDEX,
    body: {
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
          publisherEmail: { type: 'keyword' },
          versionCount: { type: 'integer' },
          hasLiveDeployment: { type: 'boolean' },
          createdAt: { type: 'date' },
        },
      },
    },
  });
  console.log(`✓ Created index: ${OPENSEARCH_INDEX}`);

  // --- Load all public models from Postgres ---
  const modelRepository = dataSource.getRepository(Model);
  const models = await modelRepository.find({
    where: { isPublic: true },
    relations: ['versions', 'versions.deployments', 'user'],
  });

  console.log(`  Found ${models.length} public models to index`);

  if (models.length === 0) {
    console.log('  Nothing to index. Exiting.');
    await dataSource.destroy();
    return;
  }

  // --- Build bulk body ---
  const bulkBody = models.flatMap((model) => {
    const hasLiveDeployment =
      model.versions?.some((v) =>
        v.deployments?.some((d) => d.status === 'running'),
      ) ?? false;

    const doc = {
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

    return [{ index: { _index: OPENSEARCH_INDEX, _id: model.id } }, doc];
  });

  const response = await client.bulk({ body: bulkBody, refresh: 'wait_for' });

  if (response.body.errors) {
    console.error(
      '  Some documents failed to index:',
      JSON.stringify(response.body.items, null, 2),
    );
  } else {
    console.log(
      `✓ Successfully indexed ${models.length} models into ${OPENSEARCH_INDEX}`,
    );
  }

  await dataSource.destroy();
  console.log('✓ Done. Database connection closed.');
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
