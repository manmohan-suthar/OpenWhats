import crypto from "crypto";
import mongoose from "mongoose";
import {
  PartnerEventReceipt,
  PartnerTenant,
  User,
} from "../models/index.js";
import PartnerSettingsService from "./PartnerSettingsService.js";

class PartnerLimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LimitError";
    this.statusCode = 403;
    this.code = "LIMIT_EXCEEDED";
    this.details = details;
  }
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "grace", "past_due"]);
const PARTNER_FEATURES = new Set([
  "whatsapp-session-management",
  "whatsapp-live-chat",
  "whatsapp-send-message",
  "whatsapp-contacts-groups",
  "whatsapp-media-messaging",
  "whatsapp-integrations",
  "whatsapp-interactive-messaging",
  "whatsapp-campaigns",
]);
const normalize = (value) => String(value || "").trim().toLowerCase();

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

async function claimPartnerEvent(input) {
  try {
    const receipt = await PartnerEventReceipt.create({
      ...input,
      status: "processing",
      processedAt: null,
    });
    return { receipt, duplicate: false };
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  const existing = await PartnerEventReceipt.findOne({
    partner: input.partner,
    eventId: input.eventId,
  });
  if (!existing) {
    const error = new Error("Partner event receipt could not be resolved");
    error.statusCode = 409;
    error.code = "PARTNER_EVENT_RECEIPT_UNAVAILABLE";
    throw error;
  }
  if (existing.payloadHash !== input.payloadHash) {
    const error = new Error("Event ID was already used with another payload");
    error.statusCode = 409;
    error.code = "PARTNER_EVENT_CONFLICT";
    throw error;
  }
  if (!existing.status || existing.status === "succeeded") {
    return { receipt: existing, duplicate: true };
  }

  const staleBefore = new Date(Date.now() - 5 * 60_000);
  const reclaimed = await PartnerEventReceipt.findOneAndUpdate(
    {
      _id: existing._id,
      payloadHash: input.payloadHash,
      $or: [
        { status: "failed" },
        { status: "processing", updatedAt: { $lte: staleBefore } },
      ],
    },
    {
      $set: {
        status: "processing",
        errorCode: null,
        errorMessage: null,
        processedAt: null,
      },
    },
    { new: true },
  );
  if (!reclaimed) {
    const error = new Error("This partner event is already being processed");
    error.statusCode = 409;
    error.code = "PARTNER_EVENT_IN_PROGRESS";
    throw error;
  }
  return { receipt: reclaimed, duplicate: false };
}

class PartnerTenantService {
  async findForUser(userId) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
    const tenant = await PartnerTenant.findOne({ userId }).lean();
    if (!tenant) return null;

    // Partner IDs can be rotated from the DeskGo admin settings. Keep older
    // managed users attached to the current company tenant instead of making
    // every request fail against a stale partner mapping.
    const settings = await PartnerSettingsService.getResolvedSettings().catch(
      () => null,
    );
    if (!settings?.partnerId || tenant.partner === settings.partnerId) {
      return tenant;
    }

    const user = await User.findById(userId)
      .select("partnerExternalCompanyId")
      .lean();
    const externalCompanyId = String(user?.partnerExternalCompanyId || "").trim();
    if (!externalCompanyId) return tenant;

    return (
      (await PartnerTenant.findOne({
        partner: settings.partnerId,
        externalCompanyId,
      }).lean()) || tenant
    );
  }

  isUsable(tenant, now = new Date()) {
    if (!tenant || !ACTIVE_STATUSES.has(normalize(tenant.status))) return false;
    if (
      tenant.currentPeriodEnd &&
      new Date(tenant.currentPeriodEnd) < now &&
      (!tenant.graceEndsAt || new Date(tenant.graceEndsAt) < now)
    ) {
      return false;
    }
    return true;
  }

  async requireActiveForUser(userId) {
    const tenant = await this.findForUser(userId);
    if (!tenant) return null;
    if (!this.isUsable(tenant)) {
      throw new PartnerLimitError(
        "WhatsApp Business subscription is not active in DeskGo.",
        {
          reason: "partner_subscription_inactive",
          partner: tenant.partner,
          status: tenant.status,
          currentPeriodEnd: tenant.currentPeriodEnd,
        },
      );
    }
    return tenant;
  }

  hasFeature(tenant, feature) {
    const features = new Set(tenant?.features || []);
    return features.has(feature);
  }

  async assertResourceLimit(userId, resourceKey, increment = 1) {
    const tenant = await this.requireActiveForUser(userId);
    if (!tenant) return null;

    const resources = {
      sessions: {
        feature: "whatsapp-session-management",
        label: "WhatsApp session",
      },
      numberLists: {
        feature: "whatsapp-contacts-groups",
        label: "WhatsApp number list",
      },
      campaigns: {
        feature: "whatsapp-campaigns",
        label: "WhatsApp campaign",
      },
    };
    const resource = resources[resourceKey];
    if (!resource) {
      throw new PartnerLimitError(
        `${resourceKey} is not available to a WhatsApp Business partner tenant.`,
        { reason: "partner_resource_not_available", resource: resourceKey },
      );
    }
    if (!this.hasFeature(tenant, resource.feature)) {
      throw new PartnerLimitError(
        `${resource.label} is not included in this subscription.`,
        {
          reason: "partner_feature_disabled",
          feature: resource.feature,
        },
      );
    }

    return {
      tenant,
      requested: increment,
      managedBy: "deskgo",
      billingAuthority: "deskgo",
    };
  }

  async assertMessageQuota(userId, count = 1) {
    const tenant = await this.requireActiveForUser(userId);
    if (!tenant) return null;
    if (!this.hasFeature(tenant, "whatsapp-send-message")) {
      throw new PartnerLimitError("Message sending is not included in this subscription.", {
        reason: "partner_feature_disabled",
        feature: "whatsapp-send-message",
      });
    }

    return {
      tenant,
      requested: count,
      managedBy: "deskgo",
      billingAuthority: "deskgo",
    };
  }

  async consumeMessageQuota(userId, count = 1) {
    const tenant = await this.findForUser(userId);
    if (!tenant) return null;
    return {
      tenant,
      consumed: count,
      managedBy: "deskgo",
      billingAuthority: "deskgo",
    };
  }

  async syncEntitlement(payload, partner = "deskgo") {
    const eventId = String(payload.eventId || "").trim();
    const eventType = String(payload.eventType || payload.type || "").trim();
    const externalCompanyId = String(
      payload.externalCompanyId || payload.companyId || "",
    ).trim();
    if (!eventId || !eventType || !externalCompanyId) {
      const error = new Error(
        "eventId, eventType, and externalCompanyId/companyId are required",
      );
      error.statusCode = 400;
      throw error;
    }
    if (
      !/^[a-z0-9._:-]{8,180}$/i.test(eventId) ||
      eventType !== "subscription.synchronized" ||
      externalCompanyId.length > 180 ||
      !/^[a-z0-9._:-]+$/i.test(externalCompanyId)
    ) {
      const error = new Error("Partner entitlement event identifiers are invalid");
      error.statusCode = 400;
      error.code = "INVALID_PARTNER_EVENT";
      throw error;
    }
    const status = normalize(payload.status || payload.subscriptionStatus);
    const supportedStatuses = new Set([
      "trialing",
      "active",
      "grace",
      "past_due",
      "suspended",
      "cancelled",
      "expired",
    ]);
    if (!supportedStatuses.has(status)) {
      const error = new Error("A supported subscription status is required");
      error.statusCode = 400;
      error.code = "INVALID_PARTNER_SUBSCRIPTION_STATUS";
      throw error;
    }
    if ((payload.moduleKey || "whatsapp-business") !== "whatsapp-business") {
      const error = new Error("Only the whatsapp-business module is supported");
      error.statusCode = 400;
      error.code = "INVALID_PARTNER_MODULE";
      throw error;
    }
    const features = Array.isArray(payload.features)
      ? [...new Set(payload.features.map((feature) => String(feature).trim()))]
      : [];
    if (features.length > PARTNER_FEATURES.size || features.some((feature) => !PARTNER_FEATURES.has(feature))) {
      const error = new Error("Partner entitlement contains an unsupported feature");
      error.statusCode = 400;
      error.code = "INVALID_PARTNER_FEATURE";
      throw error;
    }
    const parseOptionalDate = (value, label) => {
      if (value === undefined || value === null || value === "") return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        const error = new Error(`${label} must be a valid ISO date`);
        error.statusCode = 400;
        error.code = "INVALID_PARTNER_PERIOD";
        throw error;
      }
      return date;
    };
    const currentPeriodStart = parseOptionalDate(payload.currentPeriodStart || payload.periodStart, "currentPeriodStart");
    const currentPeriodEnd = parseOptionalDate(payload.currentPeriodEnd || payload.periodEnd, "currentPeriodEnd");
    const graceEndsAt = parseOptionalDate(payload.graceEndsAt, "graceEndsAt");
    if (currentPeriodStart && currentPeriodEnd && currentPeriodEnd <= currentPeriodStart) {
      const error = new Error("currentPeriodEnd must be later than currentPeriodStart");
      error.statusCode = 400;
      error.code = "INVALID_PARTNER_PERIOD";
      throw error;
    }
    const metadata = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata
      : {};
    if (Buffer.byteLength(JSON.stringify(metadata), "utf8") > 64 * 1024) {
      const error = new Error("Partner entitlement metadata exceeds 64 KB");
      error.statusCode = 400;
      error.code = "INVALID_PARTNER_METADATA";
      throw error;
    }

    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(canonical(payload)))
      .digest("hex");
    const claim = await claimPartnerEvent({
      partner,
      eventId,
      eventType,
      externalCompanyId,
      payloadHash,
    });
    if (claim.duplicate) {
      return {
        duplicate: true,
        tenant: await PartnerTenant.findOne({ partner, externalCompanyId }).lean(),
      };
    }
    try {
      const user = payload.openWhatsUserId
        ? await User.findById(payload.openWhatsUserId)
        : await User.findOne({ email: normalize(payload.email) });
      if (!user) {
        const error = new Error("Mapped OpenWhats user was not found");
        error.statusCode = 404;
        error.code = "OPENWHATS_USER_NOT_FOUND";
        throw error;
      }
      if (
        !user.managedByPartner ||
        user.partner !== partner ||
        user.partnerExternalCompanyId !== externalCompanyId
      ) {
        const error = new Error("Mapped OpenWhats user does not belong to this partner company");
        error.statusCode = 409;
        error.code = "PARTNER_ACCOUNT_MAPPING_CONFLICT";
        throw error;
      }

      const eventVersion = Number(payload.eventVersion);
      if (!Number.isSafeInteger(eventVersion) || eventVersion < 1) {
        const error = new Error("eventVersion must be a positive safe integer");
        error.statusCode = 400;
        error.code = "INVALID_PARTNER_EVENT_VERSION";
        throw error;
      }
      const current = await PartnerTenant.findOne({ partner, externalCompanyId });
      if (
        current &&
        current.eventVersion === eventVersion &&
        current.lastEventId === eventId
      ) {
        await PartnerEventReceipt.updateOne(
          { _id: claim.receipt._id, status: "processing" },
          {
            $set: {
              status: "succeeded",
              processedAt: new Date(),
              errorCode: null,
              errorMessage: null,
            },
          },
        );
        return { duplicate: true, tenant: current.toObject() };
      }
      if (current && eventVersion <= current.eventVersion) {
        const error = new Error("Stale partner entitlement event");
        error.statusCode = 409;
        error.code = "STALE_PARTNER_EVENT";
        throw error;
      }

      let tenant;
      try {
        tenant = await PartnerTenant.findOneAndUpdate(
          {
            partner,
            externalCompanyId,
            $or: [
              { eventVersion: { $lt: eventVersion } },
              { eventVersion: { $exists: false } },
            ],
          },
          {
            $set: {
              userId: user._id,
              moduleKey: payload.moduleKey || "whatsapp-business",
              status,
              features,
              // Numeric plan limits are intentionally not authoritative here.
              // DeskGo reserves/consumes usage before calling OpenWhats.
              limits: {},
              currentPeriodStart,
              currentPeriodEnd,
              graceEndsAt,
              eventVersion,
              lastEventId: eventId,
              lastSyncedAt: new Date(),
              webhookEnabled: payload.webhookEnabled !== false,
              metadata,
            },
          },
          { upsert: true, new: true, runValidators: true },
        );
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const winner = await PartnerTenant.findOne({
          partner,
          externalCompanyId,
        });
        if (
          winner?.eventVersion === eventVersion &&
          winner.lastEventId === eventId
        ) {
          tenant = winner;
        } else {
          const staleError = new Error("Stale partner entitlement event");
          staleError.statusCode = 409;
          staleError.code = "STALE_PARTNER_EVENT";
          throw staleError;
        }
      }
      if (!tenant) {
        const error = new Error("Stale partner entitlement event");
        error.statusCode = 409;
        error.code = "STALE_PARTNER_EVENT";
        throw error;
      }

      await PartnerEventReceipt.updateOne(
        { _id: claim.receipt._id, status: "processing" },
        {
          $set: {
            status: "succeeded",
            processedAt: new Date(),
            errorCode: null,
            errorMessage: null,
          },
        },
      );
      return { duplicate: false, tenant: tenant.toObject() };
    } catch (error) {
      await PartnerEventReceipt.updateOne(
        { _id: claim.receipt._id, status: "processing" },
        {
          $set: {
            status: "failed",
            errorCode: error?.code || "PARTNER_EVENT_FAILED",
            errorMessage: String(error?.message || "Partner event failed").slice(
              0,
              1_000,
            ),
            processedAt: new Date(),
          },
        },
      ).catch(() => null);
      throw error;
    }
  }
}

export default new PartnerTenantService();
