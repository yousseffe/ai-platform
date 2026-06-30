import type { RequestContext } from '../types.js';

/**
 * Checks if the caller identity has the required scope.
 * Returns an error message string if the scope is missing, or null if allowed.
 *
 * @param ctx - Request context carrying caller identity.
 * @param scope - The scope permission string required.
 * @returns Error string or null.
 */
export function requireScope(ctx: RequestContext, scope: string): string | null {
  if (!ctx.identity.mcpScopes || !ctx.identity.mcpScopes.includes(scope)) {
    return (
      `This token does not have the '${scope}' scope required for this tool. ` +
      `Create a new token with this scope at Settings → MCP Access Tokens in the dashboard.`
    );
  }
  return null;
}
