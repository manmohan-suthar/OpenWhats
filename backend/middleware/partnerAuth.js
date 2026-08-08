import crypto from "crypto";
import PartnerSettingsService from "../services/PartnerSettingsService.js";

const MAX_CLOCK_SKEW_SECONDS = 300;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

  if (!settings.enabled || !secret) {
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
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");

  if (!/^[a-f0-9]{64}$/i.test(receivedSignature) || !safeEqual(receivedSignature, expectedSignature)) {
    return res.status(401).json({
      success: false,
      code: "INVALID_PARTNER_SIGNATURE",
      error: "Partner signature verification failed",
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
