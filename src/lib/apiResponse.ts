import type { Response } from 'express';

/** Consistent success envelope: { success: true, data, message?, meta? } */
export interface Paginated {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(
  res: Response,
  data: T,
  opts: { message?: string; status?: number; meta?: Record<string, unknown> } = {},
): Response {
  return res.status(opts.status ?? 200).json({
    success: true,
    ...(opts.message ? { message: opts.message } : {}),
    data,
    ...(opts.meta ? { meta: opts.meta } : {}),
  });
}

export function created<T>(res: Response, data: T, message?: string): Response {
  return ok(res, data, { status: 201, message });
}

export function paginated<T>(
  res: Response,
  items: T[],
  pagination: Paginated,
  message?: string,
): Response {
  return ok(res, items, { meta: { pagination }, message });
}
