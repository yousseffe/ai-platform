export interface ModelDocument {
  id: string;
  name: string;
  description: string;
  type: string;
  taskType: string;
  framework: string;
  isPublic: boolean;
  marketplaceVerified: boolean;
  organizationName: string | null;
  publisherEmail: string;
  versionCount: number;
  hasLiveDeployment: boolean;
  createdAt: string;
  averageRating: number;
  reviewCount: number;
}

export interface FacetBucket {
  key: string;
  doc_count: number;
}

export interface AggregationResult {
  buckets: FacetBucket[];
}

export interface OpenSearchHitsWrapper {
  total: { value: number };
  hits: Array<{ _source: ModelDocument }>;
}

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

export interface SearchParams {
  q?: string;
  type?: string;
  framework?: string;
  taskType?: string;
  page?: number;
  limit?: number;
}
