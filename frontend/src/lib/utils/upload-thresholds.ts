/**
 * File size above which client-side (inline) schema auto-detection is skipped
 * in favor of deferred, backend-side detection that runs after the Docker
 * build completes. Mirrors the deferred-detection cutoff implicitly assumed
 * by the backend's fire-and-forget `runSchemaAutoDetection` flow.
 */
export const LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES = 100 * 1024 * 1024;
