export type ApiKeyKind = 'org' | 'personal' | 'trial' | 'jwt' | 'mcp';

export interface ApiIdentity {
  scope: 'user' | 'org';

  keyType: ApiKeyKind;

  userId: string | null;

  email: string;

  orgId: string | null;

  projectId: string | null;

  modelId: string | null;

  mcpScopes?: string[];
}
