import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import { PartnerTenant, WaChatMessage } from "../models/index.js";

const MAX_MEDIA_BYTES = 100 * 1024 * 1024;

function mediaError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function validateProviderMediaPath(mediaPath, userId) {
  const value = String(mediaPath || "").trim();
  const segments = value.split("/");
  if (
    !/^\/uploads\/[a-zA-Z0-9._/-]+$/.test(value) ||
    segments.some((segment) => segment === "." || segment === "..") ||
    path.posix.normalize(value) !== value
  ) {
    throw mediaError("Invalid media path", 400, "INVALID_MEDIA_PATH");
  }
  const privateRoot = "/uploads/private/";
  const ownedPrivatePrefix = `${privateRoot}${String(userId || "")}/`;
  if (value.startsWith(privateRoot) && !value.startsWith(ownedPrivatePrefix)) {
    throw mediaError("Media not found", 404, "MEDIA_NOT_FOUND");
  }
  return value;
}

export async function blockPartnerChatMedia(req, res, next) {
  try {
    const mediaPath = `/uploads${req.path}`;
    const message = await WaChatMessage.findOne({ mediaUrl: mediaPath })
      .select("userId")
      .lean();
    if (!message?.userId) return next();
    const partnerOwned = await PartnerTenant.exists({ userId: message.userId });
    if (!partnerOwned) return next();
    return res.status(404).json({ error: "Not found" });
  } catch {
    return res.status(503).json({
      error: "Media authorization is temporarily unavailable",
    });
  }
}

export async function getProviderChatMedia(req, res) {
  try {
    const userId = String(req.user?._id || "");
    const mediaPath = validateProviderMediaPath(req.query.path, userId);
    const referenced = await WaChatMessage.exists({
      userId: req.user._id,
      mediaUrl: mediaPath,
    });
    if (!referenced) {
      throw mediaError("Media not found", 404, "MEDIA_NOT_FOUND");
    }

    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const absolutePath = path.resolve(
      uploadsRoot,
      mediaPath.slice("/uploads/".length),
    );
    if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
      throw mediaError("Invalid media path", 400, "INVALID_MEDIA_PATH");
    }
    const [resolvedRoot, resolvedFile] = await Promise.all([
      realpath(uploadsRoot),
      realpath(absolutePath),
    ]).catch(() => {
      throw mediaError("Media not found", 404, "MEDIA_NOT_FOUND");
    });
    if (!resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw mediaError("Invalid media path", 400, "INVALID_MEDIA_PATH");
    }
    const file = await stat(resolvedFile);
    if (!file.isFile() || file.size > MAX_MEDIA_BYTES) {
      throw mediaError("Media is unavailable", 413, "MEDIA_UNAVAILABLE");
    }

    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    return res.sendFile(resolvedFile);
  } catch (error) {
    return res.status(Number(error?.statusCode || 500)).json({
      success: false,
      code: error?.code || "MEDIA_FETCH_FAILED",
      error: error?.message || "Media could not be loaded",
    });
  }
}
