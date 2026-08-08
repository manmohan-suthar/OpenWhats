import mongoose from "mongoose";

const providerMessageRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true, index: true },
    chatJid: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    requestType: { type: String, required: true, default: "interactive" },
    status: {
      type: String,
      enum: ["processing", "succeeded", "failed"],
      default: "processing",
      index: true,
    },
    providerMessageId: { type: String, default: null },
    response: { type: mongoose.Schema.Types.Mixed, default: null },
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () =>
        new Date(
          Date.now() +
            Math.max(
              7,
              Number.parseInt(
                process.env.PROVIDER_IDEMPOTENCY_RETENTION_DAYS || "30",
                10,
              ) || 30,
            ) *
              24 *
              60 *
              60 *
              1000,
        ),
    },
  },
  { timestamps: true },
);

providerMessageRequestSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true },
);
providerMessageRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model(
  "ProviderMessageRequest",
  providerMessageRequestSchema,
);
