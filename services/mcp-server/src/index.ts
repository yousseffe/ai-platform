import crypto from 'node:crypto';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { loadConfig } from './config.js';
import { resolveIdentity, UnauthorizedError } from './auth/identity.js';
import { allowRequest } from './auth/rate-limit.js';
import { buildContext } from './context/index.js';
import { createServer } from './server.js';

const cfg = loadConfig();
const app = express();
app.use(express.json({ limit: '4mb' }));

/** A JSON-RPC 2.0 error envelope (the MCP transport speaks JSON-RPC). */
function rpcError(message: string, code = -32000): Record<string, unknown> {
  return { jsonrpc: '2.0', error: { code, message }, id: null };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-platform-mcp-server' });
});

/**
 * MCP endpoint (stateless Streamable HTTP). Each POST is authenticated against
 * the platform, rate-limited per credential, then handled by a fresh, scoped
 * server instance that is torn down when the response closes.
 */
app.post('/mcp', async (req, res) => {
  const authHeader = req.headers.authorization;
  const bearer =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

  if (!bearer) {
    res.status(401).json(rpcError('Missing Authorization bearer token'));
    return;
  }

  if (!bearer.startsWith('mcp_')) {
    res.status(401).json(
      rpcError(
        'Invalid token type. The MCP server requires an MCP Access Token (mcp_...). ' +
          'Generate one at Settings → MCP Access Tokens in the dashboard. ' +
          'Model API keys (ml_sk_*) are not accepted.',
      ),
    );
    return;
  }

  const keyHash = crypto.createHash('sha256').update(bearer).digest('hex');
  if (!allowRequest(keyHash, cfg.rateLimitPerMinute)) {
    res.status(429).json(rpcError('Rate limit exceeded'));
    return;
  }

  try {
    const identity = await resolveIdentity(bearer, cfg);
    const ctx = buildContext(identity, bearer, cfg);
    const server = createServer(ctx);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      res.status(401).json(rpcError(err.message));
      return;
    }
    if (!res.headersSent) {
      res.status(500).json(rpcError('Internal MCP server error'));
    }
  }
});

// Stateless server: no standalone SSE stream or session teardown.
const methodNotAllowed = (_req: express.Request, res: express.Response): void => {
  res.status(405).json(rpcError('Method not allowed (stateless server)'));
};
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

app.listen(cfg.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[mcp] ai-platform MCP server listening on :${cfg.port}`);
});
