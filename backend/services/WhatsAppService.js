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
} from "@itsliaaa/baileys";
import { Boom } from "@hapi/boom";
import mongoose from "mongoose";
import * as qrcode from "qrcode";
import {
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  statSync,
} from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import {
  WhatsAppSession as SessionModel,
  Message,
  WaChat,
  WaChatMessage,
} from "../models/index.js";
import { handleIncomingMessage } from "./AiAgentService.js";
import { executeFlowOnMessage } from "../controllers/flowExecutionController.js";

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
      connecting: ["connected", "disconnected", "failed"],
      connected: ["connecting", "disconnected", "failed"],
      disconnected: ["connecting", "failed"],
      failed: ["connecting", "disconnected"],
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

    await SessionModel.updateOne({ sessionId }, updateData).catch(() => {});
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
    const payload = message?.message;
    if (!payload) return "";

    const unwrapped = payload.ephemeralMessage?.message || payload;
    const candidates = [
      unwrapped.conversation,
      unwrapped.extendedTextMessage?.text,
      unwrapped.imageMessage?.caption,
      unwrapped.videoMessage?.caption,
      unwrapped.documentMessage?.caption,
      unwrapped.buttonsResponseMessage?.selectedButtonId,
      unwrapped.listResponseMessage?.singleSelectReply?.selectedRowId,
      unwrapped.templateButtonReplyMessage?.selectedId,
      unwrapped.interactiveResponseMessage?.body?.text,
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

  async getSessionGroups(sessionId) {
    const sock = this.sockets.get(sessionId);

    if (!sock?.user?.id) {
      this.scheduleReconnect(sessionId, {
        delayMs: 1000,
        reason: "group_list_offline",
      });
      const err = new Error("Session is not connected");
      err.statusCode = 503;
      err.code = "SESSION_OFFLINE";
      throw err;
    }

    if (typeof sock.groupFetchAllParticipating !== "function") {
      const err = new Error("Group listing is not supported by this socket");
      err.statusCode = 501;
      err.code = "GROUP_LIST_UNSUPPORTED";
      throw err;
    }

    const groupMap = await sock.groupFetchAllParticipating();
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
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: false,
      emitOwnEvents: false,
      fireInitQueries: false,
      syncFullHistory: false,
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

        this.pendingQRCodes.delete(sessionId);
        this.reconnectAttempts.delete(sessionId);
        this.reconnectCooldown.delete(sessionId); // Reset cooldown on successful connection
        this.clearReconnectTimer(sessionId);
        this.sockets.set(sessionId, sock);
        await this.handleSessionStateChange(sessionId, "connected", {
          phoneNumber: phone,
          lastConnected: new Date(),
        });
        this.startHeartbeat(sessionId, sock);
      }

      if (connection === "close") {
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
      .select("userId")
      .lean();
    const userId = sessionRecord?.userId?.toString() || null;

    sock.ev.on("messages.upsert", async ({ messages = [], type }) => {
      if (type && type !== "notify") return;

      for (const msg of messages) {
        try {
          if (!msg?.message || msg.key?.fromMe) continue;

          const remoteJid = msg.key?.remoteJid;
          if (!remoteJid || remoteJid === "status@broadcast") continue;
          if (remoteJid.endsWith("@g.us")) continue;

          const text = this.extractIncomingText(msg);
          if (!text) continue;

          console.log("[WA MESSAGE] incoming text", {
            sessionId,
            remoteJid,
            text: text.slice(0, 80),
          });

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
    if (sock?.ws?.readyState === 1 && sock?.user?.id) {
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
        return { sessionId, status: "pending" };
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
        { status: "connecting" },
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
    if (isLiveConnected) {
      status = "connected";
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

  async deleteSession(sessionId) {
    this.clearReconnectTimer(sessionId);
    const sock = this.sockets.get(sessionId);
    if (sock) {
      try {
        sock.end({ error: null, reason: "Session deleted" });
      } catch (e) {}
      this.removeSocket(sessionId);
      this.clearHeartbeat(sessionId);
    }
    await this.removeSessionFiles(sessionId);
    await SessionModel.deleteOne({ sessionId }).catch(() => {});
    return { success: true };
  }
}

const whatsappService = new WhatsAppService();

export const getSessionSocket = (sessionId) => {
  return whatsappService.sockets.get(sessionId);
};

export default whatsappService;
