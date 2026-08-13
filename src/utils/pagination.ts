import { HttpError } from '../utils';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(q: Record<string, unknown>): {
  limit: number;
  skip: number;
  page?: number;
} {
  const rawLimit = q.limit;
  const rawSkip = q.skip;
  const rawPage = q.page;

  let limit = DEFAULT_LIMIT;
  let skip = 0;
  let page: number | undefined;

  if (rawLimit !== undefined && rawLimit !== '') {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Invalid limit');
    limit = Math.min(n, MAX_LIMIT);
  }

  if (rawSkip !== undefined && rawSkip !== '') {
    const n = Number(rawSkip);
    if (!Number.isInteger(n) || n < 0) throw new HttpError(400, 'Invalid skip');
    skip = n;
  } else if (rawPage !== undefined && rawPage !== '') {
    const n = Number(rawPage);
    if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Invalid page');
    page = n;
    skip = (n - 1) * limit;
  }

  return page !== undefined ? { limit, skip, page } : { limit, skip };
}

export function parsePositiveIntParam(value: string | undefined, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, `Invalid ${label}`);
  return n;
}
