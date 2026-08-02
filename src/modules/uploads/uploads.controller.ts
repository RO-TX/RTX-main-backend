import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { ApiError } from '../../lib/ApiError';
import { ok } from '../../lib/apiResponse';
import { uploadToS3 } from '../../lib/s3';

const ALLOWED_FOLDERS = new Set(['products', 'categories', 'certifications', 'reviews', 'repairs']);

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded (field name must be "file")');
  }

  const folder = typeof req.body.folder === 'string' ? req.body.folder : 'misc';
  if (!ALLOWED_FOLDERS.has(folder)) {
    throw ApiError.badRequest(`Invalid folder. Must be one of: ${[...ALLOWED_FOLDERS].join(', ')}`);
  }

  const url = await uploadToS3({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
    folder,
  });

  ok(res, { url }, { status: 201, message: 'File uploaded' });
});

/** Public: customer photo/video attachment for a repair request. Folder is fixed
 * server-side (never client-supplied) so anonymous callers can't write anywhere else. */
export const uploadRepairAttachment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded (field name must be "file")');
  }

  const url = await uploadToS3({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
    folder: 'repairs',
  });

  const type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  ok(res, { url, type, filename: req.file.originalname, size: req.file.size }, { status: 201, message: 'File uploaded' });
});
