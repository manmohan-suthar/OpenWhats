import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const partnerManaged =
      req.user?.managedByPartner || req.user?.authProvider === "partner";
    const userId = String(req.user?._id || "");
    if (partnerManaged && /^[a-f0-9]{24}$/i.test(userId)) {
      const privateDir = path.join(uploadsDir, "private", userId);
      fs.mkdirSync(privateDir, { recursive: true });
      cb(null, privateDir);
      return;
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow common file types
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

export default upload;

// Helper to format file path for frontend
export const formatFilePath = (filename) => {
  return `/uploads/${filename}`;
};

export const uploadedFilePath = (file) => {
  const relative = path.relative(uploadsDir, file.path).split(path.sep).join("/");
  if (!relative || relative.startsWith("../") || relative.includes("/../")) {
    throw new Error("Uploaded file path is outside the upload directory");
  }
  return `/uploads/${relative}`;
};
