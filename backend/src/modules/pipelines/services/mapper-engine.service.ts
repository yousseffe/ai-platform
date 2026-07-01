import { Injectable } from '@nestjs/common';
import { MapperSpec, MapperContext } from '../interfaces/mapper-spec.interface';

/**
 * Safely interprets a declarative {@link MapperSpec} against a
 * {@link MapperContext} to produce one edge's output payload. Rules are
 * data, never code — there is no `eval` and no user-supplied script ever
 * runs here. Rule paths are namespaced (`input.*`, `previous.*`,
 * `steps.<order>.*`) so a mapper can combine the pipeline's original input
 * and any earlier step's output, not just the immediately-previous one.
 */
@Injectable()
export class MapperEngineService {
  /**
   * Applies a mapper spec against a context, producing the mapped payload.
   * A null/empty spec passes `context.previous` through unchanged.
   *
   * @param spec - The declarative mapping rules, or null/empty for pass-through.
   * @param context - The pipeline input, previous step output, and prior step outputs.
   * @returns The mapped payload to send across this edge.
   */
  apply(
    spec: MapperSpec | null | undefined,
    context: MapperContext,
  ): Record<string, unknown> {
    if (!spec || !spec.rules || spec.rules.length === 0) {
      return context.previous;
    }

    const output: Record<string, unknown> = {};
    for (const rule of spec.rules) {
      switch (rule.op) {
        case 'copy': {
          const value = this.getPath(context, rule.from);
          if (value !== undefined) {
            this.setPath(output, rule.to, value);
          }
          break;
        }
        case 'cast': {
          const value = this.getPath(context, rule.from);
          this.setPath(output, rule.to, this.castValue(value, rule.as));
          break;
        }
        case 'template': {
          this.setPath(
            output,
            rule.to,
            this.renderTemplate(rule.template, context),
          );
          break;
        }
        case 'default': {
          if (this.getPath(output, rule.to) === undefined) {
            this.setPath(output, rule.to, rule.value);
          }
          break;
        }
      }
    }
    return output;
  }

  /** Reads a dotted/bracketed path (e.g. `a.b[0].c`) from an object. */
  private getPath(obj: unknown, path: string): unknown {
    let current: unknown = obj;
    for (const segment of this.parsePath(path)) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  /** Writes a value at a dotted/bracketed path, creating intermediate objects/arrays as needed. */
  private setPath(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
  ): void {
    const segments = this.parsePath(path);
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const next = current[segment];
      if (typeof next !== 'object' || next === null) {
        current[segment] = /^\d+$/.test(segments[i + 1]) ? [] : {};
      }
      current = current[segment] as Record<string, unknown>;
    }
    current[segments[segments.length - 1]] = value;
  }

  private parsePath(path: string): string[] {
    return path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter((segment) => segment.length > 0);
  }

  private castValue(
    value: unknown,
    as: 'string' | 'number' | 'boolean',
  ): unknown {
    switch (as) {
      case 'string':
        return this.stringify(value);
      case 'number': {
        const num = Number(value);
        return Number.isNaN(num) ? 0 : num;
      }
      case 'boolean':
        return Boolean(value);
    }
  }

  /** Renders `{{dotted.path}}` tokens in a template string against the source payload. */
  private renderTemplate(template: string, source: unknown): string {
    return template.replace(
      /\{\{\s*([\w.[\]]+)\s*\}\}/g,
      (_match, path: string) => {
        return this.stringify(this.getPath(source, path));
      },
    );
  }

  /** Converts a value to a display string without ever emitting `[object Object]`. */
  private stringify(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}
