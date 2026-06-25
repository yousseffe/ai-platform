/**
 * Enumeration representing the type of API Key.
 */
export enum ApiKeyType {
  /**
   * Production-grade active live key linked to a specific model.
   */
  LIVE = 'LIVE',
  /**
   * Free playground-only key used for sandbox interactive executions.
   */
  TRIAL = 'TRIAL',
}
