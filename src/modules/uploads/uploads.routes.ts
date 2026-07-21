import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from './uploads.controller';
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

const router = Router();

router.post('/image', requireAuth, requireStaff, upload.single('file'), uploadImage);

export default router;
