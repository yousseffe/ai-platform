import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.env.MCP_URL ?? 'http://localhost:7000/mcp');
const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: 'Bearer ml_sk_live_0c192a092211da06956fb37f6213f8dd81f33ecdee6de39c' } },
});

const client = new Client({ name: 'smoke', version: '0.0.1' });
await client.connect(transport);

const tools = await client.listTools();
console.log('TOOL COUNT:', tools.tools.length);
console.log('TOOLS:', tools.tools.map((t) => t.name).sort().join(', '));

const ping = await client.callTool({ name: 'system_ping', arguments: {} });
const text = Array.isArray(ping.content) && ping.content[0] && 'text' in ping.content[0]
  ? (ping.content[0] as { text: string }).text
  : '';
console.log('PING RESULT:', text.replace(/\s+/g, ' '));

await client.close();
