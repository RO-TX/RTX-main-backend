import type { Request, Response } from 'express';
import * as support from './support.service';
import { asyncHandler } from '../../lib/asyncHandler';
import { ok, created, paginated } from '../../lib/apiResponse';

/* ── Repair ── */
export const createRepair = asyncHandler(async (req: Request, res: Response) => {
  const rr = await support.createRepairRequest(req.body);
  return created(res, rr, 'Repair request submitted');
});
export const listRepair = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; limit: number; status?: 'pending' | 'completed' };
  const { items, pagination } = await support.listRepairRequests(q);
  return paginated(res, items, pagination);
});
export const updateRepair = asyncHandler(async (req: Request, res: Response) => {
  const rr = await support.updateRepairRequest(req.params.id, req.body);
  return ok(res, rr, { message: 'Repair request updated' });
});

/* ── AMC ── */
export const createAmc = asyncHandler(async (req: Request, res: Response) => {
  const enquiry = await support.createAmcEnquiry(req.body);
  return created(res, enquiry, 'Enquiry submitted');
});
export const listAmc = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as {
    page: number;
    limit: number;
    status?: 'new' | 'contacted' | 'closed';
  };
  const { items, pagination } = await support.listAmcEnquiries(q);
  return paginated(res, items, pagination);
});
export const updateAmc = asyncHandler(async (req: Request, res: Response) => {
  const enquiry = await support.updateAmcEnquiry(req.params.id, req.body.status);
  return ok(res, enquiry, { message: 'Enquiry updated' });
});
export const deleteAmc = asyncHandler(async (req: Request, res: Response) => {
  await support.deleteAmcEnquiry(req.params.id);
  return ok(res, null, { message: 'Enquiry deleted' });
});
