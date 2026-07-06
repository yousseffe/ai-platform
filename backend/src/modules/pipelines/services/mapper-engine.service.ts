import { Injectable } from '@nestjs/common';
import { MapperSpec, MapperContext } from '../interfaces/mapper-spec.interface';

@Injectable()
export class MapperEngineService {
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

  private renderTemplate(template: string, source: unknown): string {
    return template.replace(
      /\{\{\s*([\w.[\]]+)\s*\}\}/g,
      (_match, path: string) => {
        return this.stringify(this.getPath(source, path));
      },
    );
  }

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
