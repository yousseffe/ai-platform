import { smartFetch } from "@/lib/utils/smart-fetch";
import type { SearchResult, SearchParams } from "@/types";

/**
 * Executes a smart full-text search against the backend OpenSearch-powered model catalog.
 * Supports fuzzy matching, multi-field relevance ranking, exact enum filters,
 * and returns faceted aggregation counts for sidebar filter UIs.
 *
 * @param params - Search parameters including query text, enum filters, and pagination.
 * @returns A promise resolving to ranked search results with facets and pagination metadata.
 * @throws {Error} Throws if the backend request fails.
 */
export async function searchModels(params: SearchParams): Promise<SearchResult> {
  const queryString = buildQueryString(params);
  return smartFetch<SearchResult>(`/models/search${queryString}`);
}

/**
 * Serializes a SearchParams object into a URL query string.
 * Omits undefined or empty-string values to keep URLs clean.
 *
 * @param params - The search parameters to serialize.
 * @returns A URL query string prefixed with "?" or an empty string if no params.
 */
function buildQueryString(params: SearchParams): string {
  const entries: string[] = [];

  if (params.q && params.q.trim()) {
    entries.push(`q=${encodeURIComponent(params.q.trim())}`);
  }
  if (params.type) {
    entries.push(`type=${encodeURIComponent(params.type)}`);
  }
  if (params.framework) {
    entries.push(`framework=${encodeURIComponent(params.framework)}`);
  }
  if (params.taskType) {
    entries.push(`taskType=${encodeURIComponent(params.taskType)}`);
  }
  if (params.page && params.page > 1) {
    entries.push(`page=${params.page}`);
  }
  if (params.limit && params.limit !== 20) {
    entries.push(`limit=${params.limit}`);
  }

  return entries.length > 0 ? `?${entries.join('&')}` : '';
}
