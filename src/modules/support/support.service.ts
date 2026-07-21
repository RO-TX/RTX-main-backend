import { RepairRequest, AmcEnquiry } from '../../models';
import { ApiError } from '../../lib/ApiError';

/* ── Repair requests ── */

export interface RepairAttachmentInput {
  url: string;
  type: 'image' | 'video';
  filename?: string;
  size?: number;
}

export interface RepairInput {
  name: string;
  email: string;
  mobile: string;
  pincode: string;
  district: string;
  city: string;
  address: string;
  description: string;
  attachments?: RepairAttachmentInput[];
}

export async function createRepairRequest(input: RepairInput) {
  // Booking fee ₹249 (in paise). Payment wiring (Razorpay) comes in the payments phase.
  return RepairRequest.create({
    ...input,
    attachments: input.attachments ?? [],
    amount: 24900,
    paymentStatus: 'unpaid',
  });
}

export async function listRepairRequests(params: {
  page: number;
  limit: number;
  status?: 'pending' | 'completed';
}) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  const [items, total] = await Promise.all([
    RepairRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit),
    RepairRequest.countDocuments(filter),
  ]);
  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function updateRepairRequest(
  id: string,
  patch: { status?: 'pending' | 'completed'; paymentStatus?: string },
) {
  const req = await RepairRequest.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!req) throw ApiError.notFound('Repair request not found');
  return req;
}

/* ── AMC enquiries ── */

export interface AmcInput {
  name: string;
  email: string;
  address: string;
  mobile: string;
  message?: string;
}

export async function createAmcEnquiry(input: AmcInput) {
  return AmcEnquiry.create(input);
}

export async function listAmcEnquiries(params: {
  page: number;
  limit: number;
  status?: 'new' | 'contacted' | 'closed';
}) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  const [items, total] = await Promise.all([
    AmcEnquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit),
    AmcEnquiry.countDocuments(filter),
  ]);
  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function updateAmcEnquiry(id: string, status: 'new' | 'contacted' | 'closed') {
  const enquiry = await AmcEnquiry.findByIdAndUpdate(id, { status }, { new: true });
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  return enquiry;
}

export async function deleteAmcEnquiry(id: string) {
  const enquiry = await AmcEnquiry.findByIdAndDelete(id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
}
