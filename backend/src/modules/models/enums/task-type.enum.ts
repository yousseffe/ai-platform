/**
 * Enumeration representing the specific machine learning task type.
 */
export enum TaskType {
  /**
   * Predict discrete class labels.
   */
  CLASSIFICATION = 'CLASSIFICATION',
  /**
   * Predict continuous numerical values.
   */
  REGRESSION = 'REGRESSION',
  /**
   * Generate text or other content.
   */
  GENERATION = 'GENERATION',
  /**
   * Identify and locate objects within an image.
   */
  OBJECT_DETECTION = 'OBJECT_DETECTION',
  /**
   * Partition an image into multiple segments.
   */
  SEGMENTATION = 'SEGMENTATION',
  /**
   * Convert inputs into vector embeddings.
   */
  EMBEDDING = 'EMBEDDING',
  /**
   * Chat/Conversational AI.
   */
  CHAT = 'CHAT',
  /**
   * Catch-all for other unsupported or custom tasks.
   */
  OTHER = 'OTHER',
}
