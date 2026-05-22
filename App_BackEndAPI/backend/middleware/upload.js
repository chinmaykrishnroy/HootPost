import multer from 'multer';
import config from '../config/config.js';

const storage = multer.memoryStorage();

const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const imageUpload = multer({
  storage,
  limits: { fileSize: config.maxImageUploadBytes },
  fileFilter: (req, file, cb) => {
    if (!imageMimeTypes.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, GIF, WebP, HEIC, and HEIF images are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const attachmentUpload = multer({
  storage,
  limits: { fileSize: config.maxAttachmentUploadBytes },
});

export default imageUpload;
