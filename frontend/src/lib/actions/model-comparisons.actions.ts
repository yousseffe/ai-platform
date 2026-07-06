"use server";

import * as comparisonsService from "@/lib/services/model-comparisons.service";
import {
  ComparableModel,
  ComparisonSettings,
  ModelComparisonHistoryItem,
  ModelComparisonSession,
} from "@/types";

export async function getComparableModels(params?: {
  q?: string;
  provider?: string;
  category?: string;
  modality?: string;
  status?: string;
  sort?: "popularity" | "price_asc" | "price_desc" | "rating";
}): Promise<ComparableModel[]> {
  try {
    return await comparisonsService.listComparableModels(params);
  } catch (error) {
    console.error("getComparableModels error:", error);
    return [];
  }
}

export async function runComparisonAction(body: {
  modelIds: string[];
  prompt: string;
  requestBody?: Record<string, unknown>;
  settings?: ComparisonSettings;
  title?: string;
}): Promise<
  { success: true; data: ModelComparisonSession } | { success: false; error: string }
> {
  try {
    const data = await comparisonsService.runModelComparison(body);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to run comparison",
    };
  }
}

export async function getComparisonHistory(): Promise<ModelComparisonHistoryItem[]> {
  try {
    return await comparisonsService.listModelComparisonHistory();
  } catch (error) {
    console.error("getComparisonHistory error:", error);
    return [];
  }
}

export async function getComparisonDetails(
  id: string,
): Promise<ModelComparisonSession | null> {
  try {
    return await comparisonsService.getModelComparison(id);
  } catch (error) {
    console.error(`getComparisonDetails error for ${id}:`, error);
    return null;
  }
}

export async function saveComparisonTitle(
  id: string,
  title: string,
): Promise<
  { success: true; data: ModelComparisonSession } | { success: false; error: string }
> {
  try {
    const data = await comparisonsService.updateModelComparison(id, { title });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save comparison",
    };
  }
}

export async function rerunComparisonAction(
  id: string,
): Promise<
  { success: true; data: ModelComparisonSession } | { success: false; error: string }
> {
  try {
    const data = await comparisonsService.rerunModelComparison(id);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rerun comparison",
    };
  }
}

export async function deleteComparisonAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await comparisonsService.deleteModelComparison(id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete comparison",
    };
  }
}
