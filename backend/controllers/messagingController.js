import { WhatsAppSession, Message } from "../models/index.js";
import CampaignService from "../services/CampaignService.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { sendSubscriptionError } from "../utils/subscription.js";
import unifiedMessageService, {
  isUnifiedMessagePayload,
} from "../services/unifiedMessageService.js";
import { executeProviderIdempotentRequest } from "../services/ProviderRequestIdempotencyService.js";

export const sendMessage = async (req, res) => {
  let tempFilePath = null;

  try {
    const body = req.body;
    const source = req.authMode === "api-key" ? "api" : "ui";

    if (isUnifiedMessagePayload(body)) {
      const mediaBase64 = body.mediaBase64 || body.media_base64 || null;
      const handled = await executeProviderIdempotentRequest({
        userId: req.user._id,
        sessionId: body.sessionId || body.session,
        chatJid: String(body.phoneNumber || body.to || ""),
        idempotencyKey: req.get("Idempotency-Key"),
        requireKey: req.authMode === "api-key",
        requestType: "unified_message",
        payload: {
          ...body,
          ...(mediaBase64
            ? {
                mediaBase64: undefined,
                media_base64: undefined,
                mediaHash: crypto
                  .createHash("sha256")
                  .update(Buffer.from(mediaBase64, "base64"))
                  .digest("hex"),
              }
            : {}),
        },
        execute: () =>
          unifiedMessageService.sendUnifiedMessage({
            userId: req.user._id,
            body,
            source,
          }),
      });

      return res.json({ ...handled.response, duplicate: handled.duplicate });
    }

    // Accept both field name styles:
    //   API-key users:   { session, to, message, contactName }
    //   Internal/legacy: { sessionId, phoneNumber, message, contactName }
    const sessionId = body.sessionId || body.session;
    const phoneNumber = body.phoneNumber || body.to;
    const {
      message,
      contactName,
      mediaBase64,
      mediaType,
      mediaName,
      type,
      templetId,
      data,
    } = body;

    // If payload is an interactive template (type present), forward to interactive handler
    if (type) {
      if (req.authMode === "api-key") {
        return res.status(400).json({
          success: false,
          code: "USE_PROVIDER_INTERACTIVE_ENDPOINT",
          error:
            "API keys must send interactive messages through /api/v1/sessions/:sessionId/chats/:chatJid/interactive with Idempotency-Key",
        });
      }
      try {
        // Lazy import to avoid circular deps
        const { sendInteractiveMessage } =
          await import("./interactiveController.js");

        // Convert curl format (message object) to internal format (data object)
        let dataPayload = data || body.data || {};

        if (message && typeof message === "object" && !data) {
          // Map curl format to internal format
          let button = null;
          if (message.button) {
            // Add type field based on button properties
            button = { ...message.button };
            if (button.code && !button.type) button.type = "cta_copy";
            else if (button.phone && !button.type) button.type = "cta_call";
            else if (button.url && !button.type) button.type = "cta_url";
          }

          dataPayload = {
            header: message.header,
            body: message.text,
            footer: message.footer,
            buttons: button ? [button] : [],
          };
        }

        // Build a fake req object for the interactive handler
        const fakeReq = {
          body: {
            sessionId: sessionId,
            to: phoneNumber,
            type: type,
            data: dataPayload,
          },
          // Propagate auth/user context so interactive handler can
          // create Message logs with correct `source` (api vs ui).
          user: req.user,
          authMode: req.authMode,
        };

        return await sendInteractiveMessage(fakeReq, res);
      } catch (err) {
        console.error(
          "Failed to send interactive message via /api/messages/send:",
          err.message,
        );
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (!sessionId || !phoneNumber || !message) {
      return res.status(400).json({
        error:
          "session (or sessionId), to (or phoneNumber), and message are required",
      });
    }

    let mediaPath = null;

    // Handle base64 encoded media
    if (mediaBase64 && mediaType) {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(mediaBase64, "base64");

        // Create temp file
        tempFilePath = join(
          tmpdir(),
          `whatsapp-media-${Date.now()}-${mediaName || "file"}`,
        );
        writeFileSync(tempFilePath, buffer);

        mediaPath = tempFilePath;
      } catch (err) {
        return res
          .status(400)
          .json({ error: `Failed to process media: ${err.message}` });
      }
    }

    try {
      const handled = await executeProviderIdempotentRequest({
        userId: req.user._id,
        sessionId,
        chatJid: String(phoneNumber),
        idempotencyKey: req.get("Idempotency-Key"),
        requireKey: req.authMode === "api-key",
        requestType: "message",
        payload: {
          phoneNumber: String(phoneNumber),
          message,
          contactName: contactName || "",
          mediaType: mediaType || null,
          mediaName: mediaName || null,
          mediaHash: mediaBase64
            ? crypto
                .createHash("sha256")
                .update(Buffer.from(mediaBase64, "base64"))
                .digest("hex")
            : null,
        },
        execute: () =>
          CampaignService.sendSingleMessage(
            req.user._id,
            sessionId,
            phoneNumber,
            message,
            contactName,
            mediaPath,
            mediaType,
            { source },
          ),
      });

      res.json({ ...handled.response, duplicate: handled.duplicate });
    } finally {
      // Clean up temp file
      if (tempFilePath) {
        try {
          unlinkSync(tempFilePath);
        } catch (err) {
          console.error("Failed to clean up temp file:", err.message);
        }
      }
    }
  } catch (err) {
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath);
      } catch (e) {
        console.error("Failed to clean up temp file:", e.message);
      }
    }
    return sendSubscriptionError(res, err, "Failed to send message");
  }
};

export const getSessionMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const messages = await Message.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ sessionId: session._id });

    res.json({
      messages: messages.map((m) => ({
        messageId: m._id,
        phoneNumber: m.phoneNumber,
        contactName: m.contactName,
        message: m.message,
        status: m.status,
        error: m.error,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const messageId = String(req.params.messageId || "").trim();
    const status = String(req.body?.status || "").trim().toLowerCase();

    if (!messageId || !status) {
      return res
        .status(400)
        .json({ error: "messageId and status are required" });
    }

    // Validate status
    const validStatuses = ["pending", "sent", "failed", "delivered", "read"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: "messageId is invalid" });
    }
    const current = await Message.findById(messageId);
    if (!current) {
      return res.status(404).json({ error: "Message not found" });
    }
    const ownedSession = await WhatsAppSession.exists({
      _id: current.sessionId,
      userId: req.user._id,
    });
    if (!ownedSession) {
      return res.status(404).json({ error: "Message not found" });
    }
    const allowedTransitions = {
      pending: ["sent", "failed", "delivered", "read"],
      sent: ["failed", "delivered", "read"],
      failed: ["sent", "delivered", "read"],
      delivered: ["read"],
      read: [],
    };
    if (
      status !== current.status &&
      !allowedTransitions[current.status]?.includes(status)
    ) {
      return res.status(409).json({
        success: false,
        code: "MESSAGE_STATUS_REGRESSION",
        error: `Message status cannot move from ${current.status} to ${status}`,
      });
    }

    const updateData = { status };
    if (status === "delivered") {
      updateData.deliveredAt = new Date();
    } else if (status === "read") {
      updateData.readAt = new Date();
    }

    const message =
      status === current.status
        ? current
        : await Message.findOneAndUpdate(
            { _id: messageId, sessionId: current.sessionId, status: current.status },
            updateData,
            { new: true },
          );
    if (!message) {
      return res.status(409).json({
        success: false,
        code: "MESSAGE_STATUS_CHANGED",
        error: "Message status changed concurrently; fetch it and retry",
      });
    }

    res.json({
      success: true,
      message: {
        messageId: message._id,
        phoneNumber: message.phoneNumber,
        status: message.status,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default {
  sendMessage,
  getSessionMessages,
  updateMessageStatus,
};
