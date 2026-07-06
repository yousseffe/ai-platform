interface InjectionPattern {
  category: string;
  regex: RegExp;
}

const PATTERNS: InjectionPattern[] = [
  {
    category: 'instruction_override',
    regex:
      /\bignore\s+(the\s+)?(previous|above|all|prior)\s+(instructions|prompts|rules)\b/i,
  },
  {
    category: 'instruction_override',
    regex: /\bdisregard\s+(the\s+)?(previous|above|all|prior|system)\b/i,
  },
  {
    category: 'system_prompt_leak',
    regex:
      /\b(reveal|show|print|repeat|expose)\b.{0,30}\b(system\s*prompt|instructions|developer\s*message)\b/i,
  },
  { category: 'role_hijack', regex: /\byou\s+are\s+now\b/i },
  { category: 'role_hijack', regex: /\bpretend\s+to\s+be\b/i },
  {
    category: 'role_hijack',
    regex: /\bact\s+as\s+(an?\s+)?(unfiltered|uncensored|dan)\b/i,
  },
  { category: 'jailbreak', regex: /\bjailbreak\b/i },
  { category: 'jailbreak', regex: /\bdeveloper\s+mode\b/i },
  { category: 'jailbreak', regex: /\bDAN\b/ },
  {
    category: 'guardrail_bypass',
    regex: /\bwithout\s+any\s+(restrictions|filters|rules|safety)\b/i,
  },
];

export function detectInjection(text: string): string | null {
  if (!text) return null;
  const sample = text.length > 20_000 ? text.slice(0, 20_000) : text;
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(sample)) return pattern.category;
  }
  return null;
}
