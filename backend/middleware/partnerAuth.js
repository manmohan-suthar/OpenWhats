import crypto from "crypto";
import PartnerSettingsService from "../services/PartnerSettingsService.js";

const MAX_CLOCK_SKEW_SECONDS = 300;
const DEFAULT_TRUSTED_ORIGINS = Object.freeze([
  "https://deskgo.in",
  "https://easyflow.suthartech.com",
]);
const DEVELOPMENT_TRUSTED_ORIGINS = Object.freeze([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://[::1]:3000",
]);

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function configuredTrustedOrigins() {
  return String(process.env.DESKGO_TRUSTED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin.toLowerCase();
  } catch {
    return "";
  }
}

function requestOrigin(req) {
  return normalizeOrigin(
    req.headers["x-partner-origin"] ||
      req.headers.origin ||
      req.headers.referer,
  );
}

function isTrustedFirstPartyOrigin(origin) {
  if (!origin) return false;
  const allowed = new Set([
    ...DEFAULT_TRUSTED_ORIGINS,
    ...(process.env.NODE_ENV === "production"
      ? []
      : DEVELOPMENT_TRUSTED_ORIGINS),
    ...configuredTrustedOrigins(),
  ].map((value) => normalizeOrigin(value)).filter(Boolean));
  return allowed.has(origin);
}

export default async function partnerAuth(req, res, next) {
  const partner = String(req.headers["x-partner-id"] || "").toLowerCase();
  const eventId = String(req.headers["x-partner-event-id"] || "");
  const timestamp = String(req.headers["x-partner-timestamp"] || "");
  const receivedSignature = String(
    req.headers["x-partner-signature"] || "",
  ).replace(/^sha256=/i, "");
  let settings;
  try {
    settings = await PartnerSettingsService.getResolvedSettings();
  } catch (error) {
    return res.status(503).json({
      success: false,
      code: "PARTNER_AUTH_NOT_CONFIGURED",
      error: error.message,
    });
  }
  const expectedPartner = settings.partnerId.toLowerCase();
  const secret = settings.partnerSecret;

  if (!settings.enabled) {
    return res.status(503).json({
      success: false,
      code: "PARTNER_AUTH_NOT_CONFIGURED",
      error: "Partner authentication is not configured",
    });
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    partner !== expectedPartner ||
    !/^[a-z0-9._:-]{8,180}$/i.test(eventId) ||
    !/^\d{10,13}$/.test(timestamp) ||
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS
  ) {
    return res.status(401).json({
      success: false,
      code: "INVALID_PARTNER_REQUEST",
      error: "Partner request identity or timestamp is invalid",
    });
  }

  const rawBody =
    req.rawBody ||
    Buffer.from(JSON.stringify(req.body || {}), "utf8");
  if (rawBody.byteLength > 256 * 1024) {
    return res.status(413).json({
      success: false,
      code: "PARTNER_PAYLOAD_TOO_LARGE",
      error: "Partner request body exceeds 256 KB",
    });
  }
  const hasUsableSecret = Boolean(String(secret || ""));
  const isSignedRequest =
    hasUsableSecret && /^[a-f0-9]{64}$/i.test(receivedSignature);
  if (isSignedRequest) {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody.toString("utf8")}`)
      .digest("hex");
    if (!safeEqual(receivedSignature, expectedSignature)) {
      return res.status(401).json({
        success: false,
        code: "INVALID_PARTNER_SIGNATURE",
        error: "Partner signature verification failed",
      });
    }
    req.partnerAuthMode = "signature";
  } else if (isTrustedFirstPartyOrigin(requestOrigin(req))) {
    req.partnerAuthMode = "trusted-origin";
  } else {
    return res.status(401).json({
      success: false,
      code: hasUsableSecret
        ? "INVALID_PARTNER_SIGNATURE"
        : "UNTRUSTED_PARTNER_ORIGIN",
      error: hasUsableSecret
        ? "Partner signature verification failed"
        : "Partner request origin is not trusted",
    });
  }

  if (String(req.body?.eventId || "") !== eventId) {
    return res.status(400).json({
      success: false,
      code: "PARTNER_EVENT_ID_MISMATCH",
      error: "Header and payload event IDs do not match",
    });
  }

  req.partner = expectedPartner;
  return next();
}
