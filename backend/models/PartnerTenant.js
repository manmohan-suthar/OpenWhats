import mongoose from "mongoose";

const partnerTenantSchema = new mongoose.Schema(
  {
    partner: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: "deskgo",
    },
    externalCompanyId: { type: String, required: true, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    moduleKey: {
      type: String,
      required: true,
      default: "whatsapp-business",
    },
    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "grace",
        "past_due",
        "suspended",
        "cancelled",
        "expired",
      ],
      required: true,
      default: "active",
      index: true,
    },
    features: { type: [String], default: [] },
    limits: { type: mongoose.Schema.Types.Mixed, default: {} },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    graceEndsAt: { type: Date, default: null },
    eventVersion: { type: Number, default: 0 },
    credentialVersion: { type: Number, default: 0 },
    lastEventId: { type: String, default: "" },
    lastSyncedAt: { type: Date, default: null },
    webhookEnabled: { type: Boolean, default: true },
    usage: {
      monthKey: { type: String, default: "" },
      messages: { type: Number, default: 0 },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

partnerTenantSchema.index(
  { partner: 1, externalCompanyId: 1 },
  { unique: true },
);
partnerTenantSchema.index({ partner: 1, userId: 1 }, { unique: true });

export default mongoose.model("PartnerTenant", partnerTenantSchema);
