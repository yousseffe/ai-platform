/**
 * Enumeration representing scopes/permissions for MCP Access Tokens.
 */
export enum McpScope {
  INTEGRATION_READ = 'integration:read',
  MODELS_READ = 'models:read',
  OBSERVABILITY_READ = 'observability:read', // admin-only
  SECURITY_READ = 'security:read',           // admin-only
  ADMIN_READ = 'admin:read',                 // admin-only
}

/**
  * Scopes that are restricted to administrators.
  */
export const ADMIN_ONLY_SCOPES: McpScope[] = [
  McpScope.OBSERVABILITY_READ,
  McpScope.SECURITY_READ,
  McpScope.ADMIN_READ,
];
