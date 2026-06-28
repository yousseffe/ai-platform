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
  DEPRECATED = 'deprecated',
}

/**
 * Pull-request style review status for organization model versions.
 */
export enum VersionReviewStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
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

/**
 * Enumeration representing the core type classification of an ML model.
 */
export enum ModelType {
  TABULAR = 'TABULAR',
  NLP = 'NLP',
  VISION = 'VISION',
  LLM_GGUF = 'LLM_GGUF',
  DIFFUSION = 'DIFFUSION',
}

/**
 * Enumeration representing the ML framework used by a model.
 */
export enum Framework {
  SKLEARN = 'SKLEARN',
  PYTORCH = 'PYTORCH',
  TENSORFLOW = 'TENSORFLOW',
  ONNX = 'ONNX',
  LLAMA_CPP = 'LLAMA_CPP',
  VLLM = 'VLLM',
  CUSTOM = 'CUSTOM',
}

/**
 * Enumeration representing the task category of an ML model.
 */
export enum TaskType {
  CLASSIFICATION = 'CLASSIFICATION',
  REGRESSION = 'REGRESSION',
  GENERATION = 'GENERATION',
  OBJECT_DETECTION = 'OBJECT_DETECTION',
  SEGMENTATION = 'SEGMENTATION',
  EMBEDDING = 'EMBEDDING',
  CHAT = 'CHAT',
  OTHER = 'OTHER',
}

/**
 * Enumeration representing the operational type of an organization.
 * Determines wallet initialization and which org portal features are accessible.
 */
export enum OrgType {
  PROVIDER = 'PROVIDER',
  CONSUMER = 'CONSUMER',
  HYBRID = 'HYBRID',
}

/**
 * Enumeration representing RBAC action capabilities within an organization.
 * Used by the useOrgContext hook to gate UI features without repetitive role checks.
 */
export enum OrgAction {
  VIEW_PROJECTS = 'view_projects',
  VIEW_MODELS = 'view_models',
  INVITE_MEMBERS = 'invite_members',
  REMOVE_MEMBERS = 'remove_members',
  CREATE_PROJECT = 'create_project',
  DELETE_PROJECT = 'delete_project',
  MANAGE_API_KEYS = 'manage_api_keys',
  VIEW_API_KEYS = 'view_api_keys',
  VIEW_PROJECT_USAGE = 'view_project_usage',
  VIEW_BILLING = 'view_billing',
  EDIT_SETTINGS = 'edit_settings',
  UPLOAD_MODEL = 'upload_model',
  DEPLOY_MODEL = 'deploy_model',
}
