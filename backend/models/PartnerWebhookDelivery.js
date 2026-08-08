import mongoose from "mongoose";

const partnerWebhookDeliverySchema = new mongoose.Schema(
  {
    partner: { type: String, required: true, lowercase: true, trim: true },
    externalCompanyId: { type: String, required: true, trim: true },
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "delivered", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    deliveredAt: { type: Date, default: null },
    lastStatusCode: { type: Number, default: null },
    lastError: { type: String, default: "" },
    processingStartedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

partnerWebhookDeliverySchema.index({ status: 1, nextAttemptAt: 1 });

export default mongoose.model(
  "PartnerWebhookDelivery",
  partnerWebhookDeliverySchema,
);
