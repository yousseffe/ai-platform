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
 * Everything a mapper rule can read from when transforming the payload
 * crossing one edge. Rule `from`/`template` paths are namespaced against this
 * object:
 * - `input.*` — the pipeline run's original external input, available at every edge
 * - `previous.*` — this edge's own upstream step's output (or `input` itself
 *   when the edge's `fromStep` is null)
 * - `steps.<order>.*` — any earlier stage's output, keyed by its 0-based
 *   `order`. When that stage has exactly one step, `steps.<order>` is that
 *   step's output directly (`steps.<order>.fieldName`). When the stage has
 *   multiple parallel steps, it's nested one level deeper by each step's
 *   `role` (`steps.<order>.<role>.fieldName`) so a downstream "join" step —
 *   or the pipeline's final output — can address one specific branch by name.
 *
 * A step (or the pipeline's output) with more than one inbound edge applies
 * each edge independently against its own `previous`/`steps` context and
 * shallow-merges the results — this is how parallel branches, each with
 * their own from/to mapper, combine into one join step's input.
 */
export interface MapperContext {
  input: Record<string, unknown>;
  previous: Record<string, unknown>;
  steps: Record<string, Record<string, unknown>>;
}
