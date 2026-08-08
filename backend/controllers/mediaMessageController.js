import mediaMessageService from "../services/mediaMessageService.js";
import { sendSubscriptionError } from "../utils/subscription.js";
import crypto from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { executeProviderIdempotentRequest } from "../services/ProviderRequestIdempotencyService.js";

export const sendMediaMessage = async (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = body.sessionId || body.session;
    const phoneNumber = body.phoneNumber || body.to;
    const type = body.type || (body.media && body.media.type) || "text";
    const message = body.message || body.caption || body.media?.caption || "";
    const contactName = body.contactName || "";
    const media =
      body.media && typeof body.media === "object"
        ? body.media
        : {
            url: body.mediaUrl || body.url || "",
            caption: body.caption || "",
            filename: body.filename || "",
          };

    if (!sessionId || !phoneNumber) {
      return res.status(400).json({
        error: "session (or sessionId) and to (or phoneNumber) are required",
      });
    }

    const fileDigest = req.file?.path
      ? crypto
          .createHash("sha256")
          .update(await readFile(req.file.path))
          .digest("hex")
      : null;
    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId,
      chatJid: String(phoneNumber),
      idempotencyKey: req.get("Idempotency-Key"),
      requireKey: req.authMode === "api-key",
      requestType: "media_message",
      payload: {
        phoneNumber: String(phoneNumber),
        type,
        message,
        contactName,
        media,
        file: req.file
          ? {
              digest: fileDigest,
              name: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size,
            }
          : null,
      },
      execute: () =>
        mediaMessageService.sendMediaMessage({
          userId: req.user._id,
          sessionId,
          phoneNumber,
          type,
          message,
          contactName,
          media,
          file: req.file || null,
          source: req.authMode === "api-key" ? "api" : "ui",
        }),
    });
    if (handled.duplicate && req.file?.path) {
      await unlink(req.file.path).catch(() => null);
    }

    return res.json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    return sendSubscriptionError(res, err, "Failed to send media message");
  }
};

export default { sendMediaMessage };
