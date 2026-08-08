import mongoose from "mongoose";

const partnerEventReceiptSchema = new mongoose.Schema(
  {
    partner: { type: String, required: true, lowercase: true, trim: true },
    eventId: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    externalCompanyId: { type: String, default: "" },
    payloadHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "succeeded", "failed"],
      default: "succeeded",
      index: true,
    },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

partnerEventReceiptSchema.index(
  { partner: 1, eventId: 1 },
  { unique: true },
);
partnerEventReceiptSchema.index({ status: 1, updatedAt: 1 });

export default mongoose.model(
  "PartnerEventReceipt",
  partnerEventReceiptSchema,
);
