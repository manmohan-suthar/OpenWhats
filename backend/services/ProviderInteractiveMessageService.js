import crypto from "node:crypto";
import {
  generateWAMessageFromContent,
  WAProto as proto,
} from "@whiskeysockets/baileys";
import {
  ProviderMessageRequest,
  WaChat,
  WaChatMessage,
  WhatsAppSession,
} from "../models/index.js";
import { getSessionSocket } from "./WhatsAppService.js";
import { publishPartnerMessageSentEvent } from "./PartnerMessageEventService.js";

const SUPPORTED_TYPES = Object.freeze([
  "quick_reply",
  "list",
  "cta_url",
  "cta_call",
  "native_flow",
]);

class ProviderInteractiveError extends Error {
  constructor(message, { statusCode = 400, code = "INVALID_INTERACTIVE_MESSAGE", details } = {}) {
    super(message);
    this.name = "ProviderInteractiveError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function text(value, label, { required = false, max = 1024 } = {}) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (required && !normalized) {
    throw new ProviderInteractiveError(`${label} is required`);
  }
  if (normalized.length > max) {
    throw new ProviderInteractiveError(`${label} must be at most ${max} characters`);
  }
  return normalized;
}

function actionId(value, label = "action id") {
  const normalized = text(value, label, { required: true, max: 256 });
  if (!/^[A-Za-z0-9._~:-]+$/.test(normalized)) {
    throw new ProviderInteractiveError(
      `${label} may contain only letters, numbers, dot, underscore, tilde, colon, and hyphen`,
    );
  }
  return normalized;
}

function phone(value) {
  const normalized = String(value || "").trim();
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new ProviderInteractiveError("button phone must contain 10 to 15 digits");
  }
  return normalized.startsWith("+") ? `+${digits}` : digits;
}

function httpsUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    throw new ProviderInteractiveError("button url must be a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:") {
    throw new ProviderInteractiveError("button url must use HTTPS");
  }
  if (parsed.username || parsed.password) {
    throw new ProviderInteractiveError("button url must not contain credentials");
  }
  return parsed.toString();
}

function normalizeSections(input, { maxSections = 10, maxRows = 10 } = {}) {
  if (!Array.isArray(input) || input.length === 0 || input.length > maxSections) {
    throw new ProviderInteractiveError(`sections must contain 1 to ${maxSections} items`);
  }
  let rowCount = 0;
  const sections = input.map((section, sectionIndex) => {
    const rows = Array.isArray(section?.rows) ? section.rows : [];
    if (!rows.length) {
      throw new ProviderInteractiveError(`sections[${sectionIndex}].rows is required`);
    }
    const normalizedRows = rows.map((row, rowIndex) => {
      rowCount += 1;
      return {
        id: actionId(row?.id ?? row?.rowId, `sections[${sectionIndex}].rows[${rowIndex}].id`),
        title: text(row?.title, `sections[${sectionIndex}].rows[${rowIndex}].title`, {
          required: true,
          max: 24,
        }),
        description: text(
          row?.description,
          `sections[${sectionIndex}].rows[${rowIndex}].description`,
          { max: 72 },
        ),
      };
    });
    return {
      title: text(section?.title, `sections[${sectionIndex}].title`, {
        required: true,
        max: 24,
      }),
      rows: normalizedRows,
    };
  });
  if (rowCount > maxRows) {
    throw new ProviderInteractiveError(`sections may contain at most ${maxRows} rows in total`);
  }
  return sections;
}

export function normalizeProviderInteractivePayload(payload) {
  const type = text(payload?.type, "type", { required: true, max: 40 });
  if (!SUPPORTED_TYPES.includes(type)) {
    throw new ProviderInteractiveError(
      `type must be one of: ${SUPPORTED_TYPES.join(", ")}`,
    );
  }
  const data = payload?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ProviderInteractiveError("data must be an object");
  }

  const common = {
    body: text(data.body, "data.body", { required: true, max: 1024 }),
    title: text(data.title ?? data.header, "data.title", { max: 60 }),
    footer: text(data.footer, "data.footer", { max: 60 }),
    fallbackText: text(data.fallbackText, "data.fallbackText", { max: 1200 }),
  };

  if (type === "quick_reply") {
    if (!Array.isArray(data.buttons) || data.buttons.length < 1 || data.buttons.length > 3) {
      throw new ProviderInteractiveError("quick_reply requires 1 to 3 buttons");
    }
    return {
      type,
      data: {
        ...common,
        buttons: data.buttons.map((button, index) => ({
          id: actionId(button?.id ?? button?.actionId, `data.buttons[${index}].id`),
          text: text(button?.text ?? button?.label, `data.buttons[${index}].text`, {
            required: true,
            max: 20,
          }),
        })),
      },
    };
  }

  if (type === "cta_url" || type === "cta_call") {
    const buttons = Array.isArray(data.buttons) ? data.buttons : [];
    if (buttons.length !== 1) {
      throw new ProviderInteractiveError(`${type} requires exactly one button`);
    }
    const button = buttons[0] || {};
    return {
      type,
      data: {
        ...common,
        buttons: [
          {
            text: text(button.text ?? button.label, "data.buttons[0].text", {
              required: true,
              max: 20,
            }),
            ...(type === "cta_url"
              ? { url: httpsUrl(button.url) }
              : { phone: phone(button.phone) }),
          },
        ],
      },
    };
  }

  const sections = normalizeSections(data.sections, {
    maxSections: 10,
    maxRows: 10,
  });
  if (type === "list") {
    return {
      type,
      data: {
        ...common,
        buttonText: text(data.buttonText, "data.buttonText", {
          required: true,
          max: 20,
        }),
        sections,
      },
    };
  }

  const flowName = text(data.flowName || "single_select", "data.flowName", {
    required: true,
    max: 40,
  });
  if (flowName !== "single_select") {
    throw new ProviderInteractiveError("native_flow currently supports only single_select");
  }
  return {
    type,
    data: {
      ...common,
      flowName,
      buttonText: text(data.buttonText, "data.buttonText", {
        required: true,
        max: 20,
      }),
      sections,
    },
  };
}

function interactiveEnvelope(data, buttons) {
  return {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          header: proto.Message.InteractiveMessage.Header.create({
            title: data.title || "",
            hasMediaAttachment: false,
          }),
          body: proto.Message.InteractiveMessage.Body.create({ text: data.body }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            text: data.footer || "",
          }),
          nativeFlowMessage:
            proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons }),
        }),
      },
    },
  };
}

function buildContent(normalized) {
  const { type, data } = normalized;
  if (type === "quick_reply") {
    return interactiveEnvelope(
      data,
      data.buttons.map((button) => ({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          id: button.id,
        }),
      })),
    );
  }
  if (type === "cta_url") {
    const button = data.buttons[0];
    return interactiveEnvelope(data, [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          url: button.url,
          merchant_url: button.url,
        }),
      },
    ]);
  }
  if (type === "cta_call") {
    const button = data.buttons[0];
    return interactiveEnvelope(data, [
      {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          phone_number: button.phone,
        }),
      },
    ]);
  }
  if (type === "list") {
    return {
      listMessage: {
        title: data.title || "",
        description: data.body,
        buttonText: data.buttonText,
        footerText: data.footer || "",
        sections: data.sections.map((section) => ({
          title: section.title,
          rows: section.rows.map((row) => ({
            rowId: row.id,
            title: row.title,
            description: row.description,
          })),
        })),
      },
    };
  }
  return interactiveEnvelope(data, [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: data.buttonText,
        sections: data.sections,
      }),
    },
  ]);
}

function summarize(normalized) {
  const { type, data } = normalized;
  const actions =
    type === "list" || type === "native_flow"
      ? data.sections.flatMap((section) =>
          section.rows.map((row) => ({ id: row.id, text: row.title })),
        )
      : data.buttons.map((button) => ({
          id: button.id || null,
          text: button.text,
          url: button.url || null,
          phone: button.phone || null,
        }));
  return {
    type,
    title: data.title || "",
    body: data.body,
    footer: data.footer || "",
    fallbackText: data.fallbackText || "",
    actions,
  };
}

function normalizeChatJid(value) {
  const decoded = decodeURIComponent(String(value || "").trim());
  if (/^\d{5,20}@(s\.whatsapp\.net|lid|g\.us)$/.test(decoded)) return decoded;
  if (/^\d{10,15}$/.test(decoded)) return `${decoded}@s.whatsapp.net`;
  throw new ProviderInteractiveError("chatJid is invalid");
}

function requestHash(input) {
  return crypto.createHash("sha256").update(stableStringify(input)).digest("hex");
}

function normalizeIdempotencyKey(value) {
  const key = String(value || "").trim();
  if (key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._~:-]+$/.test(key)) {
    throw new ProviderInteractiveError(
      "Idempotency-Key must be 8 to 128 safe characters",
      { code: "INVALID_IDEMPOTENCY_KEY" },
    );
  }
  return key;
}

async function existingResult(userId, key, hash) {
  const existing = await ProviderMessageRequest.findOne({
    userId,
    idempotencyKey: key,
  }).lean();
  if (!existing) return null;
  if (existing.requestHash !== hash) {
    throw new ProviderInteractiveError(
      "Idempotency-Key was already used with another request",
      { statusCode: 409, code: "IDEMPOTENCY_KEY_CONFLICT" },
    );
  }
  if (existing.status === "succeeded") {
    return { ...existing.response, duplicate: true };
  }
  if (existing.status === "processing" && existing.providerMessageId) {
    const persistedMessage = await WaChatMessage.findOne({
      userId,
      sessionId: existing.sessionId,
      messageId: existing.providerMessageId,
    }).lean();
    if (
      persistedMessage &&
      ["sent", "delivered", "read"].includes(persistedMessage.status)
    ) {
      const recoveredResponse = {
        success: true,
        message: {
          messageId: persistedMessage.messageId,
          sessionId: persistedMessage.sessionId,
          chatJid: persistedMessage.chatJid,
          direction: persistedMessage.direction,
          status: persistedMessage.status,
          messageType: persistedMessage.messageType,
          text: persistedMessage.text,
          interactive: persistedMessage.interactive,
          timestamp: persistedMessage.timestamp?.toISOString?.() || null,
        },
        duplicate: true,
        recovered: true,
      };
      await ProviderMessageRequest.updateOne(
        { _id: existing._id, status: "processing" },
        {
          $set: {
            status: "succeeded",
            response: recoveredResponse,
            completedAt: new Date(),
          },
        },
      );
      return recoveredResponse;
    }
  }
  throw new ProviderInteractiveError(
    existing.status === "processing"
      ? "The original request is still processing; do not resend with a new key"
      : "The original request failed; inspect the error and use a new key only when a new send is intended",
    {
      statusCode: 409,
      code:
        existing.status === "processing"
          ? "IDEMPOTENCY_REQUEST_IN_PROGRESS"
          : "IDEMPOTENCY_REQUEST_FAILED",
    },
  );
}

export async function sendProviderInteractiveMessage({
  userId,
  sessionId,
  chatJid,
  idempotencyKey,
  payload,
}) {
  const key = normalizeIdempotencyKey(idempotencyKey);
  const normalized = normalizeProviderInteractivePayload(payload);
  const ownedSession = await WhatsAppSession.findOne({ sessionId, userId }).lean();
  if (!ownedSession) {
    throw new ProviderInteractiveError("Session not found", {
      statusCode: 404,
      code: "SESSION_NOT_FOUND",
    });
  }
  if (ownedSession.status !== "connected") {
    throw new ProviderInteractiveError("Session is not connected", {
      statusCode: 409,
      code: "SESSION_NOT_CONNECTED",
    });
  }
  const normalizedChatJid = normalizeChatJid(chatJid);
  const hash = requestHash({
    sessionId,
    chatJid: normalizedChatJid,
    payload: normalized,
  });
  const prior = await existingResult(userId, key, hash);
  if (prior) return prior;

  const sock = getSessionSocket(sessionId);
  if (!sock) {
    throw new ProviderInteractiveError("Connected session socket is unavailable", {
      statusCode: 503,
      code: "SESSION_SOCKET_UNAVAILABLE",
    });
  }
  const built = generateWAMessageFromContent(
    normalizedChatJid,
    buildContent(normalized),
    {},
  );
  const providerMessageId = built?.key?.id;
  if (!providerMessageId) {
    throw new ProviderInteractiveError("Unable to generate provider message ID", {
      statusCode: 500,
      code: "PROVIDER_MESSAGE_BUILD_FAILED",
    });
  }
  const interactive = summarize(normalized);
  let requestRecord;
  try {
    requestRecord = await ProviderMessageRequest.create({
      userId,
      sessionId,
      chatJid: normalizedChatJid,
      idempotencyKey: key,
      requestHash: hash,
      requestType: "interactive",
      status: "processing",
      providerMessageId,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return existingResult(userId, key, hash);
    }
    throw error;
  }

  const now = new Date();
  await WaChatMessage.create({
    userId,
    sessionId,
    chatJid: normalizedChatJid,
    messageId: providerMessageId,
    text: normalized.data.body,
    direction: "out",
    status: "pending",
    messageType: "interactive",
    interactive,
    timestamp: now,
  });

  try {
    await sock.relayMessage(normalizedChatJid, built.message, {
      messageId: providerMessageId,
    });
    await WaChatMessage.updateOne(
      { userId, sessionId, messageId: providerMessageId },
      { $set: { status: "sent" } },
    );
    await WaChat.findOneAndUpdate(
      { userId, sessionId, chatJid: normalizedChatJid },
      {
        $set: {
          phoneNumber: normalizedChatJid.endsWith("@lid")
            ? normalizedChatJid
            : normalizedChatJid.split("@")[0],
          lastMessage: normalized.data.body,
          lastMessageTime: now,
        },
      },
      { upsert: true },
    );
    const response = {
      success: true,
      message: {
        messageId: providerMessageId,
        sessionId,
        chatJid: normalizedChatJid,
        direction: "out",
        status: "sent",
        messageType: "interactive",
        text: normalized.data.body,
        interactive,
        timestamp: now.toISOString(),
      },
      duplicate: false,
    };
    await ProviderMessageRequest.updateOne(
      { _id: requestRecord._id },
      {
        $set: {
          status: "succeeded",
          response,
          completedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      },
    );
    await publishPartnerMessageSentEvent({
      userId,
      sessionId,
      messageId: providerMessageId,
    }).catch((error) =>
      console.error("[Provider API] partner sent webhook enqueue failed", {
        sessionId,
        messageId: providerMessageId,
        error: error?.message || String(error),
      }),
    );
    return response;
  } catch (error) {
    await Promise.all([
      WaChatMessage.updateOne(
        { userId, sessionId, messageId: providerMessageId },
        { $set: { status: "failed" } },
      ),
      ProviderMessageRequest.updateOne(
        { _id: requestRecord._id },
        {
          $set: {
            status: "failed",
            errorCode: "PROVIDER_INTERACTIVE_SEND_FAILED",
            errorMessage: String(error?.message || error).slice(0, 500),
            completedAt: new Date(),
          },
        },
      ),
    ]);
    throw new ProviderInteractiveError(
      `WhatsApp interactive message failed: ${error?.message || error}`,
      { statusCode: 502, code: "PROVIDER_INTERACTIVE_SEND_FAILED" },
    );
  }
}

export function getProviderInteractiveCapabilities() {
  return {
    types: [...SUPPORTED_TYPES],
    nativeFlows: ["single_select"],
    limits: {
      quickReplyButtons: 3,
      callToActionButtons: 1,
      listSections: 10,
      listRowsTotal: 10,
      bodyCharacters: 1024,
      footerCharacters: 60,
      buttonLabelCharacters: 20,
      actionIdCharacters: 256,
    },
    fallback: "numbered_text",
  };
}

export { ProviderInteractiveError, SUPPORTED_TYPES };
