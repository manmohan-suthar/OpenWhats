import crypto from "crypto";
import { randomUUID } from "crypto";
import { PartnerTenant, PartnerWebhookDelivery } from "../models/index.js";
import PartnerSettingsService from "./PartnerSettingsService.js";
import { postSafeJson } from "../utils/safeRemoteMedia.js";

const MAX_ATTEMPTS = 8;
const DISPATCH_INTERVAL_MS = 10_000;
const PROCESSING_LEASE_MS = 2 * 60_000;

function retryDelay(attempt) {
  return Math.min(5 * 60_000, 2 ** Math.max(attempt - 1, 0) * 5_000);
}

class PartnerWebhookService {
  constructor() {
    this.timer = null;
    this.dispatching = false;
  }

  async enqueueForUser(userId, eventType, data) {
    const tenant = await PartnerTenant.findOne({
      userId,
      webhookEnabled: true,
    }).lean();
    if (!tenant) return null;
    const settings = await PartnerSettingsService.getResolvedSettings();
    if (
      !settings.enabled ||
      tenant.partner !== settings.partnerId ||
      !settings.webhookUrl
    ) {
      return null;
    }

    const eventId = randomUUID();
    const payload = {
      eventId,
      eventType,
      occurredAt: new Date().toISOString(),
      partner: tenant.partner,
      externalCompanyId: tenant.externalCompanyId,
      moduleKey: tenant.moduleKey,
      data,
    };
    const delivery = await PartnerWebhookDelivery.create({
      partner: tenant.partner,
      externalCompanyId: tenant.externalCompanyId,
      eventId,
      eventType,
      payload,
    });
    this.dispatchOne(delivery._id).catch((error) =>
      console.error("[PARTNER WEBHOOK] immediate dispatch failed:", error.message),
    );
    return delivery;
  }

  async dispatchOne(deliveryId) {
    const delivery = await PartnerWebhookDelivery.findOneAndUpdate(
      {
        _id: deliveryId,
        attempts: { $lt: MAX_ATTEMPTS },
        $or: [
          {
            status: { $in: ["pending", "failed"] },
            nextAttemptAt: { $lte: new Date() },
          },
          {
            status: "processing",
            $or: [
              { processingStartedAt: null },
              {
                processingStartedAt: {
                  $lte: new Date(Date.now() - PROCESSING_LEASE_MS),
                },
              },
            ],
          },
        ],
      },
      {
        $set: { status: "processing", processingStartedAt: new Date() },
        $inc: { attempts: 1 },
      },
      { new: true },
    );
    if (!delivery) return null;

    const settings = await PartnerSettingsService.getResolvedSettings();
    const url =
      settings.enabled && delivery.partner === settings.partnerId
        ? settings.webhookUrl
        : "";
    const secret =
      settings.enabled && delivery.partner === settings.partnerId
        ? settings.webhookSecret
        : "";
    if (!url || !secret) {
      delivery.status = "failed";
      delivery.lastError = "Partner webhook URL or secret is not configured";
      delivery.nextAttemptAt = new Date(Date.now() + retryDelay(delivery.attempts));
      delivery.processingStartedAt = null;
      await delivery.save();
      return delivery;
    }

    const body = JSON.stringify(delivery.payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    try {
      const response = await postSafeJson(url, {
        headers: {
          "content-type": "application/json",
          "x-openwhats-event-id": delivery.eventId,
          "x-openwhats-timestamp": timestamp,
          "x-openwhats-signature": `sha256=${signature}`,
        },
        body,
        timeoutMs: 10_000,
        allowHttp: process.env.NODE_ENV !== "production",
        allowPrivateLocal: process.env.NODE_ENV !== "production",
        allowedHosts: [],
      });
      delivery.lastStatusCode = response.status;
      if (!response.ok) {
        throw new Error(`Partner returned HTTP ${response.status}`);
      }
      const acknowledgement = response.data;
      if (acknowledgement?.success !== true) {
        throw new Error("Partner returned an invalid webhook acknowledgement");
      }
      delivery.status = "delivered";
      delivery.deliveredAt = new Date();
      delivery.lastError = "";
      delivery.processingStartedAt = null;
    } catch (error) {
      delivery.status =
        delivery.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
      delivery.lastError = String(error.message || error).slice(0, 500);
      delivery.nextAttemptAt = new Date(
        Date.now() + retryDelay(delivery.attempts),
      );
      delivery.processingStartedAt = null;
    }
    await delivery.save();
    return delivery;
  }

  async dispatchPending() {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      const deliveries = await PartnerWebhookDelivery.find({
        attempts: { $lt: MAX_ATTEMPTS },
        $or: [
          {
            status: { $in: ["pending", "failed"] },
            nextAttemptAt: { $lte: new Date() },
          },
          {
            status: "processing",
            $or: [
              { processingStartedAt: null },
              {
                processingStartedAt: {
                  $lte: new Date(Date.now() - PROCESSING_LEASE_MS),
                },
              },
            ],
          },
        ],
      })
        .sort({ nextAttemptAt: 1 })
        .limit(25)
        .select("_id")
        .lean();
      for (const delivery of deliveries) {
        await this.dispatchOne(delivery._id);
      }
    } finally {
      this.dispatching = false;
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(
      () =>
        this.dispatchPending().catch((error) =>
          console.error("[PARTNER WEBHOOK] dispatcher failed:", error.message),
        ),
      DISPATCH_INTERVAL_MS,
    );
    this.timer.unref?.();
  }
}

export default new PartnerWebhookService();
