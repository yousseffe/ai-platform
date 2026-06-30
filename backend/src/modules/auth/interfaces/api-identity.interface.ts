/**
 * Classification of the credential that authenticated an API request.
 */
export type ApiKeyKind = 'org' | 'personal' | 'trial' | 'jwt' | 'mcp';

/**
 * Resolved identity and scope for a platform credential.
 *
 * Returned by the `whoami` endpoint and consumed by the MCP server's auth
 * middleware to scope every downstream tool call. Contains no secret material.
 */
export interface ApiIdentity {
  /** Whether the credential belongs to an individual user or an organization. */
  scope: 'user' | 'org';

  /** The classification of the resolving credential. */
  keyType: ApiKeyKind;

  /** Owning user id. Present for personal/trial keys and JWTs; absent for org keys. */
  userId: string | null;

  /** Display identifier (user email, or `org:<orgId>` for organization keys). */
  email: string;

  /** Organization id when the credential is org-scoped. */
  orgId: string | null;

  /** Project id when the credential is project-scoped (organization keys). */
  projectId: string | null;

  /** Model id a personal/trial key is bound to, when applicable. */
  modelId: string | null;

  /** MCP token scopes, present only when keyType is 'mcp'. */
  mcpScopes?: string[];
}
