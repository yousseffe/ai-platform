import { Global, Module } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';

/**
 * Global module providing the OpenSearch client wrapper to all feature modules
 * without requiring explicit imports in each consuming module.
 */
@Global()
@Module({
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
