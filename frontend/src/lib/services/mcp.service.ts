import { smartFetch } from "@/lib/utils/smart-fetch";
import { McpTokenInfo, McpTokenCreateResponse } from "@/types";

/** Shape of an MCP JSON-RPC tool descriptor returned by tools/list. */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

/** Shape of a content item returned in a tools/call response. */
export interface McpContentItem {
  type: "text" | "image" | "resource";
  text?: string;
}

/** Structured JSON-RPC response from the MCP proxy. */
export interface McpRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: {
    tools?: McpTool[];
    content?: McpContentItem[];
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
  };
}

let rpcId = 1;

/**
 * Sends a JSON-RPC 2.0 request to the MCP server through the Next.js proxy route.
 *
 * @param token - Raw MCP bearer token (mcp_... prefixed).
 * @param method - MCP JSON-RPC method name (e.g. "tools/list", "tools/call").
 * @param params - Optional method parameters.
 * @returns Parsed JSON-RPC response.
 * @throws {Error} On network failure or non-ok proxy status.
 */
export async function callMcpRpc(
  token: string,
  method: string,
  params?: unknown,
): Promise<McpRpcResponse> {
  const id = rpcId++;
  const body: Record<string, unknown> = { jsonrpc: "2.0", id, method };
  if (params !== undefined) body.params = params;

  const res = await fetch("/api/mcp-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Mcp-Token": token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP proxy error ${res.status}: ${text}`);
  }

  return res.json() as Promise<McpRpcResponse>;
}

/**
 * Lists all tools available to the given MCP token via tools/list.
 *
 * @param token - Raw MCP bearer token.
 * @returns Array of available tools.
 */
export async function listMcpTools(token: string): Promise<McpTool[]> {
  const response = await callMcpRpc(token, "tools/list");
  if (response.error) throw new Error(response.error.message);
  return response.result?.tools ?? [];
}

/**
 * Calls a specific MCP tool with the given arguments.
 *
 * @param token - Raw MCP bearer token.
 * @param toolName - Name of the tool to invoke.
 * @param args - Tool arguments matching the tool's inputSchema.
 * @returns Array of content items from the tool response.
 */
export async function callMcpTool(
  token: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpContentItem[]> {
  const response = await callMcpRpc(token, "tools/call", {
    name: toolName,
    arguments: args,
  });
  if (response.error) throw new Error(response.error.message);
  return response.result?.content ?? [];
}

/**
 * Lists all MCP tokens owned by the current authenticated user.
 *
 * @returns Array of MCP token descriptors (no plaintext secrets).
 */
export async function listMcpTokens(): Promise<McpTokenInfo[]> {
  return smartFetch<McpTokenInfo[]>("/auth/mcp-tokens");
}

/**
 * Creates a new MCP access token.
 *
 * @param name - Human-readable label for the token.
 * @param scopes - Array of permission scopes to grant.
 * @param expiresInDays - Optional TTL in days (null = no expiry).
 * @returns Token metadata and the raw plaintext token (shown only once).
 */
export async function createMcpToken(
  name: string,
  scopes: string[],
  expiresInDays: number | null,
): Promise<McpTokenCreateResponse> {
  return smartFetch<McpTokenCreateResponse>("/auth/mcp-tokens", {
    method: "POST",
    body: JSON.stringify({ name, scopes, expiresInDays }),
  });
}

/**
 * Soft-revokes an MCP token (disables without deleting).
 *
 * @param id - Token UUID to revoke.
 */
export async function revokeMcpToken(id: string): Promise<void> {
  await smartFetch(`/auth/mcp-tokens/${id}/revoke`, { method: "POST" });
}

/**
 * Permanently deletes an MCP token.
 *
 * @param id - Token UUID to delete.
 */
export async function deleteMcpToken(id: string): Promise<void> {
  await smartFetch(`/auth/mcp-tokens/${id}`, { method: "DELETE" });
}
