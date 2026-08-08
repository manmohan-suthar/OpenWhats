import crypto from "crypto";
import mongoose from "mongoose";
import PartnerSettings from "../models/PartnerSettings.js";
import { validateSafeRemoteUrl } from "../utils/safeRemoteMedia.js";

const SECRET_FIELDS = Object.freeze({
  partnerSecret: "partnerSecretEncrypted",
  apiKeyDerivationSecret: "apiKeyDerivationSecretEncrypted",
  webhookSecret: "webhookSecretEncrypted",
});

function encryptionKey() {
  const material = String(
    process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || "",
  );
  if (material.length < 32) {
    const error = new Error(
      "SETTINGS_ENCRYPTION_KEY (or JWT_SECRET) must be at least 32 characters",
    );
    error.statusCode = 503;
    error.code = "SETTINGS_ENCRYPTION_NOT_CONFIGURED";
    throw error;
  }
  return crypto.createHash("sha256").update(material).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

function decrypt(value) {
  if (!value) return "";
  const [version, iv, tag, ciphertext] = String(value).split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) {
    throw new Error("Invalid encrypted partner setting");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function envSettings() {
  return {
    enabled: true,
    partnerId: String(process.env.DESKGO_PARTNER_ID || "deskgo")
      .trim()
      .toLowerCase(),
    partnerSecret: String(process.env.DESKGO_PARTNER_SECRET || "").trim(),
    apiKeyDerivationSecret: String(
      process.env.DESKGO_API_KEY_DERIVATION_SECRET || "",
    ).trim(),
    webhookUrl: String(process.env.DESKGO_WEBHOOK_URL || "").trim(),
    webhookSecret: String(process.env.DESKGO_WEBHOOK_SECRET || "").trim(),
  };
}

class PartnerSettingsService {
  async findStored() {
    if (mongoose.connection.readyState !== 1) return null;
    return PartnerSettings.findOne({ key: "deskgo" })
      .select(
        "+partnerSecretEncrypted +apiKeyDerivationSecretEncrypted +webhookSecretEncrypted",
      )
      .lean();
  }

  async getResolvedSettings() {
    const fallback = envSettings();
    const stored = await this.findStored();
    if (!stored) return fallback;
    return {
      enabled: stored.enabled !== false,
      partnerId: stored.partnerId || fallback.partnerId,
      partnerSecret: stored.partnerSecretEncrypted
        ? decrypt(stored.partnerSecretEncrypted)
        : fallback.partnerSecret,
      apiKeyDerivationSecret: stored.apiKeyDerivationSecretEncrypted
        ? decrypt(stored.apiKeyDerivationSecretEncrypted)
        : fallback.apiKeyDerivationSecret,
      webhookUrl: stored.webhookUrl || fallback.webhookUrl,
      webhookSecret: stored.webhookSecretEncrypted
        ? decrypt(stored.webhookSecretEncrypted)
        : fallback.webhookSecret,
    };
  }

  async getAdminView() {
    const fallback = envSettings();
    const stored = await this.findStored();
    const source = (hasStored, hasEnv) =>
      hasStored ? "admin" : hasEnv ? "environment" : "not-configured";
    return {
      enabled: stored?.enabled !== false,
      partnerId: stored?.partnerId || fallback.partnerId,
      webhookUrl: stored?.webhookUrl || fallback.webhookUrl,
      secrets: {
        partnerSecret: {
          configured: Boolean(stored?.partnerSecretEncrypted || fallback.partnerSecret),
          source: source(
            Boolean(stored?.partnerSecretEncrypted),
            Boolean(fallback.partnerSecret),
          ),
        },
        apiKeyDerivationSecret: {
          configured: Boolean(
            stored?.apiKeyDerivationSecretEncrypted ||
              fallback.apiKeyDerivationSecret,
          ),
          source: source(
            Boolean(stored?.apiKeyDerivationSecretEncrypted),
            Boolean(fallback.apiKeyDerivationSecret),
          ),
        },
        webhookSecret: {
          configured: Boolean(
            stored?.webhookSecretEncrypted || fallback.webhookSecret,
          ),
          source: source(
            Boolean(stored?.webhookSecretEncrypted),
            Boolean(fallback.webhookSecret),
          ),
        },
      },
      sources: {
        partnerId: stored?.partnerId ? "admin" : "environment/default",
        webhookUrl: stored?.webhookUrl
          ? "admin"
          : fallback.webhookUrl
            ? "environment"
            : "not-configured",
      },
      updatedAt: stored?.updatedAt || null,
    };
  }

  async update(payload, updatedBy) {
    const update = { updatedBy };
    const unset = {};
    if (typeof payload.enabled === "boolean") update.enabled = payload.enabled;
    if (typeof payload.partnerId === "string") {
      const partnerId = payload.partnerId.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9_-]{1,49}$/.test(partnerId)) {
        const error = new Error("Partner ID format is invalid");
        error.statusCode = 400;
        throw error;
      }
      update.partnerId = partnerId;
    }
    if (typeof payload.webhookUrl === "string") {
      const webhookUrl = payload.webhookUrl.trim();
      if (webhookUrl) {
        try {
          await validateSafeRemoteUrl(webhookUrl, {
            allowHttp: process.env.NODE_ENV !== "production",
            allowPrivateLocal: process.env.NODE_ENV !== "production",
            allowedHosts: [],
          });
        } catch (cause) {
          const error = new Error("Webhook URL is invalid");
          error.statusCode = 400;
          error.code = "PARTNER_WEBHOOK_URL_INVALID";
          error.details = { reason: cause?.message || "Unsafe webhook URL" };
          throw error;
        }
      }
      update.webhookUrl = webhookUrl;
    }

    for (const [input, field] of Object.entries(SECRET_FIELDS)) {
      if (payload[`clear${input[0].toUpperCase()}${input.slice(1)}`] === true) {
        unset[field] = 1;
        continue;
      }
      if (typeof payload[input] === "string" && payload[input].trim()) {
        const value = payload[input].trim();
        if (value.length < 32) {
          const error = new Error(`${input} must be at least 32 characters`);
          error.statusCode = 400;
          throw error;
        }
        update[field] = encrypt(value);
      }
    }

    if (Object.keys(update).length === 1 && !Object.keys(unset).length) {
      const error = new Error("No settings provided");
      error.statusCode = 400;
      throw error;
    }
    const operation = { $set: update };
    if (Object.keys(unset).length) operation.$unset = unset;
    await PartnerSettings.findOneAndUpdate(
      { key: "deskgo" },
      operation,
      { upsert: true, new: true, runValidators: true },
    );
    return this.getAdminView();
  }
}

export { decrypt, encrypt };
export default new PartnerSettingsService();
