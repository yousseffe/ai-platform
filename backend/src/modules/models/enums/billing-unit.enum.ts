export enum BillingUnit {
  PER_TOKEN = 'PER_TOKEN',

  PER_IMAGE = 'PER_IMAGE',

  PER_PREDICTION = 'PER_PREDICTION',

  PER_REQUEST = 'PER_REQUEST',
}

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
