import type { Request, Response } from 'express';
import * as content from './content.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok, created } from '../../lib/apiResponse';

/* ── Reviews ── */
export const listReviews = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await content.listReviews());
});
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await content.createReview(req.body), 'Review created');
});
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await content.updateReview(req.params.id, req.body), { message: 'Review updated' });
});
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  await content.deleteReview(req.params.id);
  return ok(res, null, { message: 'Review deleted' });
});

/* ── Certifications ── */
export const listCertifications = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = (req.query as { activeOnly?: boolean }).activeOnly;
  return ok(res, await content.listCertifications({ activeOnly }));
});
export const createCertification = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await content.createCertification(req.body), 'Certification created');
});
export const updateCertification = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await content.updateCertification(req.params.id, req.body), {
    message: 'Certification updated',
  });
});
export const deactivateCertification = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await content.deactivateCertification(req.params.id), {
    message: 'Certification deactivated',
  });
});
