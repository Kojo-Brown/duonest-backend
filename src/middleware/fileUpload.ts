import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure storage for voice message uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'voice');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname) || '.webm';
    cb(null, `voice-${uniqueSuffix}${fileExtension}`);
  }
});

// File filter for audio files only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
};

// Configure multer with storage, size limits, and file filter
export const voiceUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

// Middleware to handle multer errors
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name. Use "audio" field.' });
    }
  }
  
  if (error.message === 'Only audio files are allowed') {
    return res.status(400).json({ error: 'Only audio files are allowed.' });
  }
  
  next(error);
};