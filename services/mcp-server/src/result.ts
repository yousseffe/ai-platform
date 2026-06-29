import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Wraps a structured value as an MCP tool result. The MCP server always returns
 * deterministic, structured JSON — never prose or generated text.
 *
 * @param data - The structured payload.
 * @returns A `CallToolResult` carrying the JSON-encoded payload.
 */
export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Wraps an error message as a failed MCP tool result.
 *
 * @param message - Human-readable error description.
 * @returns A `CallToolResult` flagged as an error.
 */
export function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}
