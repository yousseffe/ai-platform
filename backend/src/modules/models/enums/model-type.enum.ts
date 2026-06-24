/**
 * Enumeration representing the core type of machine learning model.
 */
export enum ModelType {
  /**
   * Structured table data models (e.g. classification, regression).
   */
  TABULAR = 'TABULAR',
  /**
   * Natural Language Processing text-based models.
   */
  NLP = 'NLP',
  /**
   * Computer Vision image processing models.
   */
  VISION = 'VISION',
  /**
   * Large Language Models in GGUF format.
   */
  LLM_GGUF = 'LLM_GGUF',
  /**
   * Generative Image/Diffusion models.
   */
  DIFFUSION = 'DIFFUSION',
}
