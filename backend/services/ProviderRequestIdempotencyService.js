import crypto from "crypto";
import { ProviderMessageRequest } from "../models/index.js";

class ProviderRequestIdempotencyError extends Error {
  constructor(message, { statusCode = 409, code, details } = {}) {
    super(message);
    this.name = "ProviderRequestIdempotencyError";
    this.statusCode = statusCode;
    this.code = code || "IDEMPOTENCY_CONFLICT";
    this.details = details;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

function normalizeKey(value, required = false) {
  const key = String(value || "").trim();
  if (!key) {
    if (required) {
      return `req_auto_${crypto.randomUUID()}`;
    }
    return null;
  }
  if (key.length < 8 || key.length > 180 || /[\u0000-\u001f\u007f]/.test(key)) {
    throw new ProviderRequestIdempotencyError(
      "Idempotency-Key must be between 8 and 180 safe characters",
      { statusCode: 400, code: "IDEMPOTENCY_KEY_INVALID" },
    );
  }
  return key;
}

function hashRequest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

async function resolveExisting(userId, key, requestHash) {
  const existing = await ProviderMessageRequest.findOne({
    userId,
    idempotencyKey: key,
  }).lean();
  if (!existing) return null;
  if (existing.requestHash !== requestHash) {
    throw new ProviderRequestIdempotencyError(
      "This idempotency key was already used for a different request",
      { code: "IDEMPOTENCY_PAYLOAD_CONFLICT" },
    );
  }
  if (existing.status === "succeeded") {
    return { response: existing.response, duplicate: true };
  }
  if (existing.status === "failed") {
    throw new ProviderRequestIdempotencyError(
      existing.errorMessage || "The previous request attempt failed",
      {
        code: existing.errorCode || "IDEMPOTENT_REQUEST_PREVIOUSLY_FAILED",
      },
    );
  }
  throw new ProviderRequestIdempotencyError(
    "This request is already being processed",
    { code: "IDEMPOTENT_REQUEST_IN_PROGRESS" },
  );
}

export async function executeProviderIdempotentRequest({
  userId,
  sessionId,
  chatJid,
  idempotencyKey,
  requestType,
  payload,
  requireKey = false,
  execute,
}) {
  const key = normalizeKey(idempotencyKey, requireKey);
  if (!key) return { response: await execute(), duplicate: false };
  const requestHash = hashRequest({ sessionId, chatJid, requestType, payload });
  const prior = await resolveExisting(userId, key, requestHash);
  if (prior) return prior;

  let request;
  try {
    request = await ProviderMessageRequest.create({
      userId,
      sessionId,
      chatJid,
      idempotencyKey: key,
      requestHash,
      requestType,
      status: "processing",
    });
  } catch (error) {
    if (error?.code === 11000) {
      const raced = await resolveExisting(userId, key, requestHash);
      if (raced) return raced;
      throw new ProviderRequestIdempotencyError(
        "The idempotency receipt could not be resolved",
        { code: "IDEMPOTENCY_RECEIPT_UNAVAILABLE" },
      );
    }
    throw error;
  }

  try {
    const response = await execute();
    const providerMessageId = String(
      response?.message?.messageId ||
        response?.messageId ||
        response?.data?.messageId ||
        "",
    );
    await ProviderMessageRequest.updateOne(
      { _id: request._id, status: "processing" },
      {
        $set: {
          status: "succeeded",
          response,
          providerMessageId: providerMessageId || null,
          completedAt: new Date(),
        },
      },
    );
    return { response, duplicate: false };
  } catch (error) {
    await ProviderMessageRequest.updateOne(
      { _id: request._id, status: "processing" },
      {
        $set: {
          status: "failed",
          errorCode: error?.code || "PROVIDER_REQUEST_FAILED",
          errorMessage: String(error?.message || "Provider request failed").slice(
            0,
            1_000,
          ),
          completedAt: new Date(),
        },
      },
    ).catch(() => null);
    throw error;
  }
}

export default { executeProviderIdempotentRequest };
