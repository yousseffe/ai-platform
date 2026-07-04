import { NextRequest, NextResponse } from "next/server";

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? "http://localhost:8080";
const MCP_PROXY_URL = process.env.NEXT_PUBLIC_BACKEND_URL
  ? undefined // will be resolved relatively
  : undefined;

const SYSTEM_PROMPT =
  "You are an ops assistant for the ModelOps AI platform. " +
  "Use tools to answer questions about models, deployments, fraud risk, logs, alerts, " +
  "users, organizations, billing/transactions, background jobs, and Docker/storage health. " +
  "For open-ended questions about errors or suspicious activity with no specific model named, " +
  "use the platform-wide log/alert/audit tools instead of the per-model ones. " +
  "Be concise. Highlight warnings or anomalies. Never guess — always call a tool before answering. " +
  "If no tool matches the question, say so explicitly instead of answering from general knowledge.";

const MAX_TOOL_ITERATIONS = 5;

/** A single message in the conversation history sent from the client. */
interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
}

/** A tool_call block returned by the LLM. */
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/** OpenAI-compatible completion response shape (subset we need). */
interface CompletionResponse {
  choices: Array<{
    finish_reason: string;
    message: {
      content: string | null;
      tool_calls?: ToolCall[];
    };
  }>;
}

/** MCP tool descriptor returned by tools/list. */
interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** MCP tools/list response. */
interface McpToolsListResult {
  tools: McpTool[];
}

/** MCP JSON-RPC 2.0 response envelope. */
interface McpRpcResponse {
  result?: McpToolsListResult | { content: Array<{ type: string; text: string }> };
  error?: { message: string };
}

/**
 * Converts a list of MCP tool descriptors into OpenAI function-calling format.
 *
 * @param tools - MCP tool descriptors from tools/list.
 * @returns OpenAI-compatible tool definitions.
 */
function toOpenAiTools(tools: McpTool[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

/**
 * Calls a single MCP tool via the /api/mcp-proxy route and returns the result
 * as a plain string for inclusion in a tool-role message.
 *
 * @param baseUrl - Origin to use when constructing the proxy URL.
 * @param mcpToken - MCP bearer token forwarded by the browser.
 * @param toolName - Name of the MCP tool to call.
 * @param args - Parsed arguments object for the tool.
 * @returns Stringified tool result.
 */
async function callMcpTool(
  baseUrl: string,
  mcpToken: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const rpcBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };

  const res = await fetch(`${baseUrl}/api/mcp-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Mcp-Token": mcpToken,
    },
    body: JSON.stringify(rpcBody),
  });

  const json = (await res.json()) as McpRpcResponse;

  if (json.error) return `Error: ${json.error.message}`;

  const result = json.result as { content?: Array<{ type: string; text: string }> } | undefined;
  if (result?.content) {
    return result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }
  return JSON.stringify(result ?? {});
}

/**
 * Encodes a plain object as an NDJSON line followed by a newline character.
 *
 * @param obj - Object to encode.
 * @returns Uint8Array ready to enqueue into a ReadableStream.
 */
function ndjsonLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

/**
 * POST /api/chat
 *
 * Agentic loop: takes the conversation history + an MCP token, fetches available
 * MCP tools, calls the local llama.cpp LLM, executes any tool_calls in parallel
 * via /api/mcp-proxy, feeds results back, and loops until the LLM stops requesting
 * tools. Streams NDJSON events to the browser:
 *   {"type":"tool_call","name":"...","status":"calling"|"done","ms":N}
 *   {"type":"text","delta":"..."}
 *   {"type":"done"}
 *
 * @param request - Incoming Next.js request containing { messages, mcpToken }.
 * @returns A streaming NDJSON response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { messages: ChatMessage[]; mcpToken: string };
  try {
    body = (await request.json()) as { messages: ChatMessage[]; mcpToken: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, mcpToken } = body;
  if (!mcpToken) {
    return NextResponse.json({ error: "Missing mcpToken" }, { status: 400 });
  }

  // Determine the base URL for internal /api/* calls (server-side fetch needs absolute URL)
  const origin = request.nextUrl.origin;

  // 1. Fetch available MCP tools
  let mcpTools: McpTool[] = [];
  try {
    const toolsRes = await fetch(`${origin}/api/mcp-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Mcp-Token": mcpToken },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    const toolsJson = (await toolsRes.json()) as McpRpcResponse;
    const toolsResult = toolsJson.result as McpToolsListResult | undefined;
    mcpTools = toolsResult?.tools ?? [];
  } catch {
    // If tools/list fails, continue with no tools (LLM will answer from knowledge alone)
    mcpTools = [];
  }

  const openAiTools = toOpenAiTools(mcpTools);

  // 2. Build conversation with system prompt
  const conversation: unknown[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  // 3. Streaming NDJSON response to the browser
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let iterations = 0;

        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          // Call the LLM
          const llmRes = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "local",
              messages: conversation,
              tools: openAiTools.length > 0 ? openAiTools : undefined,
              stream: false,
              temperature: 0.2,
              max_tokens: 400,
            }),
          });

          if (!llmRes.ok) {
            const errText = await llmRes.text();
            controller.enqueue(
              ndjsonLine({ type: "error", message: `LLM error ${llmRes.status}: ${errText.slice(0, 200)}` }),
            );
            break;
          }

          const completion = (await llmRes.json()) as CompletionResponse;
          const choice = completion.choices?.[0];

          if (!choice) break;

          const { finish_reason, message } = choice;

          // Handle tool calls
          if (finish_reason === "tool_calls" && message.tool_calls?.length) {
            // Emit tool_call events and execute all tools in parallel
            const toolCalls = message.tool_calls;

            // Emit "calling" for each
            for (const tc of toolCalls) {
              controller.enqueue(
                ndjsonLine({ type: "tool_call", name: tc.function.name, status: "calling" }),
              );
            }

            // Execute all in parallel
            const results = await Promise.all(
              toolCalls.map(async (tc) => {
                const start = Date.now();
                let args: Record<string, unknown> = {};
                try {
                  args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
                } catch {
                  args = {};
                }
                const result = await callMcpTool(origin, mcpToken, tc.function.name, args);
                const ms = Date.now() - start;
                return { tc, result, ms };
              }),
            );

            // Emit "done" for each and build tool result messages
            const toolMessages: unknown[] = [];
            for (const { tc, result, ms } of results) {
              controller.enqueue(
                ndjsonLine({ type: "tool_call", name: tc.function.name, status: "done", ms }),
              );
              toolMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result,
              });
            }

            // Append assistant turn + tool results and loop
            conversation.push({ role: "assistant", tool_calls: toolCalls, content: null });
            conversation.push(...toolMessages);
            continue;
          }

          // Final text answer — stream word by word for live feel
          const text = message.content ?? "";
          const words = text.split(" ");
          for (const word of words) {
            controller.enqueue(ndjsonLine({ type: "text", delta: word + " " }));
          }
          break;
        }

        controller.enqueue(ndjsonLine({ type: "done" }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        controller.enqueue(ndjsonLine({ type: "error", message }));
        controller.enqueue(ndjsonLine({ type: "done" }));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
