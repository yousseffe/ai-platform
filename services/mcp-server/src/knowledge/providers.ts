/**
 * Curated, deterministic integration metadata for external AI providers. This is
 * a maintained knowledge base — NOT live research and NOT generated. The MCP
 * server returns it so an external agent (which typically has up-to-date model
 * knowledge) can ground a code integration. Model IDs change frequently; the
 * `caveats` make that explicit.
 */

/** SDK setup metadata for one language family. */
export interface ProviderSdkInfo {
  language: 'node' | 'python' | 'php' | 'java' | 'go' | 'ruby';
  package: string;
  install: string;
  clientSetupHint: string;
}

/** Full curated metadata for a single provider. */
export interface ProviderMetadata {
  provider: string;
  displayName: string;
  modelFamilies: string[];
  auth: { type: 'api-key'; envVar: string; transport: string };
  endpoints: { base: string; chat?: string };
  sdks: ProviderSdkInfo[];
  docsUrl: string;
  caveats: string[];
}

const COMMON_CAVEATS = [
  'Model IDs change frequently — confirm the exact current model name from the provider docs before coding.',
  'This metadata is curated and may lag the provider’s latest releases.',
  'Never hardcode the API key; load it from the environment variable shown in `auth.envVar`.',
];

const PROVIDERS: Record<string, ProviderMetadata> = {
  openai: {
    provider: 'openai',
    displayName: 'OpenAI',
    modelFamilies: ['gpt-5', 'gpt-4.1', 'gpt-4o', 'o-series (reasoning)'],
    auth: { type: 'api-key', envVar: 'OPENAI_API_KEY', transport: 'Authorization: Bearer' },
    endpoints: { base: 'https://api.openai.com/v1', chat: '/chat/completions' },
    sdks: [
      {
        language: 'node',
        package: 'openai',
        install: 'npm install openai',
        clientSetupHint: "import OpenAI from 'openai'; const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });",
      },
      {
        language: 'python',
        package: 'openai',
        install: 'pip install openai',
        clientSetupHint: 'from openai import OpenAI; client = OpenAI()  # reads OPENAI_API_KEY',
      },
      {
        language: 'php',
        package: 'openai-php/client',
        install: 'composer require openai-php/client',
        clientSetupHint: "$client = OpenAI::client(getenv('OPENAI_API_KEY'));",
      },
      {
        language: 'java',
        package: 'com.openai:openai-java',
        install: 'add com.openai:openai-java to your build',
        clientSetupHint: 'OpenAIClient client = OpenAIOkHttpClient.fromEnv();',
      },
    ],
    docsUrl: 'https://platform.openai.com/docs',
    caveats: COMMON_CAVEATS,
  },

  anthropic: {
    provider: 'anthropic',
    displayName: 'Anthropic (Claude)',
    modelFamilies: ['claude-opus', 'claude-sonnet', 'claude-haiku'],
    auth: { type: 'api-key', envVar: 'ANTHROPIC_API_KEY', transport: 'x-api-key header' },
    endpoints: { base: 'https://api.anthropic.com/v1', chat: '/messages' },
    sdks: [
      {
        language: 'node',
        package: '@anthropic-ai/sdk',
        install: 'npm install @anthropic-ai/sdk',
        clientSetupHint: "import Anthropic from '@anthropic-ai/sdk'; const client = new Anthropic();  // reads ANTHROPIC_API_KEY",
      },
      {
        language: 'python',
        package: 'anthropic',
        install: 'pip install anthropic',
        clientSetupHint: 'import anthropic; client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY',
      },
      {
        language: 'php',
        package: 'anthropic-ai/sdk',
        install: 'composer require anthropic-ai/sdk',
        clientSetupHint: "$client = new Anthropic\\Client(apiKey: getenv('ANTHROPIC_API_KEY'));",
      },
      {
        language: 'java',
        package: 'com.anthropic:anthropic-java',
        install: 'add com.anthropic:anthropic-java to your build',
        clientSetupHint: 'AnthropicClient client = AnthropicOkHttpClient.fromEnv();',
      },
    ],
    docsUrl: 'https://docs.claude.com',
    caveats: COMMON_CAVEATS,
  },

  gemini: {
    provider: 'gemini',
    displayName: 'Google Gemini',
    modelFamilies: ['gemini-2.x-pro', 'gemini-2.x-flash'],
    auth: { type: 'api-key', envVar: 'GEMINI_API_KEY', transport: 'x-goog-api-key header / SDK' },
    endpoints: { base: 'https://generativelanguage.googleapis.com' },
    sdks: [
      {
        language: 'node',
        package: '@google/genai',
        install: 'npm install @google/genai',
        clientSetupHint: "import { GoogleGenAI } from '@google/genai'; const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });",
      },
      {
        language: 'python',
        package: 'google-genai',
        install: 'pip install google-genai',
        clientSetupHint: 'from google import genai; client = genai.Client()  # reads GEMINI_API_KEY',
      },
      {
        language: 'go',
        package: 'google.golang.org/genai',
        install: 'go get google.golang.org/genai',
        clientSetupHint: 'client, _ := genai.NewClient(ctx, &genai.ClientConfig{APIKey: os.Getenv("GEMINI_API_KEY")})',
      },
    ],
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    caveats: COMMON_CAVEATS,
  },
};

/** Maps a detected framework to its SDK language family. */
const FRAMEWORK_TO_LANGUAGE: Record<string, ProviderSdkInfo['language']> = {
  NestJS: 'node',
  'Next.js': 'node',
  React: 'node',
  Vue: 'node',
  Angular: 'node',
  Nuxt: 'node',
  Svelte: 'node',
  'Node (Express/Fastify)': 'node',
  Django: 'python',
  FastAPI: 'python',
  Flask: 'python',
  Python: 'python',
  Laravel: 'php',
  Symfony: 'php',
  PHP: 'php',
  'Spring Boot': 'java',
  Java: 'java',
  Go: 'go',
  'Ruby on Rails': 'ruby',
};

/** Known provider aliases mapped to canonical keys. */
const ALIASES: Record<string, string> = {
  openai: 'openai',
  'gpt': 'openai',
  'gpt-4': 'openai',
  'gpt-5': 'openai',
  'chatgpt': 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  gemini: 'gemini',
  google: 'gemini',
  'google-gemini': 'gemini',
};

/** Result returned to the integration tool, optionally narrowed to one stack. */
export interface ProviderLookup {
  found: boolean;
  available: string[];
  metadata?: ProviderMetadata;
  recommendedSdk?: ProviderSdkInfo;
}

/**
 * Looks up curated metadata for a provider, optionally narrowing the SDK to the
 * language implied by the caller's framework/stack.
 *
 * @param provider - Provider name or alias (e.g. "openai", "claude", "gemini").
 * @param framework - Optional detected framework to pick the right SDK language.
 * @returns A {@link ProviderLookup}.
 */
export function getProviderMetadata(
  provider: string,
  framework?: string,
): ProviderLookup {
  const key = ALIASES[provider.trim().toLowerCase()];
  const available = Object.keys(PROVIDERS);
  if (!key || !PROVIDERS[key]) {
    return { found: false, available };
  }
  const metadata = PROVIDERS[key];
  const lang = framework ? FRAMEWORK_TO_LANGUAGE[framework] : undefined;
  const recommendedSdk = lang
    ? metadata.sdks.find((s) => s.language === lang)
    : undefined;
  return { found: true, available, metadata, recommendedSdk };
}
