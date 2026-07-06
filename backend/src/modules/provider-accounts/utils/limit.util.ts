import { BadRequestException } from '@nestjs/common';
import { NullableLimit } from '../interfaces/provider-limits.interface';

export function resolveLimit(
  overrideValue: NullableLimit | undefined,
  defaultValue: NullableLimit,
): NullableLimit {
  return overrideValue === undefined ? defaultValue : overrideValue;
}

export function remainingLimit(
  used: number,
  limit: NullableLimit,
): NullableLimit {
  if (limit === null) {
    return null;
  }
  return Math.max(limit - used, 0);
}

export function assertWithinLimit(
  used: number,
  limit: NullableLimit,
  message: string,
): void {
  if (limit !== null && used >= limit) {
    throw new BadRequestException(message);
  }
}
