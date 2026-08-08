// import makeWASocket, {
//   useMultiFileAuthState,
//   DisconnectReason,
//   fetchLatestBaileysVersion,
//   Browsers,
// } from "@whiskeysockets/baileys";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  downloadMediaMessage,
} from "@itsliaaa/baileys";
import { Boom } from "@hapi/boom";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as qrcode from "qrcode";
import {
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  statSync,
} from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import {
  WhatsAppSession as SessionModel,
  Message,
  WaChat,
  WaChatMessage,
} from "../models/index.js";
import { handleIncomingMessage } from "./AiAgentService.js";
import { executeFlowOnMessage } from "../controllers/flowExecutionController.js";
import PartnerTenantService from "./PartnerTenantService.js";
import PartnerWebhookService from "./PartnerWebhookService.js";
import {
  publishPartnerMessageReceivedEvent,
  publishPartnerMessageSentEvent,
} from "./PartnerMessageEventService.js";
import {
  extractInteractiveResponse,
  interactiveResponseText,
  unwrapMessageContent,
} from "../utils/interactiveResponse.js";
import { createBaileysLogger } from "../utils/baileysLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// const SESSIONS_DIR = join(__dirname, "..", "sessions");\
const SESSIONS_DIR =
  process.env.SESSIONS_DIR || join(process.cwd(), "..", "wa-sessions");

console.log(SESSIONS_DIR);

/**
 * WhatsApp Service with reconnect storm prevention
 *
 * Features implemented to prevent reconnect loops:
 * 1. Reconnect Cooldown: 15-second minimum between reconnects per session
 * 2. Retry Limit: Maximum 5 reconnect attempts before pausing
 * 3. 515 Error Handling: 5-second delayed restart for stream errors (was 2s)
 * 4. Single Socket Enforcement: Prevents duplicate socket creation per session
 * 5. Active Socket Tracking: Uses activeSockets Set to track live connections
 * 6. Exponential Backoff: Gradual increase in reconnect delays (base * 1.5^attempts)
 * 7. Proper Cleanup: removeSocket() method cleans up all tracking maps/sets
 *
 * These features eliminate the "reconnect storm" where 515 errors cause
 * immediate reconnection attempts, creating instability loops.
 */
class WhatsAppService {
  constructor() {
    this.sockets = new Map();
    this.io = null;
    this.pendingQRCodes = new Map();
    this.reconnectAttempts = new Map();
    this.pendingReconnects = new Set();
    this.heartbeats = new Map();
    this.reconnectCooldown = new Map(); // Tracks last reconnect time per session
    this.reconnectTimers = new Map(); // Tracks scheduled reconnect timers per session
    this.activeSockets = new Set(); // Tracks currently active socket connections
    this.duplicateRejectedSessions = new Set();
    this.historyRequestCooldowns = new Map();

    if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  setSocketIO(io) {
    this.io = io;
  }

  clearHeartbeat(sessionId) {
    const t = this.heartbeats.get(sessionId);
    if (t) clearInterval(t);
    this.heartbeats.delete(sessionId);
  }

  clearReconnectTimer(sessionId) {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.reconnectTimers.delete(sessionId);
  }

  getReconnectCooldownRemaining(sessionId) {
    const lastReconnect = this.reconnectCooldown.get(sessionId) || 0;
    const cooldownMs = 15000;
    return Math.max(0, cooldownMs - (Date.now() - lastReconnect));
  }

  /**
   * Check if a session can reconnect based on cooldown period
   * @param {string} sessionId - The session ID
   * @returns {boolean} - True if reconnect is allowed (15 seconds have passed since last reconnect)
   */
  canReconnect(sessionId) {
    const lastReconnect = this.reconnectCooldown.get(sessionId) || 0;
    const cooldownMs = 15000;
    const remainingMs = this.getReconnectCooldownRemaining(sessionId);

    if (remainingMs > 0) {
      console.log(
        `[WA RECONNECT] reconnect blocked (cooldown), ${Math.ceil(remainingMs / 1000)}s remaining`,
        {
          sessionId,
          lastReconnect: new Date(lastReconnect).toISOString(),
          remainingMs,
          cooldownMs,
        },
      );
      return false;
    }
    return true;
  }

  /**
   * Safely remove a socket from all tracking maps/sets
   * @param {string} sessionId - The session ID
   */
  removeSocket(sessionId) {
    this.destroySocket(sessionId);
    this.sockets.delete(sessionId);
    this.activeSockets.delete(sessionId);
    this.clearHeartbeat(sessionId);
  }

  /**
   * Properly destroy a socket connection
   * @param {string} sessionId - The session ID
   */
  destroySocket(sessionId) {
    const sock = this.sockets.get(sessionId);
    if (!sock) return;

    try {
      // Close the WebSocket connection
      if (sock.ws && sock.ws.readyState !== sock.ws.CLOSED) {
        sock.ws.close();
      }
      // Remove all event listeners
      if (sock.ev) {
        sock.ev.removeAllListeners();
      }
      // End the socket gracefully
      sock.end({ reason: "destroy" });
    } catch (e) {
      // Ignore errors during cleanup
    }
  }

  /**
   * Calculate exponential backoff delay for reconnects
   * @param {string} sessionId - The session ID
   * @param {number} baseDelay - Base delay in ms (default: 2000)
   * @param {number} maxDelay - Maximum delay in ms (default: 30000)
   * @returns {number} - Delay in milliseconds
   */
  getReconnectDelay(sessionId, baseDelay = 2000, maxDelay = 30000) {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    const delay = Math.min(maxDelay, baseDelay * Math.pow(1.5, attempts));
    console.log(
      `[WA BACKOFF] session ${sessionId}, attempts ${attempts}, delay ${delay}ms`,
    );
    return delay;
  }

  scheduleReconnect(sessionId, options = {}) {
    const {
      delayMs = this.getReconnectDelay(sessionId, 5000, 300000),
      reason = "auto",
    } = options;

    if (!sessionId) return null;

    const sock = this.sockets.get(sessionId);
    if (sock?.user?.id) {
      this.clearReconnectTimer(sessionId);
      return null;
    }

    if (this.pendingReconnects.has(sessionId)) {
      return null;
    }

    if (this.reconnectTimers.has(sessionId)) {
      return this.reconnectTimers.get(sessionId);
    }

    const safeDelay = Math.max(1000, Math.min(delayMs, 300000));
    console.log("[WA RECONNECT] scheduled", {
      sessionId,
      delayMs: safeDelay,
      reason,
    });

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(sessionId);
      try {
        await this.reconnectSession(sessionId);
      } catch (err) {
        console.error("[WA RECONNECT] scheduled attempt failed", {
          sessionId,
          reason,
          error: err.message,
        });
        if (this.hasSessionCredentials(sessionId)) {
          this.scheduleReconnect(sessionId, {
            reason: "retry_after_error",
          });
        }
      }
    }, safeDelay);

    this.reconnectTimers.set(sessionId, timer);
    return timer;
  }

  hasSessionCredentials(sessionId) {
    return existsSync(join(SESSIONS_DIR, sessionId, "creds.json"));
  }

  async ensureSessionRecovery(sessionId, reason = "ensure_recovery") {
    const sock = this.sockets.get(sessionId);
    if (sock?.user?.id || this.pendingReconnects.has(sessionId)) {
      return { sessionId, status: "connected" };
    }

    if (!this.hasSessionCredentials(sessionId)) {
      return { sessionId, status: "pending" };
    }

    await this.handleSessionStateChange(sessionId, "connecting").catch(
      () => {},
    );
    this.scheduleReconnect(sessionId, { delayMs: 1000, reason });
    return { sessionId, status: "connecting" };
  }

  canTransitionSessionStatus(sessionId, currentStatus, nextStatus) {
    if (!nextStatus || currentStatus === nextStatus) {
      return false;
    }

    const liveSock = this.sockets.get(sessionId);
    const isLiveConnected = !!liveSock?.user?.id;

    // A stale reconnect tick should not downgrade a socket that is already live.
    if (currentStatus === "connected" && nextStatus === "connecting") {
      return !isLiveConnected;
    }

    const allowedTransitions = {
      pending: ["connecting", "disconnected", "failed"],
      connecting: ["pending", "connected", "disconnected", "failed"],
      connected: ["connecting", "disconnected", "failed"],
      disconnected: ["pending", "connecting", "failed"],
      failed: ["pending", "connecting", "disconnected"],
    };

    return (allowedTransitions[currentStatus] || []).includes(nextStatus);
  }

  async handleSessionStateChange(sessionId, status, patch = {}) {
    const session = await SessionModel.findOne({ sessionId }).lean();
    if (!session) {
      return null;
    }

    if (!this.canTransitionSessionStatus(sessionId, session.status, status)) {
      return {
        skipped: true,
        sessionId,
        currentStatus: session.status,
        requestedStatus: status,
      };
    }

    const updateData = {
      status,
      ...patch,
    };

    const updatedSession = await SessionModel.findOneAndUpdate(
      { sessionId, status: session.status },
      { $set: updateData },
      { new: true },
    ).lean();
    if (!updatedSession) {
      return {
        skipped: true,
        sessionId,
        currentStatus: session.status,
        requestedStatus: status,
        reason: "concurrent_transition",
      };
    }
    PartnerWebhookService.enqueueForUser(
      session.userId,
      "whatsapp.session.status",
      {
        sessionId,
        status,
        phoneNumber: patch.phoneNumber || session.phoneNumber || "",
        lastConnected: patch.lastConnected || session.lastConnected || null,
      },
    ).catch((error) =>
      console.error("[PARTNER WEBHOOK] session event failed:", error.message),
    );
    const emitted = await this.emitSessionUpdate(sessionId, updateData);
    if (!emitted) {
      await this.emitSessionUpdate(sessionId, updateData);
    }

    if (this.io) {
      this.io.to(sessionId).emit("status", {
        sessionId,
        status,
        ...patch,
      });
    }

    return updateData;
  }

  normalizeJid(phoneNumber) {
    const rawValue = String(phoneNumber || "").trim();

    if (!rawValue) {
      throw new Error("Phone number is required");
    }

    if (rawValue.includes("@")) {
      return rawValue;
    }

    const digits = rawValue.replace(/\D/g, "");
    if (!digits) {
      throw new Error("Invalid phone number");
    }

    const normalizedDigits = digits.length === 10 ? `91${digits}` : digits;
    return `${normalizedDigits}@s.whatsapp.net`;
  }

  extractIncomingText(message) {
    const unwrapped = unwrapMessageContent(message);
    const interactionText = interactiveResponseText(
      extractInteractiveResponse(message),
    );
    const candidates = [
      interactionText,
      unwrapped.conversation,
      unwrapped.extendedTextMessage?.text,
      unwrapped.imageMessage?.caption,
      unwrapped.videoMessage?.caption,
      unwrapped.documentMessage?.caption,
      unwrapped.interactiveMessage?.body?.text,
      unwrapped.listMessage?.description,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return "";
  }

  buildMessagePayload(message, mediaPath = null, mediaType = null) {
    if (!mediaPath || !mediaType) {
      return { text: message || "" };
    }

    const mediaBuffer = readFileSync(mediaPath);
    const payload = { mimetype: mediaType };

    if (mediaType.startsWith("image/")) {
      payload.image = mediaBuffer;
      if (message) payload.caption = message;
      return payload;
    }

    if (mediaType.startsWith("video/")) {
      payload.video = mediaBuffer;
      if (message) payload.caption = message;
      return payload;
    }

    if (mediaType.startsWith("audio/")) {
      payload.audio = mediaBuffer;
      payload.ptt = mediaType.includes("ogg");
      return payload;
    }

    payload.document = mediaBuffer;
    payload.fileName = basename(mediaPath);
    if (message) payload.caption = message;
    return payload;
  }

  async sendMessage(
    sessionId,
    phoneNumber,
    message,
    mediaPath = null,
    mediaType = null,
  ) {
    const sock = this.sockets.get(sessionId);

    if (!sock?.user?.id) {
      this.scheduleReconnect(sessionId, {
        delayMs: 1000,
        reason: "send_message_offline",
      });
      const err = new Error("Session is not connected");
      err.statusCode = 503;
      err.code = "SESSION_OFFLINE";
      throw err;
    }

    const jid = this.normalizeJid(phoneNumber);
    const payload = this.buildMessagePayload(message, mediaPath, mediaType);

    return sock.sendMessage(jid, payload);
  }

  isSessionConnected(sessionId) {
    return !!this.sockets.get(sessionId)?.user?.id;
  }

  getSocket(sessionId) {
    return this.sockets.get(sessionId) || null;
  }

  historyArchivePath(sessionId, chatJid) {
    const archiveDir = join(SESSIONS_DIR, sessionId, "history");
    if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
    const fileName = Buffer.from(String(chatJid)).toString("base64url");
    return join(archiveDir, `${fileName}.ndjson`);
  }

  normalizeArchivedMessage(message) {
    const chatJid = message?.key?.remoteJid;
    if (!chatJid || !message?.key?.id || !message?.message) return null;
    const content =
      message.message?.ephemeralMessage?.message ||
      message.message?.viewOnceMessage?.message ||
      message.message;
    const text =
      content?.conversation ||
      content?.extendedTextMessage?.text ||
      content?.imageMessage?.caption ||
      content?.videoMessage?.caption ||
      content?.documentMessage?.caption ||
      "";
    const mediaType = content?.imageMessage
      ? "image"
      : content?.videoMessage
        ? "video"
        : content?.documentMessage
          ? "document"
          : content?.audioMessage
            ? "audio"
            : null;
    const timestamp = message.messageTimestamp
      ? new Date(Number(message.messageTimestamp) * 1000)
      : new Date();
    return {
      messageId: message.key.id,
      chatJid,
      text,
      direction: message.key.fromMe ? "out" : "in",
      status: message.key.fromMe
        ? { 0: "failed", 1: "pending", 2: "sent", 3: "delivered", 4: "read", 5: "read" }[
            Number(message.status)
          ] || "sent"
        : "delivered",
      mediaType,
      mediaName:
        content?.documentMessage?.fileName ||
        content?.audioMessage?.fileName ||
        null,
      sourceMessage: mediaType ? message : undefined,
      timestamp: timestamp.toISOString(),
    };
  }

  reviveArchivedBuffers(value) {
    if (!value || typeof value !== "object") return value;
    if (
      value.type === "Buffer" &&
      Array.isArray(value.data)
    ) {
      return Buffer.from(value.data);
    }
    for (const key of Object.keys(value)) {
      value[key] = this.reviveArchivedBuffers(value[key]);
    }
    return value;
  }

  async storeMessageMedia(message, mediaType, mediaName = "", userId = "") {
    if (!message || !mediaType) return null;
    const buffer = await downloadMediaMessage(message, "buffer", {});
    const extensionFromName = String(mediaName).match(/\.[a-zA-Z0-9]{1,8}$/)?.[0];
    const defaultExtension = {
      image: ".jpg",
      video: ".mp4",
      audio: ".ogg",
      document: ".bin",
    }[mediaType] || ".bin";
    const fileName = `${randomUUID()}${extensionFromName || defaultExtension}`;
    const partnerTenant = userId
      ? await PartnerTenantService.findForUser(userId)
      : null;
    const normalizedUserId = String(userId || "");
    const uploadDir =
      partnerTenant && /^[a-f0-9]{24}$/i.test(normalizedUserId)
        ? join(process.cwd(), "uploads", "private", normalizedUserId)
        : join(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    writeFileSync(join(uploadDir, fileName), buffer);
    return partnerTenant
      ? `/uploads/private/${normalizedUserId}/${fileName}`
      : `/uploads/${fileName}`;
  }

  async materializeArchivedMedia(row, userId = "") {
    if (!row?.sourceMessage || !row?.mediaType) return null;
    try {
      return await this.storeMessageMedia(
        this.reviveArchivedBuffers(row.sourceMessage),
        row.mediaType,
        row.mediaName,
        userId,
      );
    } catch (error) {
      console.warn("[WA MEDIA] archived media download failed", {
        messageId: row.messageId,
        error: error?.message || String(error),
      });
      return null;
    }
  }

  archiveHistoryMessages(sessionId, messages = []) {
    const rowsByChat = new Map();
    for (const message of messages) {
      const row = this.normalizeArchivedMessage(message);
      if (!row) continue;
      if (!rowsByChat.has(row.chatJid)) rowsByChat.set(row.chatJid, []);
      rowsByChat.get(row.chatJid).push(row);
    }
    for (const [chatJid, rows] of rowsByChat) {
      appendFileSync(
        this.historyArchivePath(sessionId, chatJid),
        `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
        "utf8",
      );
    }
  }

  async loadChatHistory(sessionId, chatJid, limit = 30, before = null) {
    const filePath = this.historyArchivePath(sessionId, chatJid);
    if (!existsSync(filePath)) return [];
    const beforeTime = before ? new Date(before).getTime() : Infinity;
    const unique = new Map();
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        const time = new Date(row.timestamp).getTime();
        if (Number.isFinite(time) && time < beforeTime) {
          unique.set(row.messageId, row);
        }
      } catch {}
    }
    return [...unique.values()]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, Math.min(Math.max(Number(limit) || 30, 1), 100));
  }

  async requestChatHistory(sessionId, chatJid, count, anchor) {
    const sock = this.sockets.get(sessionId);
    if (
      !sock?.user?.id ||
      typeof sock.fetchMessageHistory !== "function" ||
      !anchor?.messageId
    ) {
      return false;
    }
    const cooldownKey = `${sessionId}:${chatJid}`;
    const lastRequest = this.historyRequestCooldowns.get(cooldownKey) || 0;
    if (Date.now() - lastRequest < 30_000) return false;
    this.historyRequestCooldowns.set(cooldownKey, Date.now());
    await sock.fetchMessageHistory(
      Math.min(Math.max(Number(count) || 30, 1), 100),
      {
        remoteJid: chatJid,
        id: anchor.messageId,
        fromMe: anchor.direction === "out",
      },
      Math.floor(new Date(anchor.timestamp).getTime() / 1000),
    );
    return true;
  }

  async getCachedSessionGroups(sessionId) {
    const session = await SessionModel.findOne({ sessionId })
      .select("userId")
      .lean();
    if (!session?.userId) return [];
    const rows = await WaChat.find({
      userId: session.userId,
      sessionId,
      chatJid: { $regex: /@g\.us$/ },
    })
      .sort({ lastMessageTime: -1 })
      .lean();
    return rows.map((row) => ({
      jid: row.chatJid,
      id: row.chatJid,
      subject: row.contactName || row.name || "WhatsApp group",
      name: row.contactName || row.name || "WhatsApp group",
      owner: "",
      desc: "",
      participantsCount: Number(row.participantsCount || 0),
      announce: false,
      restrict: false,
      createdAt: null,
      cached: true,
    }));
  }

  async getSessionGroups(sessionId) {
    const sock = this.sockets.get(sessionId);

    if (!sock?.user?.id) {
      this.scheduleReconnect(sessionId, {
        delayMs: 1000,
        reason: "group_list_offline",
      });
      return this.getCachedSessionGroups(sessionId);
    }

    if (typeof sock.groupFetchAllParticipating !== "function") {
      const err = new Error("Group listing is not supported by this socket");
      err.statusCode = 501;
      err.code = "GROUP_LIST_UNSUPPORTED";
      throw err;
    }

    let groupMap;
    try {
      groupMap = await sock.groupFetchAllParticipating();
    } catch (error) {
      console.warn("[WA GROUPS] live fetch failed; using cached groups", {
        sessionId,
        error: error?.message || String(error),
      });
      return this.getCachedSessionGroups(sessionId);
    }
    const groups = Object.entries(groupMap || {}).map(([jid, group]) => {
      const participants = Array.isArray(group?.participants)
        ? group.participants
        : [];

      return {
        jid: group?.id || jid,
        id: group?.id || jid,
        subject: group?.subject || "Unnamed group",
        name: group?.subject || "Unnamed group",
        owner: group?.owner || "",
        desc: group?.desc || "",
        participantsCount:
          Number(group?.size || group?.participantsCount) ||
          participants.length ||
          0,
        announce: !!group?.announce,
        restrict: !!group?.restrict,
        createdAt: group?.creation
          ? new Date(Number(group.creation) * 1000).toISOString()
          : null,
      };
    });

    return groups.sort((a, b) => a.subject.localeCompare(b.subject));
  }

  /**
   * Create a new WhatsApp group using a connected session.
   * @param {string} sessionId - The session to create the group from
   * @param {string} subject - Group name / subject (max 25 chars enforced by WA)
   * @param {string[]} participants - Array of phone numbers (e.g. "+919876543210")
   * @returns {{ groupJid: string, subject: string, participants: object[] }}
   */
  async createGroup(sessionId, subject, participants) {
    const sock = this.sockets.get(sessionId);

    if (!sock?.user?.id) {
      const err = new Error(
        "Session is not connected. Please connect the session first.",
      );
      err.statusCode = 409;
      err.code = "SESSION_NOT_CONNECTED";
      throw err;
    }

    if (typeof sock.groupCreate !== "function") {
      const err = new Error("Group creation is not supported by this session");
      err.statusCode = 501;
      err.code = "GROUP_CREATE_UNSUPPORTED";
      throw err;
    }

    // Convert phone numbers to WhatsApp JIDs
    const participantJids = participants.map((num) => {
      const digits = String(num).replace(/\D/g, "");
      return `${digits}@s.whatsapp.net`;
    });

    try {
      const result = await sock.groupCreate(subject, participantJids);

      return {
        groupJid: result?.id || result?.gid || null,
        subject: result?.subject || subject,
        participants: Array.isArray(result?.participants)
          ? result.participants
          : participantJids.map((jid) => ({ id: jid, admin: null })),
        size: participantJids.length + 1, // +1 for creator
      };
    } catch (error) {
      console.error("[WA GROUP CREATE] Error:", {
        sessionId,
        subject,
        participantCount: participants.length,
        error: error?.message || String(error),
      });

      const err = new Error(
        error?.message || "Failed to create WhatsApp group",
      );
      err.statusCode = error?.statusCode || 500;
      err.code = error?.code || "GROUP_CREATE_FAILED";
      throw err;
    }
  }

  normalizeGroupJid(groupJid) {
    const value = String(groupJid || "").trim();
    if (!value) {
      throw new Error("Group JID is required");
    }

    const decoded = decodeURIComponent(value);
    if (!decoded.endsWith("@g.us")) {
      const err = new Error("Invalid group JID");
      err.statusCode = 400;
      err.code = "INVALID_GROUP_JID";
      throw err;
    }

    return decoded;
  }

  isLidJid(value) {
    return /@lid(?::\d+)?$/i.test(String(value || "").trim());
  }

  extractRealPhoneNumber(value) {
    const text = String(value || "").trim();
    if (!text || this.isLidJid(text)) {
      return "";
    }

    if (text.includes("@") && !/@(s\.whatsapp\.net|c\.us)(:\d+)?$/i.test(text)) {
      return "";
    }

    const userPart = text.includes("@") ? text.split("@")[0] : text;
    const digits = userPart.split(":")[0].replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 16) {
      return "";
    }

    return digits;
  }

  async resolveParticipantPhoneNumber(sock, participantJid, fallbackValue = "") {
    const directPhone =
      this.extractRealPhoneNumber(participantJid) ||
      this.extractRealPhoneNumber(fallbackValue);

    if (directPhone) {
      const sourceJid = String(participantJid || fallbackValue || "").trim();
      return {
        phoneNumber: directPhone,
        phoneJid: sourceJid.includes("@")
          ? sourceJid
          : `${directPhone}@s.whatsapp.net`,
        resolvedFromLid: false,
      };
    }

    if (!this.isLidJid(participantJid) || typeof sock.findUserId !== "function") {
      return { phoneNumber: "", phoneJid: "", resolvedFromLid: false };
    }

    try {
      const ids = await sock.findUserId(participantJid);
      const phoneJid = ids?.phoneNumber || ids?.pn || "";
      const phoneNumber = this.extractRealPhoneNumber(phoneJid);

      return {
        phoneNumber,
        phoneJid: phoneNumber ? phoneJid : "",
        resolvedFromLid: Boolean(phoneNumber),
      };
    } catch (err) {
      console.warn("[WA GROUP] Failed to resolve LID participant", {
        participantJid,
        error: err?.message || err,
      });
      return { phoneNumber: "", phoneJid: "", resolvedFromLid: false };
    }
  }

  getParticipantAdminRole(participant, participantJid, groupOwner = "") {
    const explicitRole = String(participant?.admin || participant?.role || "")
      .trim()
      .toLowerCase();
    if (explicitRole === "superadmin" || explicitRole === "super admin") {
      return "superadmin";
    }
    if (explicitRole === "admin") {
      return "admin";
    }
    if (participant?.isSuperAdmin || participant?.superadmin) {
      return "superadmin";
    }
    if (participant?.isAdmin || participant?.admin === true) {
      return "admin";
    }

    const owner = String(groupOwner || "").split(":")[0];
    const current = String(participantJid || "").split(":")[0];
    if (owner && current && owner === current) {
      return "superadmin";
    }

    return "";
  }

  async getGroupParticipants(sessionId, groupJid) {
    const sock = this.sockets.get(sessionId);

    if (!sock?.user?.id) {
      this.scheduleReconnect(sessionId, {
        delayMs: 1000,
        reason: "group_participants_offline",
      });
      const err = new Error("Session is not connected");
      err.statusCode = 503;
      err.code = "SESSION_OFFLINE";
      throw err;
    }

    const jid = this.normalizeGroupJid(groupJid);
    let metadata = null;

    if (typeof sock.groupMetadata === "function") {
      metadata = await sock.groupMetadata(jid).catch(() => null);
    }

    if (!metadata && typeof sock.groupFetchAllParticipating === "function") {
      const groupMap = await sock.groupFetchAllParticipating();
      metadata = groupMap?.[jid] || null;
    }

    if (!metadata) {
      const err = new Error("Group not found for this session");
      err.statusCode = 404;
      err.code = "GROUP_NOT_FOUND";
      throw err;
    }

    const participants = Array.isArray(metadata.participants)
      ? metadata.participants
      : [];
    const normalizedParticipants = await Promise.all(
      participants.map(async (participant, index) => {
        const participantJid = String(
          participant?.id || participant?.jid || participant?.phoneNumber || "",
        ).trim();
        const phoneSource =
          participant?.phoneNumber && participant?.phoneNumber !== participantJid
            ? participant.phoneNumber
            : "";
        const resolved = await this.resolveParticipantPhoneNumber(
          sock,
          participantJid,
          phoneSource,
        );
        const canExport = Boolean(resolved.phoneNumber);

        return {
          index: index + 1,
          jid: resolved.phoneJid || "",
          sourceJid: participantJid,
          phoneNumber: resolved.phoneNumber,
          name:
            participant?.name ||
            participant?.notify ||
            participant?.verifiedName ||
            "",
          admin: this.getParticipantAdminRole(
            participant,
            participantJid,
            metadata?.owner,
          ),
          canExport,
          unresolvedReason: canExport
            ? ""
            : this.isLidJid(participantJid)
              ? "lid_unresolved"
              : "no_phone_number",
        };
      }),
    );
    const exportableParticipants = normalizedParticipants.filter(
      (participant) => participant.canExport,
    );

    return {
      jid,
      subject: metadata.subject || "Unnamed group",
      totalParticipants: participants.length,
      resolvedParticipantsCount: exportableParticipants.length,
      unresolvedParticipantsCount:
        participants.length - exportableParticipants.length,
      participants: exportableParticipants,
    };
  }

  startHeartbeat(sessionId, sock) {
    this.clearHeartbeat(sessionId);
    console.log("[WA HEARTBEAT] started", {
      sessionId,
      activeSockets: this.sockets.size,
      activeHeartbeats: this.heartbeats.size,
    });

    const id = setInterval(async () => {
      try {
        const liveSock = this.sockets.get(sessionId) || sock;
        const isAuthenticated = !!liveSock?.user?.id;

        console.log("[WA HEARTBEAT] tick", {
          sessionId,
          isAuthenticated,
          wsState: liveSock?.ws?.readyState,
          activeSockets: this.sockets.size,
        });

        // If the session is authenticated, treat it as healthy. During
        // initial sync the websocket readyState may bounce; don't trigger
        // reconnects for transient websocket state changes.
        if (isAuthenticated) {
          return;
        }

        console.log("[WA HEARTBEAT] auth lost, reconnecting", { sessionId });

        this.clearHeartbeat(sessionId);

        await this.handleSessionStateChange(sessionId, "connecting");
        this.scheduleReconnect(sessionId, {
          delayMs: 1000,
          reason: "heartbeat_auth_lost",
        });
      } catch (err) {
        console.error("[WA HEARTBEAT ERROR]", err);
      }
    }, 60_000);
    this.heartbeats.set(sessionId, id);
  }

  async getSocketVersion() {
    try {
      const { version } = await fetchLatestBaileysVersion();
      return version;
    } catch (e) {
      return undefined;
    }
  }

  async removeSessionFiles(sessionId) {
    const sessionPath = join(SESSIONS_DIR, sessionId);
    try {
      if (existsSync(sessionPath)) {
        // wipe cred files safely
        const files = ["creds.json", "keys.json"];
        for (const f of files) {
          try {
            rmSync(join(sessionPath, f), { force: true });
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  isValidAuthState(authState) {
    if (!authState || !authState.state) return false;
    const creds = authState.state.creds;
    if (!creds) return false;
    if (!creds.me || !creds.me.id) return false;
    // Don't require 'registered' to be true - after pairing but before
    // complete registration, registered might be false temporarily
    // This prevents marking valid sessions as invalid after 515 restart
    return true;
  }

  async validateSessionCredentials(sessionId) {
    const sessionPath = join(SESSIONS_DIR, sessionId);
    const credsPath = join(sessionPath, "creds.json");

    if (!existsSync(credsPath)) {
      console.log("[WA CREDS] file missing", { sessionId });
      return false;
    }

    try {
      const raw = readFileSync(credsPath, "utf8");
      const creds = JSON.parse(raw);
      if (
        !creds ||
        typeof creds !== "object" ||
        Object.keys(creds).length === 0
      ) {
        console.warn("[WA CREDS] corrupted/empty", { sessionId });
        return false;
      }
      return true;
    } catch (err) {
      console.error("[WA CREDS] parse error", {
        sessionId,
        error: err.message,
      });
      return false;
    }
  }

  // Core socket factory + event handlers
  async createSocket(sessionId, authState) {
    // Prevent duplicate active sockets
    if (this.activeSockets.has(sessionId)) {
      console.log(
        `[WA SOCKET] socket already active for session ${sessionId}, skipping creation`,
      );
      return this.sockets.get(sessionId);
    }

    const io = this.io;
    let isLoggingOut = false;
    let hasGeneratedQR = false;

    const version = await this.getSocketVersion();
    const sock = makeWASocket({
      auth: authState.state,
      version,
      logger: createBaileysLogger(sessionId),
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      emitOwnEvents: false,
      fireInitQueries: true,
      syncFullHistory: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000,
    });

    // Add to active sockets tracking
    this.activeSockets.add(sessionId);

    // CRITICAL: Wire saveCreds with error tracking and ensure it's called
    // Track last save time to prevent immediate restart before save
    let lastCredsSaveTime = 0;
    let saveCredsPending = false;

    const saveCredsWrapper = async () => {
      try {
        console.log(
          "[WA PERSIST] creds.update event triggered, saving credentials...",
          { sessionId },
        );
        saveCredsPending = true;
        await authState.saveCreds();
        lastCredsSaveTime = Date.now();
        saveCredsPending = false;
        console.log("[WA PERSIST] credentials saved to disk successfully", {
          sessionId,
          saveTime: new Date(lastCredsSaveTime).toISOString(),
        });

        // Verify file was actually written
        const credsPath = join(SESSIONS_DIR, sessionId, "creds.json");
        if (existsSync(credsPath)) {
          const stats = statSync(credsPath);
          console.log("[WA PERSIST] creds.json file verified", {
            sessionId,
            fileSize: stats.size,
            modified: new Date(stats.mtime).toISOString(),
          });
        }
      } catch (err) {
        saveCredsPending = false;
        console.error("[WA PERSIST] failed to save creds", {
          sessionId,
          error: err.message,
          stack: err.stack,
        });
      }
    };

    // Attach the wrapper to creds.update event
    sock.ev.on("creds.update", saveCredsWrapper);

    // Also save initial credentials if they exist
    if (
      authState.state.creds &&
      Object.keys(authState.state.creds).length > 0
    ) {
      console.log("[WA PERSIST] initial credentials detected, saving...", {
        sessionId,
      });
      setTimeout(() => saveCredsWrapper(), 1000); // Save after 1 second
    }

    // QR handling
    sock.ev.on("connection.update", async (update) => {
      const { qr, connection, lastDisconnect } = update;

      if (connection === "connecting") {
        const isValidCreds = await this.validateSessionCredentials(sessionId);

        // Only force QR re-scan if we have invalid credentials AND no QR
        // AND we're not a fresh session (credentials file exists but is invalid)
        if (!isValidCreds && !qr) {
          const sessionPath = join(SESSIONS_DIR, sessionId);
          const credsPath = join(sessionPath, "creds.json");
          const credsFileExists = existsSync(credsPath);

          // If credentials file doesn't exist, this is a fresh session - wait for QR
          if (!credsFileExists) {
            console.log(
              "[WA AUTH] fresh session detected, waiting for QR generation",
              { sessionId },
            );
            // Don't remove socket - allow QR to arrive
            return;
          }

          // Credentials file exists but is invalid - force re-scan
          console.warn(
            "[WA AUTH] session has invalid creds and no QR pending, forcing QR re-scan",
            { sessionId },
          );
          this.removeSocket(sessionId);
          this.removeSessionFiles(sessionId);
          await this.handleSessionStateChange(sessionId, "pending");
          return;
        }
      }

      if (qr) {
        hasGeneratedQR = true;
        try {
          qrcode.toDataURL(qr, (err, url) => {
            if (!err && url) {
              this.pendingQRCodes.set(sessionId, url);
              this.emitSessionUpdate(sessionId, { status: "qr" });
              if (io) {
                io.to(sessionId).emit("qrcode", { sessionId, qr: url });
                io.to(sessionId).emit("status", { sessionId, status: "qr" });
              }
            }
          });
        } catch (e) {}
      }

      if (connection === "open") {
        // Mark connected
        const phone = (sock.user?.id || "").split("@")[0].split(":")[0];
        const isValidCreds = this.isValidAuthState(authState);
        console.log("[WA AUTH] connection open", {
          sessionId,
          phone,
          hasValidCreds: isValidCreds,
          registered: !!authState.state.creds?.registered,
        });

        // A session is permanently bound to the first WhatsApp number that
        // successfully connected to it. Re-pairing must use that same number;
        // otherwise users could silently replace A with B and mix chat data.
        const boundSession = await SessionModel.findOne({ sessionId })
          .select("phoneNumber")
          .lean();
        const boundPhone = String(boundSession?.phoneNumber || "").replace(
          /\D/g,
          "",
        );
        if (boundPhone && phone && boundPhone !== phone) {
          const mismatchError =
            `This session is linked to +${boundPhone}. Scan WhatsApp for that number only.`;
          console.warn("[WA SESSION] bound number mismatch rejected", {
            sessionId,
            boundPhone,
            scannedPhone: phone,
          });
          this.duplicateRejectedSessions.add(sessionId);
          this.clearReconnectTimer(sessionId);
          this.pendingReconnects.delete(sessionId);
          this.activeSockets.delete(sessionId);
          this.clearHeartbeat(sessionId);
          await this.handleSessionStateChange(sessionId, "failed", {
            // Never overwrite the permanent binding with the rejected number.
            phoneNumber: boundPhone,
            lastError: mismatchError,
            errorCode: "SESSION_PHONE_MISMATCH",
          });
          this.emitSessionUpdate(sessionId, {
            status: "failed",
            phoneNumber: boundPhone,
            error: mismatchError,
            errorCode: "SESSION_PHONE_MISMATCH",
          });
          try {
            await sock.logout();
          } catch (_) {
            try {
              sock.end(new Error(mismatchError));
            } catch (_) {}
          }
          this.removeSocket(sessionId);
          // These credentials belong to the rejected number B. Remove them so
          // the next retry presents a clean QR for the bound number A.
          await this.removeSessionFiles(sessionId);
          return;
        }

        // Fast path: reject against an already-live socket immediately. This
        // prevents the new session appearing connected while Mongo is queried.
        const duplicateLiveSession = phone
          ? [...this.sockets.entries()].find(([otherSessionId, otherSocket]) => {
              if (otherSessionId === sessionId) return false;
              if (otherSocket?.ws?.readyState !== 1) return false;
              const otherPhone = (otherSocket?.user?.id || "")
                .split("@")[0]
                .split(":")[0];
              return otherPhone === phone;
            })
          : null;
        const duplicateSession = duplicateLiveSession
          ? { sessionId: duplicateLiveSession[0], name: "" }
          : phone
            ? await SessionModel.findOne({
                sessionId: { $ne: sessionId },
                phoneNumber: phone,
                // "connecting" is not proof that this number owns a live
                // WhatsApp transport; stale recovery rows must not block it.
                status: "connected",
              })
                .select("sessionId name")
                .lean()
            : null;
        if (duplicateSession) {
          const duplicateError =
            "This WhatsApp number is already active in another session";
          console.warn("[WA SESSION] duplicate active number rejected", {
            sessionId,
            phone,
            existingSessionId: duplicateSession.sessionId,
          });
          this.duplicateRejectedSessions.add(sessionId);
          this.clearReconnectTimer(sessionId);
          this.pendingReconnects.delete(sessionId);
          this.activeSockets.delete(sessionId);
          this.clearHeartbeat(sessionId);
          await this.handleSessionStateChange(sessionId, "failed", {
            // A duplicate rejection is not a successful first connection and
            // therefore must not establish or replace the permanent binding.
            phoneNumber: boundPhone || "",
            lastError: duplicateError,
            errorCode: "DUPLICATE_ACTIVE_NUMBER",
          });
          this.emitSessionUpdate(sessionId, {
            status: "failed",
            phoneNumber: boundPhone || "",
            error: duplicateError,
            errorCode: "DUPLICATE_ACTIVE_NUMBER",
          });
          try {
            await sock.logout();
          } catch (_) {
            try {
              sock.end(new Error(duplicateError));
            } catch (_) {}
          }
          this.removeSocket(sessionId);
          // Keep credentials. Once the genuinely active session is removed or
          // disconnected, the user can retry without scanning a new QR.
          return;
        }

        this.pendingQRCodes.delete(sessionId);
        this.reconnectAttempts.delete(sessionId);
        this.reconnectCooldown.delete(sessionId); // Reset cooldown on successful connection
        this.clearReconnectTimer(sessionId);
        this.sockets.set(sessionId, sock);
        await this.handleSessionStateChange(sessionId, "connected", {
          phoneNumber: phone,
          lastConnected: new Date(),
          lastError: null,
          errorCode: null,
        });
        this.startHeartbeat(sessionId, sock);
      }

      if (connection === "close") {
        if (this.duplicateRejectedSessions.has(sessionId)) {
          this.duplicateRejectedSessions.delete(sessionId);
          this.clearReconnectTimer(sessionId);
          this.pendingReconnects.delete(sessionId);
          this.activeSockets.delete(sessionId);
          this.clearHeartbeat(sessionId);
          this.removeSocket(sessionId);
          return;
        }
        if (isLoggingOut) {
          this.clearHeartbeat(sessionId);
          return;
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode ?? null;
        const reason =
          statusCode ??
          (lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output.statusCode
            : 0);
        const isLogout =
          statusCode === 401 || reason === DisconnectReason.loggedOut;
        const isRestartRequired = reason === DisconnectReason.restartRequired;
        const isTemporaryWebsocketBreak = statusCode === 428 || reason === 428;
        const isSoftRestart = statusCode === 515 || isTemporaryWebsocketBreak; // Stream error 515 or temporary 428 hiccup
        const isRegistered = !!authState.state.creds?.registered;
        const attempts = this.reconnectAttempts.get(sessionId) || 0;
        const isValidCreds = this.isValidAuthState(authState);

        console.log("[WA AUTH] connection close", {
          sessionId,
          statusCode,
          reason,
          isLogout,
          isRestartRequired,
          isSoftRestart,
          isRegistered,
          isValidCreds,
          attempts,
        });

        this.clearHeartbeat(sessionId);

        // CRITICAL: Handle soft restart (515) BEFORE checking invalid creds
        // 515 means temporary stream disconnect, NOT auth failure - preserve session
        if (isSoftRestart) {
          // Check if credentials are currently being saved
          const now = Date.now();
          const timeSinceLastSave = now - lastCredsSaveTime;
          const isSavingInProgress = saveCredsPending;

          // If credentials are being saved or were saved very recently, wait longer
          let additionalWait = 0;
          if (isSavingInProgress) {
            console.log(
              "[WA RESTART] credentials save in progress, waiting 3 seconds...",
              { sessionId },
            );
            additionalWait = 3000; // Wait 3 seconds for save to complete
          } else if (timeSinceLastSave < 2000) {
            console.log(
              "[WA RESTART] credentials saved recently, waiting 2 seconds...",
              {
                sessionId,
                timeSinceLastSave,
              },
            );
            additionalWait = 2000; // Wait 2 seconds if saved within last 2 seconds
          }

          const baseDelay = this.getReconnectDelay(sessionId, 5000, 30000); // Base 5s for 515, max 30s
          const totalDelay = baseDelay + additionalWait;

          console.log(
            `[WA RESTART] soft restart (515), preserving credentials - delaying reconnect by ${totalDelay}ms`,
            {
              sessionId,
              baseDelay,
              additionalWait,
              totalDelay,
              isSavingInProgress,
              timeSinceLastSave,
              lastSaveTime:
                lastCredsSaveTime > 0
                  ? new Date(lastCredsSaveTime).toISOString()
                  : "never",
            },
          );

          // Give a small grace period for any pending saveCreds to complete
          if (additionalWait > 0) {
            await new Promise((resolve) => setTimeout(resolve, additionalWait));
          }

          this.removeSocket(sessionId);
          await this.handleSessionStateChange(sessionId, "connecting");
          this.scheduleReconnect(sessionId, {
            delayMs: baseDelay,
            reason: "soft_restart",
          });
          return;
        }

        // CRITICAL: Only delete creds on actual logout, NOT on restart errors
        if (!isValidCreds && attempts > 1 && !isRestartRequired) {
          console.warn(
            "[WA AUTH] invalid creds after retries (not restart), forcing QR",
            { sessionId, attempts },
          );
          await this.handleSessionStateChange(sessionId, "pending");
          this.removeSocket(sessionId);
          this.removeSessionFiles(sessionId);
          return;
        }

        // Handle actual logout: delete creds and mark disconnected
        if (isLogout) {
          console.log("[WA AUTH] actual logout (401 or loggedOut)", {
            sessionId,
          });
          await this.handleSessionStateChange(sessionId, "disconnected");
          this.removeSocket(sessionId);
          this.removeSessionFiles(sessionId);
          return;
        }

        // Temporary disconnects with valid auth: mark connecting and attempt reconnect
        if (isRestartRequired || isValidCreds) {
          const delay = this.getReconnectDelay(sessionId, 3000, 30000);
          console.log(
            `[WA RECONNECT] soft disconnect with valid auth, reconnecting in ${delay}ms`,
            { sessionId, isRestartRequired, isValidCreds, delay },
          );
          this.removeSocket(sessionId);
          await this.handleSessionStateChange(sessionId, "connecting");
          this.scheduleReconnect(sessionId, {
            delayMs: delay,
            reason: "soft_disconnect",
          });
          return;
        }

        // Pre-auth flows: don't wipe creds if QR already issued; try a quick reconnect
        if (!isRegistered && hasGeneratedQR) {
          const delay = this.getReconnectDelay(sessionId, 2500, 20000);
          console.log(
            `[WA RECONNECT] pre-auth with QR, reconnecting in ${delay}ms`,
            { sessionId, delay },
          );
          this.removeSocket(sessionId);
          await this.handleSessionStateChange(sessionId, "connecting");
          this.scheduleReconnect(sessionId, {
            delayMs: delay,
            reason: "pre_auth_with_qr",
          });
          return;
        }

        // Fresh sessions without QR generated yet
        if (!isRegistered && !hasGeneratedQR) {
          console.log("[WA AUTH] waiting for QR scan", { sessionId });
          return;
        }

        // If creds exist, schedule a recovery reconnect; otherwise mark disconnected
        const credsPath = join(SESSIONS_DIR, sessionId, "creds.json");
        if (existsSync(credsPath)) {
          const delay = this.getReconnectDelay(sessionId, 15000, 60000); // Base 15s, max 60s for recovery
          console.log(
            `[WA RECONNECT] recovery reconnect scheduled in ${delay}ms`,
            { sessionId, delay },
          );
          await this.handleSessionStateChange(sessionId, "connecting");
          this.scheduleReconnect(sessionId, {
            delayMs: delay,
            reason: "credential_recovery",
          });
        } else {
          await this.handleSessionStateChange(sessionId, "disconnected");
        }
      }
    });

    const sessionRecord = await SessionModel.findOne({ sessionId })
      .select("userId phoneNumber")
      .lean();
    const userId = sessionRecord?.userId?.toString() || null;
    let partnerTenant = userId
      ? await PartnerTenantService.findForUser(userId)
      : null;

    sock.ev.on("messaging-history.set", async ({ chats = [], contacts = [], messages = [] }) => {
      if (!userId) return;
      try {
        // Keep the provider history out of the primary message database.
        // Requested pages are materialized only when the user scrolls back.
        this.archiveHistoryMessages(sessionId, messages);
        const contactNames = new Map(
          contacts
            .filter((contact) => contact?.id)
            .map((contact) => [
              contact.id,
              contact.name || contact.notify || contact.verifiedName || "",
            ]),
        );
        const lastMessageByJid = new Map();
        for (const message of messages) {
          const remoteJid = message?.key?.remoteJid;
          if (!remoteJid || remoteJid === "status@broadcast") continue;
          const timestamp = Number(message.messageTimestamp || 0);
          const existing = lastMessageByJid.get(remoteJid);
          if (!existing || timestamp >= existing.timestamp) {
            lastMessageByJid.set(remoteJid, { message, timestamp });
          }
        }

        await Promise.all(
          chats.map(async (chat) => {
            const chatJid = chat?.id;
            if (!chatJid || chatJid === "status@broadcast") return;
            const latest = lastMessageByJid.get(chatJid)?.message;
            const lastMessage = latest ? this.extractIncomingText(latest) : "";
            const rawTimestamp =
              Number(chat.conversationTimestamp || 0) ||
              Number(latest?.messageTimestamp || 0);
            await WaChat.findOneAndUpdate(
              { userId, sessionId, chatJid },
              {
                $set: {
                  phoneNumber: chatJid.endsWith("@lid")
                    ? chatJid
                    : chatJid.split("@")[0],
                  contactName:
                    chat.name ||
                    contactNames.get(chatJid) ||
                    latest?.pushName ||
                    "",
                  ...(lastMessage ? { lastMessage } : {}),
                  ...(rawTimestamp
                    ? { lastMessageTime: new Date(rawTimestamp * 1000) }
                    : {}),
                  unreadCount: Math.max(0, Number(chat.unreadCount || 0)),
                },
              },
              { upsert: true },
            );
          }),
        );

        if (this.io) {
          this.io.to(sessionId).emit("chat:synced", {
            sessionId,
            count: chats.length,
          });
        }
      } catch (error) {
        console.error("[WA CHAT SYNC] history import failed:", error.message);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages = [], type }) => {
      if (type && type !== "notify") return;

      for (const msg of messages) {
        try {
          if (!msg?.message) continue;

          const remoteJid = msg.key?.remoteJid;
          if (!remoteJid || remoteJid === "status@broadcast") continue;
          const isFromMe = msg.key?.fromMe === true;

          const interaction = extractInteractiveResponse(msg);
          const text = this.extractIncomingText(msg);
          const content = unwrapMessageContent(msg);
          const isInteractiveMessage = Boolean(
            interaction || content?.interactiveMessage || content?.listMessage,
          );
          const mediaType = content?.imageMessage
            ? "image"
            : content?.videoMessage
              ? "video"
              : content?.documentMessage
                ? "document"
                : content?.audioMessage
                  ? "audio"
                  : null;
          if (!text && !mediaType && !interaction) continue;
          const timestamp = msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000)
            : new Date();
          const messageId =
            msg.key?.id || `${isFromMe ? "out" : "in"}-${Date.now()}`;
          const participantJid = msg.key?.participant || null;
          let mediaUrl = null;
          if (mediaType) {
            try {
              mediaUrl = await this.storeMessageMedia(
                msg,
                mediaType,
                content?.documentMessage?.fileName || "",
                userId,
              );
            } catch (error) {
              console.warn("[WA MEDIA] message media download failed", {
                sessionId,
                messageId,
                error: error?.message || String(error),
              });
            }
          }

          console.log("[WA MESSAGE] chat event", {
            sessionId,
            remoteJid,
            direction: isFromMe ? "out" : "in",
            text: text.slice(0, 80),
          });

          if (userId) {
            const messageWrite = await WaChatMessage.updateOne(
              { messageId, sessionId },
              {
                $setOnInsert: {
                  userId,
                  sessionId,
                  chatJid: remoteJid,
                  messageId,
                  text,
                  direction: isFromMe ? "out" : "in",
                  status: isFromMe ? "sent" : "delivered",
                  mediaType,
                  mediaUrl,
                  mediaName:
                    content?.documentMessage?.fileName ||
                    content?.audioMessage?.fileName ||
                    null,
                  messageType: isInteractiveMessage
                    ? "interactive"
                    : mediaType
                      ? "media"
                      : "text",
                  interactive: interaction,
                  timestamp,
                },
              },
              { upsert: true },
            );
            const messageInserted = Number(messageWrite.upsertedCount || 0) > 0;
            if (messageInserted) {
              const chatUpdate = {
                $set: {
                  phoneNumber: remoteJid.endsWith("@lid")
                    ? remoteJid
                    : remoteJid.split("@")[0],
                  ...(!isFromMe && msg.pushName
                    ? { contactName: msg.pushName }
                    : {}),
                  lastMessage: text || `[${mediaType}]`,
                  lastMessageTime: timestamp,
                },
                ...(!isFromMe ? { $inc: { unreadCount: 1 } } : {}),
              };
              await WaChat.findOneAndUpdate(
                { userId, sessionId, chatJid: remoteJid },
                chatUpdate,
                { upsert: true },
              );
            }
          }

          // Partner tenants use DeskGo's AI and workflow engine. OpenWhats
          // only persists/delivers the real chat event and must not auto-reply.
          if (!partnerTenant && userId) {
            partnerTenant = await PartnerTenantService.findForUser(userId);
          }
          if (partnerTenant) {
            if (isFromMe) {
              await publishPartnerMessageSentEvent({
                userId,
                sessionId,
                messageId,
              });
              continue;
            }
            await publishPartnerMessageReceivedEvent({
              userId,
              sessionId,
              messageId,
              eventType: interaction
                ? "whatsapp.interactive.response"
                : "whatsapp.message.received",
              data: {
                session: {
                  sessionId,
                  phoneNumber: sessionRecord?.phoneNumber || "",
                },
                chat: {
                  chatJid: remoteJid,
                  isGroup: remoteJid.endsWith("@g.us"),
                  participantJid,
                },
                contact: {
                  phoneNumber: (participantJid || remoteJid).split("@")[0],
                  displayName: msg.pushName || "",
                },
                message: {
                  messageId,
                  direction: isFromMe ? "out" : "in",
                  type: isInteractiveMessage
                    ? "interactive"
                    : mediaType || "text",
                  text,
                  timestamp: timestamp.toISOString(),
                  ...(mediaType
                    ? {
                        media: {
                          type: mediaType,
                          url: mediaUrl,
                          name:
                            content?.documentMessage?.fileName ||
                            content?.audioMessage?.fileName ||
                            null,
                          caption: text || "",
                        },
                      }
                    : {}),
                },
                ...(interaction
                  ? {
                      interaction: {
                        type: interaction.type,
                        actionId: interaction.actionId,
                        label: interaction.label,
                        description: interaction.description || "",
                        params: interaction.params || {},
                        rawType: interaction.rawType,
                        originalMessageId:
                          interaction.originalMessageId || null,
                      },
                    }
                  : {}),
              },
            });
            continue;
          }

          // Messages manually sent from the linked WhatsApp phone must be
          // mirrored to DeskGo, but must never trigger an incoming-message AI
          // workflow or auto reply.
          if (isFromMe) continue;

          if (userId) {
            const flowResult = await executeFlowOnMessage(
              sessionId,
              remoteJid,
              text,
              userId,
            );

            if (flowResult?.consumed) {
              continue;
            }
          }

          await handleIncomingMessage(
            sessionId,
            remoteJid,
            text,
            async (jid, reply) => sock.sendMessage(jid, { text: reply }),
          );
        } catch (err) {
          console.error("[WA MESSAGE] handler error", {
            sessionId,
            error: err.message,
          });
        }
      }
    });

    sock.ev.on("messages.update", async (updates = []) => {
      if (!userId) return;
      // A tenant may be provisioned after this socket was created. Refresh the
      // association instead of permanently dropping delivery receipts.
      if (!partnerTenant) {
        partnerTenant = await PartnerTenantService.findForUser(userId);
      }
      const statusNames = {
        0: "failed",
        1: "pending",
        2: "sent",
        3: "delivered",
        4: "read",
        5: "read",
      };
      const promotableStatuses = {
        failed: ["pending", "sent"],
        sent: ["pending"],
        delivered: ["pending", "sent"],
        read: ["pending", "sent", "delivered"],
      };
      for (const item of updates) {
        const messageId = item?.key?.id;
        if (!messageId) continue;
        const numericStatus = Number(item?.update?.status);
        const status = statusNames[numericStatus];
        if (!status) continue;
        const updateResult = await WaChatMessage.updateOne(
          {
            sessionId,
            messageId,
            direction: "out",
            status: { $in: promotableStatuses[status] || [] },
          },
          { $set: { status } },
        ).catch(() => null);
        // Baileys can emit delayed lower-level receipts after a read receipt.
        // Only publish a state transition that was actually persisted.
        if (!updateResult?.modifiedCount || !partnerTenant) continue;
        PartnerWebhookService.enqueueForUser(
          userId,
          "whatsapp.message.status",
          {
            sessionId,
            messageId,
            chatJid: item?.key?.remoteJid || null,
            status,
            timestamp: new Date().toISOString(),
          },
        ).catch((error) =>
          console.error("[PARTNER WEBHOOK] status event failed:", error.message),
        );
      }
    });

    // Basic message and contact handlers can be added here as needed.

    return sock;
  }

  async createSession(userId, name, options = {}) {
    const { enableChatView = false, chatPasscode = "" } = options;
    const sessionId = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const sessionDb = new SessionModel({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      sessionId,
      status: "pending",
      credentials: {},
      chatViewEnabled: !!enableChatView,
      chatPasscodeHash: enableChatView
        ? await bcrypt.hash(String(chatPasscode), 10)
        : null,
    });
    await sessionDb.save();

    const sessionPath = join(SESSIONS_DIR, sessionId);
    if (!existsSync(sessionPath)) mkdirSync(sessionPath, { recursive: true });

    const authState = await useMultiFileAuthState(sessionPath);
    const sock = await this.createSocket(sessionId, authState);
    this.sockets.set(sessionId, sock);

    if (this.io)
      this.io.to(sessionId).emit("session:created", { sessionId, name });

    return { sessionId, name, status: "pending" };
  }

  async reconnectSession(sessionId, options = {}) {
    const { force = false } = options;
    // Safe check: Don't reconnect if already connected
    const sock = this.sockets.get(sessionId);
    if (!force && sock?.ws?.readyState === 1 && sock?.user?.id) {
      console.log("[WA RECONNECT] already connected", { sessionId });
      this.clearReconnectTimer(sessionId);
      return { sessionId, status: "connected" };
    }

    if (force) {
      this.clearReconnectTimer(sessionId);
      this.reconnectCooldown.delete(sessionId);
    }

    // Check cooldown - prevent reconnect if within 15 seconds
    if (!force && !this.canReconnect(sessionId)) {
      const remainingMs = this.getReconnectCooldownRemaining(sessionId);
      console.log(
        `[WA RECONNECT] reconnect blocked by cooldown for session ${sessionId}`,
      );
      this.scheduleReconnect(sessionId, {
        delayMs: remainingMs + 1000,
        reason: "cooldown_wait",
      });
      return { sessionId, status: "connecting", scheduled: true };
    }

    // Prevent duplicate reconnects
    if (this.pendingReconnects.has(sessionId)) {
      return { sessionId, status: "connecting" };
    }
    this.pendingReconnects.add(sessionId);

    // Update reconnect cooldown timestamp
    this.reconnectCooldown.set(sessionId, Date.now());
    // Increment reconnect attempts
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    this.reconnectAttempts.set(sessionId, attempts + 1);

    try {
      const session = await SessionModel.findOne({ sessionId });
      if (!session) {
        return;
      }

      // Explicit retry clears a previous terminal error. If credentials are
      // unavailable below, the state will move to pending and issue a new QR.
      await this.handleSessionStateChange(sessionId, "connecting", {
        lastError: null,
        errorCode: null,
      });

      if (this.sockets.has(sessionId)) {
        // Avoid calling sock.end({ reason: "reconnect" }) as it can cause
        // aggressive disconnect behavior; rely on removeSocket() to cleanup.
        try {
          this.removeSocket(sessionId);
        } catch (e) {}
      }

      const sessionPath = join(SESSIONS_DIR, sessionId);
      const credsPath = join(sessionPath, "creds.json");
      console.log("[WA RECONNECT] checking creds", { sessionId, credsPath });
      if (!existsSync(credsPath)) {
        console.warn("[WA RECONNECT] no creds file, forcing QR", { sessionId });
        await this.handleSessionStateChange(sessionId, "pending");
        if (!existsSync(sessionPath)) {
          mkdirSync(sessionPath, { recursive: true });
        }
        const freshAuthState = await useMultiFileAuthState(sessionPath);
        const freshSocket = await this.createSocket(sessionId, freshAuthState);
        this.sockets.set(sessionId, freshSocket);
        return {
          sessionId,
          status: "pending",
          requiresQr: true,
        };
      }

      const authState = await useMultiFileAuthState(sessionPath);
      const isValidCreds = this.isValidAuthState(authState);
      if (!isValidCreds) {
        console.warn(
          "[WA RECONNECT] invalid creds detected — preserving files and marking pending",
          { sessionId },
        );
        // Don't delete creds here. A soft transport restart (e.g., 515) or
        // racing writes can result in transient invalid state. Preserve files
        // to allow Baileys to recover; only clear on explicit logout.
        await this.handleSessionStateChange(sessionId, "pending");
        return { sessionId, status: "pending" };
      }

      const sock = await this.createSocket(sessionId, authState);
      this.sockets.set(sessionId, sock);
      await SessionModel.updateOne(
        { sessionId },
        { status: "connecting", lastError: null, errorCode: null },
      ).catch(() => {});
      return { sessionId, status: "connecting" };
    } finally {
      this.pendingReconnects.delete(sessionId);
    }
  }

  async restoreSessions() {
    try {
      const sessions = await SessionModel.find({
        status: { $in: ["connecting", "connected", "disconnected"] },
      });
      console.log("[WA RESTORE] boot restore starting", {
        sessions: sessions.length,
        activeSockets: this.sockets.size,
      });
      const rehydrateSpacingMs = 1500;

      for (const [index, s] of sessions.entries()) {
        try {
          if (index > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, index * rehydrateSpacingMs),
            );
          }

          const sessionPath = join(SESSIONS_DIR, s.sessionId);
          const credsPath = join(sessionPath, "creds.json");
          if (!existsSync(credsPath)) {
            await this.handleSessionStateChange(s.sessionId, "disconnected");
            continue;
          }
          if (this.sockets.has(s.sessionId)) continue;
          const authState = await useMultiFileAuthState(sessionPath);
          const sock = await this.createSocket(s.sessionId, authState);
          this.sockets.set(s.sessionId, sock);
          await this.handleSessionStateChange(s.sessionId, "connecting");
        } catch (e) {
          console.error("[WA RESTORE] session restore failed", {
            sessionId: s.sessionId,
            error: e.message,
          });
          if (this.hasSessionCredentials(s.sessionId)) {
            this.scheduleReconnect(s.sessionId, {
              delayMs: this.getReconnectDelay(s.sessionId, 5000, 300000),
              reason: "restore_retry",
            });
          }
        }
      }
    } catch (e) {
      console.error("[WA RESTORE] boot restore failed", e.message);
    }
  }

  getPendingQR(sessionId) {
    return this.pendingQRCodes.get(sessionId) || null;
  }

  getLiveSessionSnapshot(session) {
    if (!session) return null;

    const sessionId = session.sessionId;
    const sock = this.sockets.get(sessionId);
    const isLiveConnected = !!sock?.user?.id;
    const isReconnecting =
      this.pendingReconnects.has(sessionId) ||
      this.reconnectTimers.has(sessionId);
    const phoneNumber = isLiveConnected
      ? (sock.user.id || "").split("@")[0].split(":")[0]
      : session.phoneNumber;

    let status = session.status;
    // A rejected/failed session is terminal until the user explicitly retries.
    // Stale socket/reconnect flags must never make it appear connected/connecting.
    if (session.status === "failed" || session.errorCode) {
      status = "failed";
    } else if (isLiveConnected && session.status === "connected") {
      status = "connected";
    } else if (isLiveConnected) {
      // Socket transport is open, but connection validation (including the
      // global duplicate-number rule) has not committed yet.
      status = "connecting";
    } else if (isReconnecting) {
      status = "connecting";
    } else if (status === "connected" || status === "connecting") {
      status = "disconnected";
    }

    return {
      sessionId,
      name: session.name,
      status,
      phoneNumber,
      lastConnected: session.lastConnected,
      chatViewEnabled: !!session.chatViewEnabled,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async getSessionStatus(sessionId) {
    const session = await SessionModel.findOne({ sessionId });
    if (!session) return null;
    const sock = this.sockets.get(sessionId);
    const isLiveConnected = !!sock?.user?.id;

    if (isLiveConnected && session.status !== "connected") {
      const phone = (sock.user.id || "").split("@")[0].split(":")[0];
      SessionModel.updateOne(
        { sessionId },
        { status: "connected", phoneNumber: phone },
      ).catch(() => {});
      return {
        sessionId: session.sessionId,
        name: session.name,
        status: "connected",
        phoneNumber: phone,
      };
    }

    if (
      !isLiveConnected &&
      ["connected", "connecting"].includes(session.status)
    ) {
      const credsPath = join(SESSIONS_DIR, sessionId, "creds.json");
      if (existsSync(credsPath)) {
        this.ensureSessionRecovery(sessionId, "status_check").catch(() => {});
        return {
          sessionId: session.sessionId,
          name: session.name,
          status: "connecting",
          phoneNumber: session.phoneNumber,
        };
      }
    }

    if (!isLiveConnected && session.status === "disconnected") {
      const credsPath = join(SESSIONS_DIR, sessionId, "creds.json");
      if (existsSync(credsPath)) {
        SessionModel.updateOne({ sessionId }, { status: "connecting" }).catch(
          () => {},
        );
        this.ensureSessionRecovery(sessionId, "status_check").catch(() => {});
        return {
          sessionId: session.sessionId,
          name: session.name,
          status: "connecting",
          phoneNumber: session.phoneNumber,
        };
      }
    }

    return {
      sessionId: session.sessionId,
      name: session.name,
      status: session.status,
      phoneNumber: session.phoneNumber,
    };
  }

  async emitSessionUpdate(sessionId, statusInfo) {
    if (!this.io) return false;
    try {
      const session = await SessionModel.findOne({ sessionId });
      if (!session) return false;
      const userId = session.userId.toString();
      const payload = {
        sessionId,
        name: session.name,
        status: statusInfo.status || session.status,
        phoneNumber: statusInfo.phoneNumber || session.phoneNumber,
        lastConnected: statusInfo.lastConnected || session.lastConnected,
      };
      this.io.to(`user:${userId}`).emit("session:update", payload);
      return true;
    } catch (e) {}

    return false;
  }

  async logoutSession(sessionId) {
    this.clearReconnectTimer(sessionId);
    const sock = this.sockets.get(sessionId);
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
      this.removeSocket(sessionId);
      this.clearHeartbeat(sessionId);
    }
    await this.removeSessionFiles(sessionId);
    await this.handleSessionStateChange(sessionId, "disconnected", {
      credentials: {},
    });
    return { success: true };
  }

  async deleteSession(sessionId, userId = null) {
    const query = {
      sessionId,
      ...(userId ? { userId } : {}),
    };
    const deletedSession = await SessionModel.findOneAndDelete(query)
      .select("_id sessionId")
      .lean();

    // DELETE is intentionally idempotent. A timed-out caller can safely retry
    // after the database deletion has already completed.
    if (!deletedSession) {
      return { success: true, alreadyDeleted: true };
    }

    this.clearReconnectTimer(sessionId);
    this.pendingReconnects.delete(sessionId);
    this.duplicateRejectedSessions.delete(sessionId);
    const sock = this.sockets.get(sessionId);
    if (sock) {
      try {
        sock.end({ error: null, reason: "Session deleted" });
      } catch (e) {}
      this.removeSocket(sessionId);
      this.clearHeartbeat(sessionId);
    }
    await this.removeSessionFiles(sessionId);
    return { success: true, alreadyDeleted: false };
  }
}

const whatsappService = new WhatsAppService();

export const getSessionSocket = (sessionId) => {
  return whatsappService.sockets.get(sessionId);
};

export default whatsappService;
