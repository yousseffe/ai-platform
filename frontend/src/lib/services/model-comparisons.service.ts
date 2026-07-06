import { smartFetch } from "@/lib/utils/smart-fetch";
import {
  ComparableModel,
  ComparisonSettings,
  ModelComparisonHistoryItem,
  ModelComparisonSession,
} from "@/types";

export async function listComparableModels(params?: {
  q?: string;
  provider?: string;
  category?: string;
  modality?: string;
  status?: string;
  sort?: "popularity" | "price_asc" | "price_desc" | "rating";
}): Promise<ComparableModel[]> {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.provider) query.set("provider", params.provider);
  if (params?.category) query.set("category", params.category);
  if (params?.modality) query.set("modality", params.modality);
  if (params?.status) query.set("status", params.status);
  if (params?.sort) query.set("sort", params.sort);

  return smartFetch<ComparableModel[]>(
    `/model-comparisons/comparable-models${query.size ? `?${query.toString()}` : ""}`,
    {
      cache: "no-store",
    },
  );
}

export async function runModelComparison(body: {
  modelIds: string[];
  prompt: string;
  requestBody?: Record<string, unknown>;
  settings?: ComparisonSettings;
  title?: string;
}): Promise<ModelComparisonSession> {
  return smartFetch<ModelComparisonSession>("/model-comparisons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listModelComparisonHistory(): Promise<ModelComparisonHistoryItem[]> {
  return smartFetch<ModelComparisonHistoryItem[]>("/model-comparisons", {
    cache: "no-store",
  });
}

export async function getModelComparison(id: string): Promise<ModelComparisonSession> {
  return smartFetch<ModelComparisonSession>(`/model-comparisons/${id}`, {
    cache: "no-store",
  });
}

export async function updateModelComparison(
  id: string,
  body: { title: string },
): Promise<ModelComparisonSession> {
  return smartFetch<ModelComparisonSession>(`/model-comparisons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function rerunModelComparison(id: string): Promise<ModelComparisonSession> {
  return smartFetch<ModelComparisonSession>(`/model-comparisons/${id}/rerun`, {
    method: "POST",
  });
}

export async function deleteModelComparison(id: string): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(`/model-comparisons/${id}`, {
    method: "DELETE",
  });
}
