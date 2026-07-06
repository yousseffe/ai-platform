export enum McpScope {
  INTEGRATION_READ = 'integration:read',
  MODELS_READ = 'models:read',
  OBSERVABILITY_READ = 'observability:read',
  SECURITY_READ = 'security:read',
  ADMIN_READ = 'admin:read',
}

export const ADMIN_ONLY_SCOPES: McpScope[] = [
  McpScope.OBSERVABILITY_READ,
  McpScope.SECURITY_READ,
  McpScope.ADMIN_READ,
];
