import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

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

// Configure storage for image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, `image-${uniqueSuffix}${fileExtension}`);
  }
});

// File filter for image files only
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// Configure multer for image uploads
export const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  },
  fileFilter: imageFileFilter
});

// Image processing function
export const processImage = async (inputPath: string, outputDir: string, filename: string) => {
  const nameWithoutExt = path.parse(filename).name;
  
  // Create thumbnails directory
  const thumbnailDir = path.join(outputDir, 'thumbnails');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  // Process original image (compress and resize if needed)
  const compressedPath = path.join(outputDir, `${nameWithoutExt}-compressed.jpg`);
  await sharp(inputPath)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(compressedPath);

  // Generate thumbnail
  const thumbnailPath = path.join(thumbnailDir, `${nameWithoutExt}-thumb.jpg`);
  await sharp(inputPath)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toFile(thumbnailPath);

  // Get image metadata
  const metadata = await sharp(inputPath).metadata();

  return {
    originalPath: inputPath,
    compressedPath,
    thumbnailPath,
    width: metadata.width,
    height: metadata.height,
    compressedFilename: `${nameWithoutExt}-compressed.jpg`,
    thumbnailFilename: `${nameWithoutExt}-thumb.jpg`
  };
};

// Enhanced upload error handler for images
export const handleImageUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image file size too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one image allowed.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name. Use "image" field.' });
    }
  }
  
  if (error.message === 'Only image files (JPEG, PNG, GIF, WebP) are allowed') {
    return res.status(400).json({ error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed.' });
  }
  
  next(error);
};

// Configure storage for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, `video-${uniqueSuffix}${fileExtension}`);
  }
});

// File filter for video files only
const videoFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /mp4|mov|avi|webm|mkv|flv|m4v|3gp/;
  const allowedMimeTypes = /video\/(mp4|quicktime|x-msvideo|webm|x-matroska|x-flv|x-m4v|3gpp)/;
  
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (MP4, MOV, AVI, WebM, MKV, FLV, M4V, 3GP) are allowed'));
  }
};

// Configure multer for video uploads
export const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    files: 1 // Only one file at a time
  },
  fileFilter: videoFileFilter
});

// Video processing function
export const processVideo = async (inputPath: string, outputDir: string, filename: string): Promise<{
  originalPath: string;
  thumbnailPath: string;
  duration: number;
  width: number;
  height: number;
  thumbnailFilename: string;
  bitrate: number;
}> => {
  const nameWithoutExt = path.parse(filename).name;
  
  // Create thumbnails directory
  const thumbnailDir = path.join(outputDir, 'thumbnails');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    // Get video metadata first
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found in file'));
        return;
      }

      const duration = metadata.format.duration || 0;
      const width = videoStream.width || 0;
      const height = videoStream.height || 0;

      // Generate thumbnail at 1-second mark (or 10% of duration if less than 10 seconds)
      const thumbnailTime = duration < 10 ? Math.max(1, duration * 0.1) : 1;
      const thumbnailPath = path.join(thumbnailDir, `${nameWithoutExt}-thumb.jpg`);

      ffmpeg(inputPath)
        .screenshots({
          timestamps: [thumbnailTime],
          filename: `${nameWithoutExt}-thumb.jpg`,
          folder: thumbnailDir,
          size: '320x240'
        })
        .on('end', () => {
          resolve({
            originalPath: inputPath,
            thumbnailPath,
            duration,
            width,
            height,
            thumbnailFilename: `${nameWithoutExt}-thumb.jpg`,
            bitrate: videoStream.bit_rate ? parseInt(videoStream.bit_rate) : 0
          });
        })
        .on('error', (error) => {
          reject(new Error(`Failed to generate video thumbnail: ${error.message}`));
        });
    });
  });
};

// Enhanced upload error handler for videos
export const handleVideoUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Video file size too large. Maximum size is 100MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one video allowed.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name. Use "video" field.' });
    }
  }
  
  if (error.message === 'Only video files (MP4, MOV, AVI, WebM, MKV, FLV, M4V, 3GP) are allowed') {
    return res.status(400).json({ error: 'Only video files (MP4, MOV, AVI, WebM, MKV, FLV, M4V, 3GP) are allowed.' });
  }
  
  next(error);
};