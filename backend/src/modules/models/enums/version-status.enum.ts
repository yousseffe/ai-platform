/**
 * Enumeration representing the stages of model version containerization.
 */
export enum VersionStatus {
  UPLOADED = 'uploaded',
  BUILDING = 'building',
  READY = 'ready',
  FAILED = 'failed',
  DEPRECATED = 'deprecated',
}
