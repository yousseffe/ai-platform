/**
 * Enumeration representing the stages of model sandbox container deployments.
 */
export enum DeploymentStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

/**
 * Enumeration representing build status indicating package deployment readiness.
 */
export enum VersionStatus {
  UPLOADED = 'uploaded',
  BUILDING = 'building',
  READY = 'ready',
  FAILED = 'failed',
}

/**
 * Enumeration representing the platform user account statuses.
 */
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Enumeration representing the owner type of a wallet or workspace context.
 */
export enum OwnerType {
  USER = 'USER',
  ORG = 'ORG',
}

/**
 * Enumeration representing the purpose of a wallet.
 */
export enum WalletType {
  CONSUMER = 'CONSUMER',
  PROVIDER = 'PROVIDER',
}

/**
 * Enumeration representing the organization workspace capability role levels.
 */
export enum OrgRole {
  OWNER = 'OWNER',
  MAINTAINER = 'MAINTAINER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

/**
 * Enumeration representing organization membership verification/acceptance state.
 */
export enum OrgMemberStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
}

/**
 * Enumeration representing local client prediction run results.
 */
export enum PredictionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
