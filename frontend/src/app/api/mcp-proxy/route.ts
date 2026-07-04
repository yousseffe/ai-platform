import { NextRequest, NextResponse } from "next/server";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:3030";

/**
 * Parses a Server-Sent Events body and returns all JSON-RPC payloads found in
 * `data:` lines. The MCP StreamableHTTPServerTransport always responds with
 * text/event-stream even for single-turn requests.
 *
 * @param text - Raw SSE response body.
 * @returns Array of parsed JSON objects from each data line.
 */
function parseSseBody(text: string): unknown[] {
  const results: unknown[] = [];
  // Events are separated by a blank line (\n\n)
  const events = text.split(/\n\n+/);
  for (const event of events) {
    for (const line of event.split("\n")) {
      if (line.startsWith("data:")) {
        const json = line.slice(5).trim();
        if (json) {
          try {
            results.push(JSON.parse(json));
          } catch {
            // skip non-JSON data lines (e.g. keep-alive pings)
          }
        }
      }
    }
  }
  return results;
}

/**
 * Proxy route that forwards MCP JSON-RPC requests from the admin frontend to
 * the MCP server. The server is an internal service not reachable from the
 * browser. Handles the SSE response format the MCP transport always emits.
 *
 * Request headers must include `X-Mcp-Token` with a valid `mcp_...` bearer token.
 *
 * @param request - Incoming Next.js request.
 * @returns The first JSON-RPC payload extracted from the upstream SSE response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.headers.get("X-Mcp-Token");
  if (!token) {
    return NextResponse.json({ error: "Missing X-Mcp-Token header" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const responseText = await upstream.text();

    // MCP StreamableHTTPServerTransport always returns SSE, even for a single
    // synchronous JSON-RPC reply. Parse the event stream and return the first
    // data payload as plain JSON.
    if (contentType.includes("text/event-stream")) {
      const payloads = parseSseBody(responseText);
      if (payloads.length === 0) {
        return NextResponse.json(
          { error: "MCP server returned an empty event stream" },
          { status: 502 },
        );
      }
      // For streaming multi-response calls there may be several payloads;
      // the admin console only needs the first (the JSON-RPC response).
      return NextResponse.json(payloads[0], { status: upstream.status });
    }

    // Fallback: plain JSON response (e.g. 401/429 error shortcuts)
    try {
      const json: unknown = JSON.parse(responseText);
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      return NextResponse.json(
        { error: `Non-JSON upstream response: ${responseText.slice(0, 200)}` },
        { status: 502 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "MCP server unreachable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
