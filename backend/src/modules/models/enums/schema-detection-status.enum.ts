/**
 * Trust/review lifecycle for a model version's example payload and expected
 * result (its sample request/response schema).
 */
export enum SchemaDetectionStatus {
  MANUAL = 'manual',
  PENDING = 'pending',
  AUTO_DETECTED = 'auto_detected',
  NEEDS_ATTENTION = 'needs_attention',
  CONFIRMED = 'confirmed',
}
