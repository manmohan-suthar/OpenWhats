import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  WAProto as proto,
} from "@whiskeysockets/baileys";
import CampaignService from "./CampaignService.js";
import WhatsAppService, { getSessionSocket } from "./WhatsAppService.js";
import mediaMessageService from "./mediaMessageService.js";
import SubscriptionService from "./SubscriptionService.js";
import { Message } from "../models/index.js";

const MEDIA_TYPES = new Set(["text", "image", "video", "audio", "document"]);
const MEDIA_ALIASES = {
  photo: "image",
  picture: "image",
  img: "image",
  file: "document",
  pdf: "document",
  doc: "document",
  voice: "audio",
  ptt: "audio",
};

const CTA_TYPE_ALIASES = {
  call: "cta_call",
  phone: "cta_call",
  mobile: "cta_call",
  cta_call: "cta_call",
  url: "cta_url",
  link: "cta_url",
  website: "cta_url",
  cta_url: "cta_url",
  copy: "cta_copy",
  code: "cta_copy",
  coupon: "cta_copy",
  cta_copy: "cta_copy",
  quick: "quick_reply",
  reply: "quick_reply",
  quick_reply: "quick_reply",
  whatsapp: "cta_url",
  chat: "cta_url",
};

const TEXT_LIMITS = {
  message: 4096,
  header: 60,
  footer: 60,
  button: 25,
};

function toText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function normalizePhoneDigits(phone) {
  const digits = toText(phone).replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

function assertLength(name, value, max) {
  if (value && value.length > max) {
    throw new Error(`${name} is too long. Max ${max} characters allowed`);
  }
}

function assertUrl(url, fieldName) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error(`${fieldName} must be a valid http/https URL`);
  }
}

function inferMediaTypeFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp)$/.test(pathname)) return "image";
    if (/\.(mp4|mov|webm|mkv)$/.test(pathname)) return "video";
    if (/\.(mp3|wav|ogg|m4a|aac)$/.test(pathname)) return "audio";
  } catch {
    // URL validation runs later and will return the public error.
  }

  return "document";
}

function normalizeMediaType(body) {
  const explicitType = toText(
    body.media_type ||
      body.meda_type ||
      body.mediaType ||
      body.media?.type,
  );
  const bodyType = toText(body.type).toLowerCase().replace(/[\s-]+/g, "_");
  const typeFromBody =
    MEDIA_TYPES.has(bodyType) || MEDIA_ALIASES[bodyType] ? bodyType : "";
  const mediaUrl = body.media?.url || body.mediaUrl || body.url;
  const rawType = (explicitType || typeFromBody || (mediaUrl ? inferMediaTypeFromUrl(mediaUrl) : "text"))
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const mediaType = MEDIA_ALIASES[rawType] || rawType || "text";
  if (!MEDIA_TYPES.has(mediaType)) {
    throw new Error(
      `Unsupported media_type "${rawType}". Supported: ${Array.from(MEDIA_TYPES).join(", ")}`,
    );
  }

  return mediaType;
}

function normalizeButtonType(rawType, fallbackType, button = {}) {
  const inferredType = button.url || button.link || button.href
    ? "url"
    : button.number || button.phone || button.mobile
      ? "call"
      : button.code || button.copy_code || button.copyCode
        ? "copy"
        : "";
  const normalized = toText(rawType || fallbackType || inferredType)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const ctaType = CTA_TYPE_ALIASES[normalized] || normalized;
  if (!ctaType) {
    throw new Error(
      "cta_type is required when buttons are provided and button type cannot be inferred",
    );
  }

  if (!["cta_call", "cta_url", "cta_copy", "quick_reply"].includes(ctaType)) {
    throw new Error(
      `Unsupported cta_type "${normalized}". Supported: call, url, copy, quick_reply, whatsapp`,
    );
  }

  return ctaType;
}

function buildWhatsAppChatUrl(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits || digits.length < 10) {
    throw new Error("Button number must include a valid country code");
  }
  return `https://wa.me/${digits}`;
}

function normalizeButtons(buttons, defaultCtaType) {
  if (!buttons) return [];
  if (!Array.isArray(buttons)) {
    throw new Error("buttons must be an array");
  }
  if (buttons.length > 10) {
    throw new Error("Maximum 10 buttons are allowed");
  }

  return buttons.map((rawButton, index) => {
    const button =
      typeof rawButton === "string" ? { text: rawButton } : rawButton || {};
    if (!button || typeof button !== "object") {
      throw new Error(`Button ${index + 1} must be an object`);
    }

    const params = button.params && typeof button.params === "object"
      ? button.params
      : {};
    const type = normalizeButtonType(
      button.type || button.cta_type || button.ctaType || button.name,
      defaultCtaType,
      button,
    );
    const displayText = toText(
      button.text || button.label || button.title || params.display_text,
    );

    if (!displayText) {
      throw new Error(`Button ${index + 1}: text is required`);
    }
    assertLength(`Button ${index + 1} text`, displayText, TEXT_LIMITS.button);

    if (type === "cta_call") {
      const phone = toText(
        button.number || button.phone || button.mobile || params.phone_number,
      );
      const digits = normalizePhoneDigits(phone);
      if (!digits || digits.length < 10) {
        throw new Error(`Button ${index + 1}: number/phone is required`);
      }

      return {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: displayText,
          phone_number: phone,
        }),
      };
    }

    if (type === "cta_url") {
      let url = toText(button.url || button.link || button.href || params.url);
      if (!url && (button.number || button.phone || button.mobile)) {
        url = buildWhatsAppChatUrl(
          button.number || button.phone || button.mobile,
        );
      }
      if (!url) {
        throw new Error(`Button ${index + 1}: url is required`);
      }
      assertUrl(url, `Button ${index + 1} url`);

      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: displayText,
          url,
          merchant_url: url,
        }),
      };
    }

    if (type === "cta_copy") {
      const code = toText(
        button.code || button.copy_code || button.copyCode || params.copy_code,
      );
      if (!code) {
        throw new Error(`Button ${index + 1}: code/copy_code is required`);
      }

      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: displayText,
          copy_code: code,
        }),
      };
    }

    return {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: displayText,
        id:
          toText(button.id || params.id) ||
          `quick_reply_${Date.now()}_${index + 1}`,
      }),
    };
  });
}

function extractMessageText(body) {
  if (body.message && typeof body.message === "object") {
    return toText(
      body.message.text ||
        body.message.body ||
        body.message.caption ||
        body.message.message,
    );
  }

  return toText(
    body.message || body.text || body.body || body.caption || body.media?.caption,
  );
}

export function isUnifiedMessagePayload(body = {}) {
  if (!body || typeof body !== "object") return false;

  const rawType = toText(body.type).toLowerCase();
  const hasUnifiedFields = Boolean(
    body.cta_type ||
      body.ctaType ||
      body.media_type ||
      body.meda_type ||
      body.mediaType ||
      body.mediaUrl ||
      body.url ||
      Array.isArray(body.buttons) ||
      (body.media && typeof body.media === "object" && body.media.url),
  );

  return hasUnifiedFields || MEDIA_TYPES.has(rawType);
}

export function normalizeUnifiedPayload(body = {}) {
  const sessionId = toText(body.sessionId || body.session);
  const phoneNumber = toText(body.phoneNumber || body.to);
  const contactName = toText(body.contactName || body.name);
  const header = toText(body.header || body.title);
  const footer = toText(body.footer || body.fotter);
  const message = extractMessageText(body);
  const mediaType = normalizeMediaType(body);
  const media = body.media && typeof body.media === "object" ? body.media : {};
  const mediaUrl = toText(media.url || body.mediaUrl || body.url);
  const mediaCaption = toText(media.caption || body.caption);
  const mediaFileName = toText(
    media.filename || media.fileName || body.filename || body.fileName,
  );
  const mediaMimeType = toText(
    media.mimeType || media.mimetype || body.mimeType || body.mimetype,
  );
  const defaultCtaType = toText(body.cta_type || body.ctaType);
  const buttons = normalizeButtons(body.buttons, defaultCtaType);
  const effectiveMessage = message || mediaCaption;

  if (!sessionId) {
    throw new Error("session (or sessionId) is required");
  }
  if (!phoneNumber) {
    throw new Error("to (or phoneNumber) is required");
  }
  if (!phoneNumber.includes("@") && normalizePhoneDigits(phoneNumber).length < 10) {
    throw new Error("to must be a valid WhatsApp number with country code");
  }

  assertLength("message", effectiveMessage, TEXT_LIMITS.message);
  assertLength("header", header, TEXT_LIMITS.header);
  assertLength("footer", footer, TEXT_LIMITS.footer);

  if (mediaUrl) {
    assertUrl(mediaUrl, "media.url");
  }

  if (mediaType !== "text" && !mediaUrl && !body.mediaBase64) {
    throw new Error("media.url is required when media_type is not text");
  }

  if (!effectiveMessage && mediaType === "text" && buttons.length === 0) {
    throw new Error("message is required");
  }

  if (buttons.length > 0 && !effectiveMessage) {
    throw new Error("message or media.caption is required when buttons are used");
  }

  return {
    sessionId,
    phoneNumber,
    contactName,
    header,
    footer,
    message: effectiveMessage,
    media: {
      type: mediaType,
      url: mediaUrl,
      caption: mediaCaption,
      filename: mediaFileName,
      mimeType: mediaMimeType,
    },
    cta_type: defaultCtaType,
    buttons,
  };
}

function mediaInputForHeader(media) {
  if (!media.url || media.type === "text") return null;

  if (media.type === "image") {
    return { image: { url: media.url } };
  }

  if (media.type === "video") {
    return {
      video: { url: media.url },
      mimetype: media.mimeType || "video/mp4",
    };
  }

  if (media.type === "document") {
    return {
      document: { url: media.url },
      mimetype: media.mimeType || "application/pdf",
      fileName: media.filename || "document",
    };
  }

  throw new Error(
    "audio media cannot be attached to interactive button messages. Send audio without buttons or use image/video/document with buttons.",
  );
}

async function buildInteractiveContent(sock, normalized) {
  const mediaInput = mediaInputForHeader(normalized.media);
  let header;

  if (mediaInput) {
    const prepared = await prepareWAMessageMedia(mediaInput, {
      upload: sock.waUploadToServer,
    });

    header = proto.Message.InteractiveMessage.Header.create({
      title: normalized.header || "",
      hasMediaAttachment: true,
      imageMessage: prepared.imageMessage,
      videoMessage: prepared.videoMessage,
      documentMessage: prepared.documentMessage,
    });
  } else {
    header = proto.Message.InteractiveMessage.Header.create({
      title: normalized.header || "",
      hasMediaAttachment: false,
    });
  }

  return proto.Message.InteractiveMessage.create({
    header,
    body: proto.Message.InteractiveMessage.Body.create({
      text: normalized.message,
    }),
    footer: proto.Message.InteractiveMessage.Footer.create({
      text: normalized.footer || "",
    }),
    nativeFlowMessage:
      proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: normalized.buttons,
      }),
  });
}

function buildLogMessage(normalized) {
  const parts = [];
  if (normalized.media.type !== "text") parts.push(normalized.media.type);
  if (normalized.buttons.length > 0) parts.push(`${normalized.buttons.length} button(s)`);
  parts.push(normalized.message);
  return parts.filter(Boolean).join(": ");
}

class UnifiedMessageService {
  async sendUnifiedMessage({ userId, body, source = "ui" }) {
    let normalized;
    try {
      normalized = normalizeUnifiedPayload(body);
    } catch (err) {
      err.statusCode = 400;
      err.code = "BAD_REQUEST";
      throw err;
    }

    if (normalized.buttons.length === 0) {
      if (normalized.media.type !== "text" || normalized.media.url) {
        return mediaMessageService.sendMediaMessage({
          userId,
          sessionId: normalized.sessionId,
          phoneNumber: normalized.phoneNumber,
          type: normalized.media.type,
          message: normalized.message,
          contactName: normalized.contactName,
          media: normalized.media,
          source,
        });
      }

      return CampaignService.sendSingleMessage(
        userId,
        normalized.sessionId,
        normalized.phoneNumber,
        normalized.message,
        normalized.contactName,
        null,
        null,
        { source },
      );
    }

    const session = await CampaignService.findUserSession(
      userId,
      normalized.sessionId,
    );

    if (!session) {
      const err = new Error("Session not found");
      err.statusCode = 404;
      err.code = "SESSION_NOT_FOUND";
      throw err;
    }

    const sock = getSessionSocket(session.sessionId);
    if (!sock?.user?.id) {
      WhatsAppService.scheduleReconnect?.(session.sessionId, {
        delayMs: 1000,
        reason: "send_attempt_offline",
      });
      const err = new Error("Session is not connected");
      err.statusCode = 503;
      err.code = "SESSION_OFFLINE";
      throw err;
    }

    const jid = WhatsAppService.normalizeJid(normalized.phoneNumber);
    const msgDoc = new Message({
      sessionId: session._id,
      phoneNumber: jid.replace("@s.whatsapp.net", ""),
      contactName: normalized.contactName,
      message: buildLogMessage(normalized),
      messageType: "single",
      status: "pending",
      source,
    });

    try {
      await SubscriptionService.assertMessageQuota({ _id: userId }, 1);

      const interactiveMessage = await buildInteractiveContent(sock, normalized);
      const msg = generateWAMessageFromContent(
        jid,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage,
            },
          },
        },
        {},
      );

      await sock.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
      });

      await SubscriptionService.consumeMessageQuota(userId, 1);

      msgDoc.status = "sent";
      msgDoc.sentAt = new Date();
      await msgDoc.save();

      return {
        success: true,
        messageId: `msg_${msgDoc._id}`,
        to: jid.replace("@s.whatsapp.net", ""),
        status: "sent",
        type: normalized.media.type,
        cta_type: normalized.cta_type || "mixed",
        buttons: normalized.buttons.length,
        media: normalized.media.url
          ? {
              source: "url",
              type: normalized.media.type,
              url: normalized.media.url,
              name: normalized.media.filename || null,
              mimeType: normalized.media.mimeType || null,
            }
          : null,
        timestamp: msgDoc.sentAt.toISOString(),
      };
    } catch (err) {
      msgDoc.status = "failed";
      msgDoc.error = err.message;
      await msgDoc.save().catch(() => null);
      throw err;
    }
  }
}

export default new UnifiedMessageService();
