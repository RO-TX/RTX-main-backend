import { Router } from 'express';
import multer from 'multer';
import { uploadImage, uploadRepairAttachment } from './uploads.controller';
import { requireAuth, requireStaff } from '../../middleware/auth';
import { ApiError } from '../../lib/ApiError';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// Repair attachments also accept short video clips of the fault.
const ALLOWED_REPAIR_MIME = new Set([
  ...ALLOWED_MIME,
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const uploadRepair = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — video clips are bigger than photos
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_REPAIR_MIME.has(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/image', requireAuth, requireStaff, upload.single('file'), uploadImage);

// Public: no auth, matches POST /support/repair-requests itself being public.
// Rate-limited by the app-wide apiLimiter already applied to all /api routes.
router.post('/repair-attachment', uploadRepair.single('file'), uploadRepairAttachment);

export default router;
