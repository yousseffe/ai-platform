/** Copies a value from one dotted path in the source payload to a path in the output. */
export interface CopyMapperRule {
  op: 'copy';
  from: string;
  to: string;
}

/** Sets a fixed value at a path, only if nothing has written to that path yet. */
export interface DefaultMapperRule {
  op: 'default';
  to: string;
  value: unknown;
}

/** Copies a value, coercing it to the given primitive type. */
export interface CastMapperRule {
  op: 'cast';
  from: string;
  to: string;
  as: 'string' | 'number' | 'boolean';
}

/** Renders a string template against the source payload using `{{dotted.path}}` tokens. */
export interface TemplateMapperRule {
  op: 'template';
  to: string;
  template: string;
}

export type MapperRule =
  | CopyMapperRule
  | DefaultMapperRule
  | CastMapperRule
  | TemplateMapperRule;

/**
 * A declarative, side-effect-free description of how to transform a payload
 * crossing one edge. Executed by a safe interpreter ({@link MapperEngineService})
 * — never evaluated as code. An empty/missing `rules` array passes the
 * immediately-previous step's output through unchanged.
 */
export interface MapperSpec {
  rules: MapperRule[];
}

/**
 * Everything a mapper rule can read from when transforming the payload for
 * one edge. Rule `from`/`template` paths are namespaced against this object:
 * - `input.*` — the pipeline run's original external input, available at every edge
 * - `previous.*` — the immediately-upstream step's output (or `input` itself
 *   for the edge feeding the first step)
 * - `steps.<order>.*` — any earlier step's output, keyed by its 0-based `order`,
 *   so a step (or the pipeline's final output) can combine fields from
 *   multiple non-adjacent steps, not just the one directly before it
 */
export interface MapperContext {
  input: Record<string, unknown>;
  previous: Record<string, unknown>;
  steps: Record<string, Record<string, unknown>>;
}
