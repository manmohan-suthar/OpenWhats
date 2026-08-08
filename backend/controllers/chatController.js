import bcrypt from "bcryptjs";
import { WaChat, WaChatMessage, WhatsAppSession } from "../models/index.js";
import CampaignService from "../services/CampaignService.js";
import WhatsAppService from "../services/WhatsAppService.js";
import crypto from "crypto";
import { readFile, unlink } from "fs/promises";
import { executeProviderIdempotentRequest } from "../services/ProviderRequestIdempotencyService.js";
import { uploadedFilePath } from "../utils/fileUpload.js";

const PASSCODE_MAX_FAILURES = 8;
const PASSCODE_LOCK_MS = 15 * 60 * 1000;

function controllerError(message, statusCode, code, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

function sendControllerError(res, error, fallback) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  return res.status(statusCode).json({
    success: false,
    code: error?.code || undefined,
    error: error?.message || fallback,
    ...(error?.details ? { details: error.details } : {}),
  });
}

function passcodeFingerprint(value) {
  const key =
    process.env.PROVIDER_IDEMPOTENCY_SECRET || process.env.JWT_SECRET || "";
  if (!key && process.env.NODE_ENV === "production") {
    throw controllerError(
      "Provider idempotency secret is not configured",
      503,
      "PROVIDER_IDEMPOTENCY_NOT_CONFIGURED",
    );
  }
  return crypto
    .createHmac("sha256", key || "openwhats-development-only")
    .update(String(value || ""))
    .digest("hex");
}

async function verifyStoredPasscode(session, candidate, failureMessage) {
  const lockedUntil = session.chatPasscodeLockedUntil
    ? new Date(session.chatPasscodeLockedUntil)
    : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    throw controllerError(
      "Too many incorrect PIN attempts. Try again later.",
      429,
      "CHAT_PIN_LOCKED",
      { retryAfterSeconds: Math.ceil((lockedUntil.getTime() - Date.now()) / 1000) },
    );
  }

  const match = await bcrypt.compare(
    String(candidate || ""),
    session.chatPasscodeHash,
  );
  if (match) {
    if (
      Number(session.chatPasscodeFailedAttempts || 0) > 0 ||
      session.chatPasscodeLockedUntil
    ) {
      await WhatsAppSession.updateOne(
        { _id: session._id },
        {
          $set: {
            chatPasscodeFailedAttempts: 0,
            chatPasscodeLockedUntil: null,
          },
        },
      );
    }
    return;
  }

  const updated = await WhatsAppSession.findOneAndUpdate(
    { _id: session._id },
    {
      $inc: { chatPasscodeFailedAttempts: 1 },
      $set: { chatPasscodeLockedUntil: null },
    },
    { new: true },
  ).select("+chatPasscodeFailedAttempts +chatPasscodeLockedUntil");
  const attempts = Number(updated?.chatPasscodeFailedAttempts || 1);
  if (attempts >= PASSCODE_MAX_FAILURES) {
    const nextLock = new Date(Date.now() + PASSCODE_LOCK_MS);
    await WhatsAppSession.updateOne(
      { _id: session._id },
      {
        $set: {
          chatPasscodeFailedAttempts: 0,
          chatPasscodeLockedUntil: nextLock,
        },
      },
    );
    throw controllerError(
      "Too many incorrect PIN attempts. Try again in 15 minutes.",
      429,
      "CHAT_PIN_LOCKED",
      { retryAfterSeconds: PASSCODE_LOCK_MS / 1000 },
    );
  }
  throw controllerError(failureMessage, 401, "CHAT_PIN_INCORRECT", {
    attemptsRemaining: PASSCODE_MAX_FAILURES - attempts,
  });
}

function historyMessageStatus(message, isFromMe) {
  if (!isFromMe) return "delivered";
  const status = {
    0: "failed",
    1: "pending",
    2: "sent",
    3: "delivered",
    4: "read",
    5: "read",
  }[Number(message?.status)];
  return status || "sent";
}

// ── Verify passcode ────────────────────────────────────────────────────────────
export const verifyPasscode = async (req, res) => {
  try {
    const { passcode, sessionId } = req.body;
    if (!/^\d{4}$/.test(String(passcode || ""))) {
      return res.status(400).json({ error: "A valid 4-digit PIN is required" });
    }
    if (!sessionId)
      return res.status(400).json({ error: "sessionId is required" });

    const session = await WhatsAppSession.findOne({
      sessionId,
      userId: req.user._id,
    }).select(
      "+chatPasscodeHash +chatPasscodeFailedAttempts +chatPasscodeLockedUntil chatViewEnabled",
    );

    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.chatViewEnabled) {
      return res
        .status(400)
        .json({ error: "Chat view is disabled for this session" });
    }
    if (!session.chatPasscodeHash) {
      return res
        .status(400)
        .json({ error: "Passcode not configured for this session" });
    }

    await verifyStoredPasscode(session, passcode, "Incorrect PIN");
    res.json({ success: true });
  } catch (err) {
    sendControllerError(res, err, "PIN verification failed");
  }
};

// ── Set / change passcode ──────────────────────────────────────────────────────
export const setPasscode = async (req, res) => {
  try {
    const { currentPasscode, newPasscode, sessionId } = req.body;
    if (!sessionId)
      return res.status(400).json({ error: "sessionId is required" });
    if (!/^\d{4}$/.test(String(newPasscode || "")))
      return res
        .status(400)
        .json({ error: "New PIN must be exactly 4 digits" });

    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId,
      chatJid: "chat-pin",
      idempotencyKey:
        req.get("Idempotency-Key") || req.body?.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "chat_pin_update",
      payload: {
        currentPasscode: passcodeFingerprint(currentPasscode),
        newPasscode: passcodeFingerprint(newPasscode),
      },
      execute: async () => {
        const session = await WhatsAppSession.findOne({
          sessionId,
          userId: req.user._id,
        }).select(
          "+chatPasscodeHash +chatPasscodeFailedAttempts +chatPasscodeLockedUntil chatViewEnabled",
        );
        if (!session) {
          throw controllerError(
            "Session not found",
            404,
            "SESSION_NOT_FOUND",
          );
        }
        if (session.chatPasscodeHash) {
          await verifyStoredPasscode(
            session,
            currentPasscode,
            "Current PIN is incorrect",
          );
        }
        session.chatPasscodeHash = await bcrypt.hash(String(newPasscode), 10);
        session.chatPasscodeFailedAttempts = 0;
        session.chatPasscodeLockedUntil = null;
        session.chatViewEnabled = true;
        await session.save();
        return { success: true, message: "PIN updated" };
      },
    });
    res.json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    sendControllerError(res, err, "PIN update failed");
  }
};

// ── Get chat list (inbox) for a session ───────────────────────────────────────
export const getChatList = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 10), 50)
      : 30;
    let cursor = null;
    if (req.query.before) {
      try {
        cursor = JSON.parse(
          Buffer.from(String(req.query.before), "base64url").toString("utf8"),
        );
      } catch {
        const legacyDate = new Date(String(req.query.before));
        if (!Number.isNaN(legacyDate.getTime())) {
          cursor = { t: legacyDate.toISOString(), id: null };
        }
      }
      if (!cursor || !("t" in cursor)) {
        return res.status(400).json({ error: "before cursor is invalid" });
      }
    }
    const session = await WhatsAppSession.findOne({
      sessionId,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const chatQuery = {
      userId: req.user._id,
      sessionId,
      ...(cursor
        ? cursor.t
          ? {
              $or: [
                { lastMessageTime: { $lt: new Date(cursor.t) } },
                ...(cursor.id
                  ? [
                      {
                        lastMessageTime: new Date(cursor.t),
                        _id: { $lt: cursor.id },
                      },
                    ]
                  : []),
                { lastMessageTime: null },
              ],
            }
          : {
              lastMessageTime: null,
              ...(cursor.id ? { _id: { $lt: cursor.id } } : {}),
            }
        : {}),
    };
    const total = await WaChat.countDocuments({
      userId: req.user._id,
      sessionId,
    });
    const chats = await WaChat.find(chatQuery)
      .sort({ lastMessageTime: -1, _id: -1 })
      .limit(safeLimit + 1)
      .lean();
    const hasMore = chats.length > safeLimit;
    const pageChats = chats.slice(0, safeLimit);

    // Also report sync status so frontend knows if we're still loading
    const sock = WhatsAppService.getSocket(sessionId);
    const isConnected = !!sock?.user?.id;
    const resolvedChats = await Promise.all(
      pageChats.map(async (chat) => {
        if (!chat.chatJid?.endsWith("@lid")) return chat;
        const storedPhone = String(chat.phoneNumber || "");
        const lidUser = chat.chatJid.split("@")[0];
        const storedDigits = storedPhone.replace(/\D/g, "");
        if (
          storedDigits.length >= 10 &&
          storedDigits.length <= 15 &&
          storedDigits !== lidUser &&
          !storedPhone.endsWith("@lid")
        ) {
          return chat;
        }
        try {
          const phoneJid =
            await sock?.signalRepository?.lidMapping?.getPNForLID?.(
              chat.chatJid,
            );
          if (!phoneJid) return chat;
          const phoneNumber = String(phoneJid).split("@")[0].split(":")[0];
          if (!phoneNumber || phoneNumber === lidUser) return chat;
          WaChat.updateOne(
            { _id: chat._id },
            { $set: { phoneNumber } },
          ).catch(() => {});
          return { ...chat, phoneNumber };
        } catch (_) {
          return chat;
        }
      }),
    );

    res.json({
      success: true,
      chats: resolvedChats,
      isConnected,
      count: resolvedChats.length,
      total,
      hasMore,
      nextCursor: hasMore
        ? Buffer.from(
            JSON.stringify({
              t:
                resolvedChats[resolvedChats.length - 1]?.lastMessageTime ||
                null,
              id:
                resolvedChats[resolvedChats.length - 1]?._id?.toString() ||
                null,
            }),
          ).toString("base64url")
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get messages for a specific chat ─────────────────────────────────────────
export const getChatMessages = async (req, res) => {
  try {
    const { sessionId, chatJid } = req.params;
    const { limit = 50, before } = req.query;
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 50;

    const session = await WhatsAppSession.findOne({
      sessionId,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const query = { userId: req.user._id, sessionId, chatJid };
    if (before) {
      const beforeDate = new Date(before);
      if (Number.isNaN(beforeDate.getTime())) {
        return res.status(400).json({ error: "before must be a valid date" });
      }
      query.timestamp = { $lt: beforeDate };
    }

    let messages = await WaChatMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(safeLimit)
      .lean();

    // If no messages in DB yet, try loading from Baileys in-memory store
    if (messages.length === 0) {
      try {
        const waMessages = await WhatsAppService.loadChatHistory(
          sessionId,
          chatJid,
          safeLimit,
          before || null,
        );
        if (waMessages.length > 0) {
          // Save them to DB so next call is instant
          for (const msg of waMessages) {
            const archived = Boolean(msg.messageId && msg.timestamp);
            if (!archived && !msg.message) continue;
            const isFromMe = archived
              ? msg.direction === "out"
              : !!msg.key.fromMe;
            const msgContent = archived
              ? null
              : msg.message?.viewOnceMessage?.message || msg.message;
            const text =
              (archived ? msg.text : "") ||
              msgContent?.conversation ||
              msgContent?.extendedTextMessage?.text ||
              msgContent?.imageMessage?.caption ||
              msgContent?.videoMessage?.caption ||
              msgContent?.documentMessage?.caption ||
              "";
            const mediaType = archived
              ? msg.mediaType || null
              : msgContent?.imageMessage
              ? "image"
              : msgContent?.videoMessage
                ? "video"
                : msgContent?.documentMessage
                  ? "document"
                  : msgContent?.audioMessage
                    ? "audio"
                    : null;
            const timestamp = archived
              ? new Date(msg.timestamp)
              : msg.messageTimestamp
                ? new Date(Number(msg.messageTimestamp) * 1000)
                : new Date();
            const messageId = archived ? msg.messageId : msg.key.id;
            const mediaUrl =
              archived && mediaType
                ? await WhatsAppService.materializeArchivedMedia(msg, req.user._id)
                : null;
            try {
              await WaChatMessage.findOneAndUpdate(
                { messageId, sessionId },
                {
                  userId: req.user._id,
                  sessionId,
                  chatJid,
                  messageId,
                  text: text || "",
                  direction: isFromMe ? "out" : "in",
                  status: archived
                    ? msg.status
                    : historyMessageStatus(msg, isFromMe),
                  mediaType,
                  mediaUrl,
                  mediaName: archived ? msg.mediaName || null : null,
                  timestamp,
                },
                { upsert: true, new: true },
              );
            } catch (_) {}
          }
          // Reload from DB after saving
          messages = await WaChatMessage.find(query)
            .sort({ timestamp: -1 })
            .limit(safeLimit)
            .lean();
        }
      } catch (_) {}
    }

    // Media is materialized only for the currently requested message page.
    // This keeps historical media out of storage until the user opens/scrolls
    // to that batch while still replacing generic "Attachment" placeholders.
    const missingMedia = messages.filter(
      (message) => message.mediaType && !message.mediaUrl,
    );
    if (missingMedia.length > 0) {
      try {
        let archivedRows = await WhatsAppService.loadChatHistory(
          sessionId,
          chatJid,
          100,
          before || null,
        );
        if (!archivedRows.some((row) => row.sourceMessage)) {
          const anchor = messages[0];
          const requested = await WhatsAppService.requestChatHistory(
            sessionId,
            chatJid,
            100,
            anchor,
          );
          if (requested) {
            await new Promise((resolve) => setTimeout(resolve, 1_200));
            archivedRows = await WhatsAppService.loadChatHistory(
              sessionId,
              chatJid,
              100,
              before || null,
            );
          }
        }
        const archiveById = new Map(
          archivedRows.map((row) => [String(row.messageId), row]),
        );
        await Promise.all(
          missingMedia.map(async (message) => {
            const archived = archiveById.get(String(message.messageId));
            if (!archived?.sourceMessage) return;
            const mediaUrl =
              await WhatsAppService.materializeArchivedMedia(archived, req.user._id);
            if (!mediaUrl) return;
            message.mediaUrl = mediaUrl;
            await WaChatMessage.updateOne(
              { _id: message._id },
              { $set: { mediaUrl } },
            );
          }),
        );
      } catch (_) {}
    }

    // Mark chat as read
    await WaChat.updateOne(
      { userId: req.user._id, sessionId, chatJid },
      { $set: { unreadCount: 0 } },
    );

    const orderedMessages = messages.reverse();
    res.json({
      success: true,
      messages: orderedMessages,
      hasMore: messages.length === safeLimit,
      nextCursor: orderedMessages[0]?.timestamp || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Send message in a chat ─────────────────────────────────────────────────────
export const sendChatMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    // chatJid comes from body to avoid Express dot-truncation in route params
    const { message, chatJid: bodyJid } = req.body;
    const file = req.file;

    const chatJid = bodyJid;
    if (!chatJid) return res.status(400).json({ error: "chatJid is required" });

    const session = await WhatsAppSession.findOne({
      sessionId,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status !== "connected")
      return res.status(400).json({ error: "Session not connected" });

    // Resolve the actual recipient JID for sending
    // @lid JIDs are WhatsApp internal IDs — we need the real phone number stored in WaChat
    let sendRecipient;
    if (chatJid.endsWith("@lid")) {
      const waChat = await WaChat.findOne({
        userId: req.user._id,
        sessionId,
        chatJid,
      }).lean();
      const lidUser = chatJid.split("@")[0];
      const mappedPhone = String(waChat?.phoneNumber || "").replace(/\D/g, "");
      const hasRealPhoneMapping =
        mappedPhone.length >= 10 &&
        mappedPhone.length <= 15 &&
        mappedPhone !== lidUser;
      if (hasRealPhoneMapping) {
        // Real phone stored — WhatsAppService will append @s.whatsapp.net
        sendRecipient = mappedPhone;
      } else {
        // The LID's numeric portion is not a phone number. Sending it as a PN
        // causes Baileys USync to return no result, so preserve the real LID.
        sendRecipient = chatJid;
      }
    } else if (chatJid.endsWith("@g.us")) {
      sendRecipient = chatJid; // groups: pass full JID
    } else {
      // @s.whatsapp.net — strip suffix, WhatsAppService will add it back
      sendRecipient = chatJid.replace(/@.*/, "");
    }
    const phoneNumber = sendRecipient;
    let mediaPath = null;
    let mediaType = null;
    let mediaName = null;

    if (file) {
      mediaPath = file.path;
      mediaType = file.mimetype;
      mediaName = file.originalname;
    }

    const fileDigest = file
      ? crypto.createHash("sha256").update(await readFile(file.path)).digest("hex")
      : null;
    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId,
      chatJid,
      idempotencyKey:
        req.get("Idempotency-Key") || req.body.clientMessageId,
      requireKey: req.authMode === "api-key",
      requestType: "chat_message",
      payload: {
        message: message || "",
        file: file
          ? {
              digest: fileDigest,
              name: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
            }
          : null,
      },
      execute: async () => {
        const result = await CampaignService.sendSingleMessage(
          req.user._id,
          sessionId,
          phoneNumber,
          message || "",
          "",
          mediaPath,
          mediaType,
          { source: req.authMode === "api-key" ? "api" : "ui" },
        );

        const displayText = message || (mediaName ? `[${mediaName}]` : "[file]");
        const outboundMessageId = result.messageId || `out-${Date.now()}`;
        let messageReceipt = {
          userId: req.user._id,
          sessionId,
          chatJid,
          messageId: outboundMessageId,
          text: displayText,
          direction: "out",
          status: "sent",
          mediaType: file
            ? file.mimetype.split("/")[0] === "application"
              ? "document"
              : file.mimetype.split("/")[0]
            : null,
          mediaUrl: file ? uploadedFilePath(file) : null,
          mediaName: mediaName || null,
          timestamp: new Date(),
        };
        try {
          const msgDoc = await WaChatMessage.findOneAndUpdate(
            { sessionId, messageId: outboundMessageId },
            {
              $setOnInsert: messageReceipt,
            },
            { upsert: true, new: true },
          );
          messageReceipt = msgDoc.toObject();
        } catch (error) {
          console.error("Chat receipt persistence failed after accepted send:", {
            sessionId,
            chatJid,
            messageId: outboundMessageId,
            error: error?.message || String(error),
          });
        }

        // The provider send and immutable message receipt are authoritative.
        // Inbox summary refresh must never turn an accepted send into an
        // uncertain failure that a caller may retry with a new key.
        await WaChat.findOneAndUpdate(
          { userId: req.user._id, sessionId, chatJid },
          {
            $set: {
              lastMessage: displayText,
              lastMessageTime: new Date(),
            },
          },
          { upsert: true },
        ).catch((error) => {
          console.error("Chat summary refresh failed after accepted send:", {
            sessionId,
            chatJid,
            messageId: outboundMessageId,
            error: error?.message || String(error),
          });
        });
        return { success: true, message: messageReceipt };
      },
    });
    if (handled.duplicate && file?.path) {
      await unlink(file.path).catch(() => null);
    }
    res.json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    if (req.file?.path) await unlink(req.file.path).catch(() => null);
    res.status(err.statusCode || 500).json({
      success: false,
      code: err.code || "CHAT_MESSAGE_SEND_FAILED",
      error: err.message,
    });
  }
};

// ── Mark chat as read ──────────────────────────────────────────────────────────
export const markChatRead = async (req, res) => {
  try {
    const { sessionId, chatJid } = req.params;
    const session = await WhatsAppSession.exists({
      sessionId,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId,
      chatJid,
      idempotencyKey:
        req.get("Idempotency-Key") || req.body?.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "chat_mark_read",
      payload: { chatJid },
      execute: async () => {
        await WaChat.updateOne(
          { userId: req.user._id, sessionId, chatJid },
          { $set: { unreadCount: 0 } },
        );
        return { success: true };
      },
    });
    res.json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    sendControllerError(res, err, "Failed to mark chat as read");
  }
};

// ── Force sync — reconnect session so messaging-history.set fires again ────────
export const forceSync = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await WhatsAppSession.findOne({
      sessionId,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId,
      chatJid: "chat-sync",
      idempotencyKey:
        req.get("Idempotency-Key") || req.body?.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "chat_sync",
      payload: { sessionId },
      execute: async () => {
        // Reconnect triggers messaging-history.set which re-syncs chats.
        await WhatsAppService.reconnectSession(sessionId);
        return {
          success: true,
          message: "Reconnecting session — chats will sync in a few seconds",
        };
      },
    });
    res.json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    sendControllerError(res, err, "Chat sync failed");
  }
};
