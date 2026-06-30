/**
 * Defines how a model's usage is measured and billed to the consumer.
 */
export enum BillingUnit {
  /** Per 1M tokens — input and output counted at separate rates. Used for LLM_GGUF. */
  PER_TOKEN = 'PER_TOKEN',
  /** Per image generated or processed. Used for DIFFUSION and VISION models. */
  PER_IMAGE = 'PER_IMAGE',
  /** Per individual inference call. Used for TABULAR and NLP models. */
  PER_PREDICTION = 'PER_PREDICTION',
  /** Per API request at a provider-defined flat rate. Used for custom models. */
  PER_REQUEST = 'PER_REQUEST',
}

/**
 * Derives the billing unit for a model deterministically from its ModelType string.
 *
 * @param modelType - The model type string (e.g. 'LLM_GGUF', 'DIFFUSION').
 * @returns The corresponding {@link BillingUnit}.
 */
export function getBillingUnit(modelType: string): BillingUnit {
  switch (modelType) {
    case 'LLM_GGUF':
      return BillingUnit.PER_TOKEN;
    case 'DIFFUSION':
    case 'VISION':
      return BillingUnit.PER_IMAGE;
    case 'TABULAR':
    case 'NLP':
      return BillingUnit.PER_PREDICTION;
    default:
      return BillingUnit.PER_REQUEST;
  }
}
