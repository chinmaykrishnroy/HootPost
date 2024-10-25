import multer from 'multer';

// Set up multer to handle file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    return cb(null, true);
  }
});

export default upload;
