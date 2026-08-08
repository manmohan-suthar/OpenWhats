import mongoose from "mongoose";

const partnerSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "deskgo" },
    enabled: { type: Boolean, default: true },
    partnerId: { type: String, trim: true, lowercase: true, default: "" },
    webhookUrl: { type: String, trim: true, default: "" },
    partnerSecretEncrypted: { type: String, select: false, default: "" },
    apiKeyDerivationSecretEncrypted: {
      type: String,
      select: false,
      default: "",
    },
    webhookSecretEncrypted: { type: String, select: false, default: "" },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("PartnerSettings", partnerSettingsSchema);
