export interface CopyMapperRule {
  op: 'copy';
  from: string;
  to: string;
}

export interface DefaultMapperRule {
  op: 'default';
  to: string;
  value: unknown;
}

export interface CastMapperRule {
  op: 'cast';
  from: string;
  to: string;
  as: 'string' | 'number' | 'boolean';
}

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

export interface MapperSpec {
  rules: MapperRule[];
}

export interface MapperContext {
  input: Record<string, unknown>;
  previous: Record<string, unknown>;
  steps: Record<string, Record<string, unknown>>;
}
