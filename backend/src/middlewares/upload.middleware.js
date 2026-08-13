import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const avatarsDir = path.join(__dirname, '../../uploads/avatars');

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
};

export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export const getAvatarPublicPath = (filename) => `/uploads/avatars/${filename}`;

export const deleteAvatarFile = (profileImagePath) => {
  if (!profileImagePath || !profileImagePath.startsWith('/uploads/avatars/')) {
    return;
  }

  const filePath = path.join(__dirname, '../..', profileImagePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};
