import { HttpError } from '../utils';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(q: Record<string, unknown>): { limit: number; skip: number } {
  const rawLimit = q.limit;
  const rawSkip = q.skip;

  let limit = DEFAULT_LIMIT;
  let skip = 0;

  if (rawLimit !== undefined && rawLimit !== '') {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Invalid limit');
    limit = Math.min(n, MAX_LIMIT);
  }

  if (rawSkip !== undefined && rawSkip !== '') {
    const n = Number(rawSkip);
    if (!Number.isInteger(n) || n < 0) throw new HttpError(400, 'Invalid skip');
    skip = n;
  }

  return { limit, skip };
}

export function parsePositiveIntParam(value: string | undefined, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, `Invalid ${label}`);
  return n;
}
