/**
 * A file the external agent supplies for analysis. Manifests (package.json,
 * requirements.txt, etc.) should include `content`; other entries may be path-only.
 */
export interface RepoFileInput {
  path: string;
  content?: string;
}

/** Deterministic, rule-derived description of a repository. */
export interface RepoAnalysis {
  framework: string;
  frameworkConfidence: 'high' | 'medium' | 'low';
  language: string;
  architecture: string;
  packageManager: string;
  moduleSystem: 'ESM' | 'CJS' | 'unknown';
  environmentFiles: string[];
  serviceLocations: string[];
  configLocations: string[];
  detectedDependencies: string[];
  conventions: string[];
  integrationSuggestions: string[];
}

const CANDIDATE_SERVICE_DIRS = [
  'src/modules',
  'src/services',
  'src/lib/services',
  'app/services',
  'src/app/api',
  'app/api',
];
const CANDIDATE_CONFIG_DIRS = ['src/config', 'config', 'src/lib/config'];

/**
 * Normalises a supplied path to forward slashes without a leading `./`.
 */
function norm(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Reads the content of a file by exact path (case-sensitive on the basename).
 */
function findContent(files: RepoFileInput[], name: string): string | undefined {
  return files.find((f) => norm(f.path) === name || norm(f.path).endsWith(`/${name}`))
    ?.content;
}

/** Detects the package manager from lockfile presence. */
function detectPackageManager(paths: Set<string>): string {
  if (has(paths, 'pnpm-lock.yaml')) return 'pnpm';
  if (has(paths, 'yarn.lock')) return 'yarn';
  if (has(paths, 'bun.lockb')) return 'bun';
  if (has(paths, 'package-lock.json')) return 'npm';
  if (has(paths, 'poetry.lock')) return 'poetry';
  if (has(paths, 'Pipfile.lock')) return 'pipenv';
  if (has(paths, 'composer.lock')) return 'composer';
  if (has(paths, 'go.sum')) return 'go-modules';
  if (has(paths, 'Gemfile.lock')) return 'bundler';
  if (has(paths, 'requirements.txt')) return 'pip';
  if (has(paths, 'package.json')) return 'npm';
  return 'unknown';
}

/** Returns true if any path equals or ends with `/name`. */
function has(paths: Set<string>, name: string): boolean {
  for (const p of paths) {
    if (p === name || p.endsWith(`/${name}`)) return true;
  }
  return false;
}

/** Returns true if any path starts with `prefix` (directory match). */
function hasDir(paths: Set<string>, prefix: string): boolean {
  for (const p of paths) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/**
 * Detects framework + language from manifests and signature files.
 */
function detectFramework(
  files: RepoFileInput[],
  paths: Set<string>,
): { framework: string; language: string; confidence: 'high' | 'medium' | 'low'; deps: string[] } {
  const pkgRaw = findContent(files, 'package.json');
  const deps: string[] = [];
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      deps.push(
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
      );
    } catch {
      /* malformed manifest — ignore */
    }
  }
  const dep = (name: string): boolean => deps.includes(name);
  const ts = has(paths, 'tsconfig.json');
  const jsLang = ts ? 'TypeScript' : 'JavaScript';

  if (dep('@nestjs/core') || has(paths, 'nest-cli.json'))
    return { framework: 'NestJS', language: jsLang, confidence: 'high', deps };
  if (dep('next') || hasNextConfig(paths))
    return { framework: 'Next.js', language: jsLang, confidence: 'high', deps };
  if (dep('@angular/core') || has(paths, 'angular.json'))
    return { framework: 'Angular', language: jsLang, confidence: 'high', deps };
  if (dep('nuxt') || dep('nuxt3'))
    return { framework: 'Nuxt', language: jsLang, confidence: 'high', deps };
  if (dep('vue'))
    return { framework: 'Vue', language: jsLang, confidence: 'medium', deps };
  if (dep('svelte') || dep('@sveltejs/kit'))
    return { framework: 'Svelte', language: jsLang, confidence: 'medium', deps };
  if (dep('react'))
    return { framework: 'React', language: jsLang, confidence: 'medium', deps };
  if (dep('@nestjs/common'))
    return { framework: 'NestJS', language: jsLang, confidence: 'high', deps };
  if (dep('express') || dep('fastify') || dep('koa'))
    return { framework: 'Node (Express/Fastify)', language: jsLang, confidence: 'medium', deps };

  // Python
  const pyDeps = pythonDeps(files);
  if (pyDeps.length) {
    if (pyDeps.some((d) => d.startsWith('django')))
      return { framework: 'Django', language: 'Python', confidence: 'high', deps: pyDeps };
    if (pyDeps.includes('fastapi'))
      return { framework: 'FastAPI', language: 'Python', confidence: 'high', deps: pyDeps };
    if (pyDeps.includes('flask'))
      return { framework: 'Flask', language: 'Python', confidence: 'high', deps: pyDeps };
    return { framework: 'Python', language: 'Python', confidence: 'low', deps: pyDeps };
  }
  if (has(paths, 'manage.py'))
    return { framework: 'Django', language: 'Python', confidence: 'medium', deps };

  // Java
  const pom = findContent(files, 'pom.xml');
  const gradle = findContent(files, 'build.gradle') ?? findContent(files, 'build.gradle.kts');
  if ((pom && pom.includes('spring-boot')) || (gradle && gradle.includes('spring-boot')))
    return { framework: 'Spring Boot', language: 'Java', confidence: 'high', deps };
  if (pom || gradle)
    return { framework: 'Java', language: 'Java', confidence: 'low', deps };

  // PHP
  const composer = findContent(files, 'composer.json');
  if (composer) {
    if (composer.includes('laravel/framework'))
      return { framework: 'Laravel', language: 'PHP', confidence: 'high', deps };
    if (composer.includes('symfony/'))
      return { framework: 'Symfony', language: 'PHP', confidence: 'high', deps };
    return { framework: 'PHP', language: 'PHP', confidence: 'low', deps };
  }
  if (has(paths, 'artisan'))
    return { framework: 'Laravel', language: 'PHP', confidence: 'medium', deps };

  // Go / Ruby
  if (has(paths, 'go.mod'))
    return { framework: 'Go', language: 'Go', confidence: 'low', deps };
  const gemfile = findContent(files, 'Gemfile');
  if (gemfile && gemfile.includes('rails'))
    return { framework: 'Ruby on Rails', language: 'Ruby', confidence: 'high', deps };

  return {
    framework: 'Unknown',
    language: ts ? 'TypeScript' : 'Unknown',
    confidence: 'low',
    deps,
  };
}

/** True if a Next.js config file exists. */
function hasNextConfig(paths: Set<string>): boolean {
  for (const ext of ['js', 'mjs', 'ts']) {
    if (has(paths, `next.config.${ext}`)) return true;
  }
  return false;
}

/** Extracts top-level python dependency names from requirements/pyproject. */
function pythonDeps(files: RepoFileInput[]): string[] {
  const out: string[] = [];
  const req = findContent(files, 'requirements.txt');
  if (req) {
    for (const line of req.split('\n')) {
      const name = line.trim().split(/[=<>!~;\[ ]/)[0]?.toLowerCase();
      if (name && !name.startsWith('#')) out.push(name);
    }
  }
  const pyproject = findContent(files, 'pyproject.toml');
  if (pyproject) {
    for (const m of pyproject.matchAll(/^\s*([a-zA-Z0-9_-]+)\s*=/gm)) {
      if (m[1]) out.push(m[1].toLowerCase());
    }
  }
  return out;
}

/** Determines architecture style from directory structure. */
function detectArchitecture(framework: string, paths: Set<string>): string {
  if (hasDir(paths, 'src/modules')) return 'modular';
  if (has(paths, 'src/app/page.tsx') || hasDir(paths, 'src/app') || hasDir(paths, 'app'))
    return framework === 'Next.js' ? 'app-router' : 'modular';
  if (hasDir(paths, 'pages')) return 'pages-router';
  if (hasDir(paths, 'controllers') && hasDir(paths, 'models')) return 'mvc';
  return 'unknown';
}

/**
 * Analyzes a repository deterministically from agent-supplied files. No I/O, no
 * inference — purely manifest parsing + path heuristics.
 *
 * @param files - The file tree (manifests with content) the agent provides.
 * @returns A {@link RepoAnalysis}.
 */
export function analyzeRepository(files: RepoFileInput[]): RepoAnalysis {
  const paths = new Set(files.map((f) => norm(f.path)));

  const { framework, language, confidence, deps } = detectFramework(files, paths);
  const packageManager = detectPackageManager(paths);
  const architecture = detectArchitecture(framework, paths);

  let moduleSystem: 'ESM' | 'CJS' | 'unknown' = 'unknown';
  const pkgRaw = findContent(files, 'package.json');
  if (pkgRaw) {
    moduleSystem = /"type"\s*:\s*"module"/.test(pkgRaw) ? 'ESM' : 'CJS';
  }

  const environmentFiles = [...paths].filter((p) =>
    /(^|\/)\.env(\.[\w.-]+)?$/.test(p),
  );
  const serviceLocations = CANDIDATE_SERVICE_DIRS.filter((d) => hasDir(paths, d));
  const configLocations = CANDIDATE_CONFIG_DIRS.filter((d) => hasDir(paths, d));

  const conventions: string[] = [];
  if (language === 'TypeScript') conventions.push('typescript');
  if (moduleSystem !== 'unknown') conventions.push(moduleSystem.toLowerCase());
  if (architecture !== 'unknown') conventions.push(architecture);

  return {
    framework,
    frameworkConfidence: confidence,
    language,
    architecture,
    packageManager,
    moduleSystem,
    environmentFiles,
    serviceLocations,
    configLocations,
    detectedDependencies: deps.slice(0, 60),
    conventions,
    integrationSuggestions: buildSuggestions(framework, packageManager, serviceLocations),
  };
}

/**
 * Returns deterministic, framework-specific suggestions for where integration
 * code should live and how secrets should be handled. These are hints for the
 * external agent — the MCP server never writes any of it.
 */
function buildSuggestions(
  framework: string,
  packageManager: string,
  serviceLocations: string[],
): string[] {
  const install =
    packageManager === 'pip' || packageManager === 'poetry' || packageManager === 'pipenv'
      ? `${packageManager} install <package>`
      : packageManager === 'composer'
        ? 'composer require <package>'
        : packageManager === 'bundler'
          ? 'bundle add <package>'
          : packageManager === 'go-modules'
            ? 'go get <package>'
            : `${packageManager === 'unknown' ? 'npm' : packageManager} install <package>`;
  const svc = serviceLocations[0];

  switch (framework) {
    case 'NestJS':
      return [
        `Create an injectable provider/service${svc ? ` under ${svc}` : ' under src/modules'} and register it in a module.`,
        'Read credentials via NestJS ConfigService or process.env — never hardcode secrets.',
        'Use the standard NestJS HttpService (axios wrapper) or fetch() to call the model prediction endpoint.',
      ];
    case 'Next.js':
      return [
        'Call the platform API from a Server Action or Route Handler (app/api/...) to keep the API key safe from the client browser.',
        'Store secrets in .env.local; only prefix with NEXT_PUBLIC_ if you intend to expose the key to the browser (not recommended for live production keys).',
        'Use native fetch() server-side to proxy calls to the platform predict URL (default: http://localhost:3000).',
      ];
    case 'React':
    case 'Vue':
    case 'Svelte':
    case 'Nuxt':
    case 'Angular':
      return [
        'WARNING: Calling the platform API directly from a static browser app exposes your API key and raises CORS errors in development.',
        'DEV SOLUTION: Configure a proxy in your dev server. For Vite, add to vite.config.ts: server: { proxy: { "/api": "http://localhost:3000" } }.',
        'PROD SOLUTION: Deploy a lightweight serverless function or API route as a proxy, and store the API key there.',
        'Store your development API key in `.env` using your framework prefix (e.g. `VITE_MODEL_API_KEY=ml_sk_live_...` for Vite).',
      ];
    case 'Django':
    case 'FastAPI':
    case 'Flask':
      return [
        'Add a service module/file to execute fetch/requests calls and read the API key from system environment/settings.',
        'Keep all model endpoint calls strictly server-side; never expose the key to frontend templates.',
        `Install python dependency "requests" or "httpx" using: ${install}.`,
      ];
    case 'Laravel':
      return [
        'Add a service class under app/Services and bind it in a ServiceProvider.',
        'Read the API key from config/services.php + .env; use Http facade `Http::withToken($key)->post(...)` to call predict.',
      ];
    case 'Spring Boot':
      return [
        'Add a @Service bean; inject the key via @Value("${model.api.key}") from application properties or environment variables.',
        'Use RestClient or RestTemplate to make the POST call to the model predict URL.',
      ];
    default:
      return [
        'Add a dedicated service/module for the model client and read the key from an environment variable.',
        'Use native fetch() or a standard HTTP client library to perform POST requests.',
      ];
  }
}
