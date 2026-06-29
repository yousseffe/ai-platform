export interface McpTokenInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface McpTokenCreateResponse {
  token: McpTokenInfo;
  rawToken: string;
}
