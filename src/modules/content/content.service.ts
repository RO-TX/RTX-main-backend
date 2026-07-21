import { Review, Certification } from '../../models';
import { ApiError } from '../../lib/ApiError';

/* ── Reviews (homepage testimonials) ── */

export async function listReviews() {
  return Review.find().sort({ createdAt: -1 });
}

export async function createReview(input: {
  image: string;
  name: string;
  position: string;
  description: string;
}) {
  return Review.create(input);
}

export async function updateReview(id: string, patch: Record<string, unknown>) {
  const review = await Review.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  if (!review) throw ApiError.notFound('Review not found');
  return review;
}

export async function deleteReview(id: string) {
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw ApiError.notFound('Review not found');
}

/* ── Certifications ── */

export async function listCertifications(opts: { activeOnly?: boolean } = {}) {
  const filter = opts.activeOnly ? { isActive: true, expiryDate: { $gt: new Date() } } : {};
  return Certification.find(filter).sort({ createdAt: -1 });
}

export interface CertificationInput {
  title: string;
  description: string;
  issuedBy: string;
  issueDate: string | Date;
  expiryDate: string | Date;
  image: string;
  verificationId: string;
}

export async function createCertification(input: CertificationInput) {
  return Certification.create(input);
}

export async function updateCertification(id: string, patch: Partial<CertificationInput>) {
  const cert = await Certification.findById(id);
  if (!cert) throw ApiError.notFound('Certification not found');
  Object.assign(cert, patch);
  await cert.save(); // re-runs validators (expiry > issue) + uppercase hook
  return cert;
}

/** Soft-delete (matches old site) — sets isActive:false rather than removing. */
export async function deactivateCertification(id: string) {
  const cert = await Certification.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!cert) throw ApiError.notFound('Certification not found');
  return cert;
}
