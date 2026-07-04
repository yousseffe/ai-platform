import { BadRequestException } from '@nestjs/common';
import { assertWithinLimit, remainingLimit, resolveLimit } from './limit.util';

describe('provider limit utilities', () => {
  it('uses provider override values before tier defaults', () => {
    expect(resolveLimit(3, 10)).toBe(3);
    expect(resolveLimit(undefined, 10)).toBe(10);
    expect(resolveLimit(null, 10)).toBeNull();
  });

  it('treats null limits as unlimited', () => {
    expect(remainingLimit(500, null)).toBeNull();
    expect(() => assertWithinLimit(500, null, 'blocked')).not.toThrow();
  });

  it('throws when finite limits are exhausted', () => {
    expect(() => assertWithinLimit(2, 2, 'limit reached')).toThrow(
      BadRequestException,
    );
  });
});
