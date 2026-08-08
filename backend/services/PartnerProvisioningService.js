import crypto from "crypto";
import ApiKey from "../models/ApiKey.js";
import PartnerTenant from "../models/PartnerTenant.js";
import User from "../models/User.js";
import PartnerSettingsService from "./PartnerSettingsService.js";
import { PARTNER_MANAGED_API_PERMISSIONS } from "../constants/apiPermissions.js";

const MANAGED_PERMISSIONS = PARTNER_MANAGED_API_PERMISSIONS;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function deriveRawKey(
  partner,
  externalCompanyId,
  credentialVersion,
  configuredSecret = process.env.DESKGO_API_KEY_DERIVATION_SECRET,
) {
  const secret = String(
    configuredSecret || "",
  );
  if (secret.length < 32) {
    const error = new Error(
      "DESKGO_API_KEY_DERIVATION_SECRET must be at least 32 characters",
    );
    error.statusCode = 503;
    error.code = "PARTNER_PROVISIONING_NOT_CONFIGURED";
    throw error;
  }
  const material = `${partner}:${externalCompanyId}:${credentialVersion}`;
  const digest = crypto.createHmac("sha256", secret).update(material).digest("hex");
  return `wac_live_${digest.slice(0, 48)}`;
}

function hashKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

class PartnerProvisioningService {
  async provision(payload, partner = "deskgo") {
    const partnerSettings = await PartnerSettingsService.getResolvedSettings();
    if (!partnerSettings.enabled || partner !== partnerSettings.partnerId) {
      const error = new Error("Partner provisioning is disabled");
      error.statusCode = 503;
      error.code = "PARTNER_PROVISIONING_NOT_CONFIGURED";
      throw error;
    }
    const externalCompanyId = String(
      payload.externalCompanyId || payload.companyId || "",
    ).trim();
    const companyName = String(payload.companyName || "").trim();
    const ownerEmail = normalizeEmail(payload.ownerEmail || payload.email);
    const credentialVersion = Math.max(
      1,
      Number.parseInt(payload.credentialVersion || 1, 10) || 1,
    );

    if (!externalCompanyId || !companyName || !ownerEmail) {
      const error = new Error(
        "externalCompanyId, companyName, and ownerEmail are required",
      );
      error.statusCode = 400;
      error.code = "INVALID_PROVISIONING_REQUEST";
      throw error;
    }
    if (
      externalCompanyId.length > 180 ||
      !/^[a-z0-9._:-]+$/i.test(externalCompanyId) ||
      companyName.length > 160 ||
      ownerEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) ||
      !Number.isSafeInteger(credentialVersion) ||
      credentialVersion > 1_000_000
    ) {
      const error = new Error("Provisioning identifiers or credential version are invalid");
      error.statusCode = 400;
      error.code = "INVALID_PROVISIONING_REQUEST";
      throw error;
    }

    let tenant = await PartnerTenant.findOne({ partner, externalCompanyId });
    let user = tenant ? await User.findById(tenant.userId) : null;

    if (!user) {
      user = await User.findOne({ email: ownerEmail });
      if (user && !user.managedByPartner) {
        const error = new Error(
          "This email already belongs to a regular OpenWhats account",
        );
        error.statusCode = 409;
        error.code = "OPENWHATS_EMAIL_ALREADY_REGISTERED";
        throw error;
      }
      if (
        user &&
        (user.partner !== partner ||
          user.partnerExternalCompanyId !== externalCompanyId)
      ) {
        const error = new Error(
          "This managed account belongs to another partner company",
        );
        error.statusCode = 409;
        error.code = "PARTNER_ACCOUNT_MAPPING_CONFLICT";
        throw error;
      }
    }

    let createdUser = false;
    if (!user) {
      try {
        user = await User.create({
          email: ownerEmail,
          name: companyName,
          authProvider: "partner",
          managedByPartner: true,
          partner,
          partnerExternalCompanyId: externalCompanyId,
          emailVerified: true,
        });
        createdUser = true;
      } catch (error) {
        if (error?.code !== 11000) throw error;
        user = await User.findOne({ email: ownerEmail });
        if (
          !user?.managedByPartner ||
          user.partner !== partner ||
          user.partnerExternalCompanyId !== externalCompanyId
        ) {
          const conflict = new Error(
            "This email belongs to another OpenWhats account",
          );
          conflict.statusCode = 409;
          conflict.code = "OPENWHATS_EMAIL_ALREADY_REGISTERED";
          throw conflict;
        }
      }
    }

    try {
      try {
        tenant = await PartnerTenant.findOneAndUpdate(
          { partner, externalCompanyId },
          {
            $setOnInsert: {
              userId: user._id,
              moduleKey: "whatsapp-business",
              status: "suspended",
              features: [],
              limits: {},
              webhookEnabled: true,
            },
          },
          { upsert: true, new: true, runValidators: true },
        );
      } catch (error) {
        if (error?.code !== 11000) throw error;
        tenant = await PartnerTenant.findOne({ partner, externalCompanyId });
        if (!tenant) throw error;
      }

      if (String(tenant.userId) !== String(user._id)) {
        const error = new Error("Partner company is mapped to another user");
        error.statusCode = 409;
        error.code = "PARTNER_ACCOUNT_MAPPING_CONFLICT";
        throw error;
      }
      if (
        Number(tenant.credentialVersion || 0) > 0 &&
        credentialVersion < Number(tenant.credentialVersion)
      ) {
        const error = new Error("Stale partner credential version");
        error.statusCode = 409;
        error.code = "STALE_PARTNER_CREDENTIAL_VERSION";
        throw error;
      }

      const rawKey = deriveRawKey(
        partner,
        externalCompanyId,
        credentialVersion,
        partnerSettings.apiKeyDerivationSecret,
      );
      const keyHash = hashKey(rawKey);
      const keyName = `DeskGo · ${companyName}`;
      let apiKey = await ApiKey.findOne({ keyHash });
      if (!apiKey) {
        apiKey = await ApiKey.create({
          userId: user._id,
          name: keyName,
          keyHash,
          keyPrefix: rawKey.slice(0, 16),
          environment: "live",
          permissions: [...MANAGED_PERMISSIONS],
          status: "active",
        });
      } else if (String(apiKey.userId) !== String(user._id)) {
        const error = new Error("Derived partner credential conflict");
        error.statusCode = 409;
        error.code = "PARTNER_CREDENTIAL_CONFLICT";
        throw error;
      } else {
        const permissionsChanged =
          apiKey.permissions.length !== MANAGED_PERMISSIONS.length ||
          MANAGED_PERMISSIONS.some(
            (permission) => !apiKey.permissions.includes(permission),
          );
        if (
          apiKey.status !== "active" ||
          apiKey.name !== keyName ||
          permissionsChanged
        ) {
          apiKey.status = "active";
          apiKey.name = keyName;
          apiKey.permissions = [...MANAGED_PERMISSIONS];
          await apiKey.save();
        }
      }

      if (credentialVersion > Number(tenant.credentialVersion || 0)) {
        await ApiKey.updateMany(
          {
            userId: user._id,
            _id: { $ne: apiKey._id },
            name: /^DeskGo · /,
            status: "active",
          },
          { $set: { status: "revoked" } },
        );
        tenant.credentialVersion = credentialVersion;
        await tenant.save();
      }

      return {
        created: createdUser,
        user,
        tenant,
        apiKey,
        rawKey,
        credentialVersion,
      };
    } catch (error) {
      // Provisioning is intentionally resumable. A managed user or suspended
      // tenant created before a transient failure is retained for the next
      // request instead of being deleted underneath a concurrent provision.
      throw error;
    }
  }
}

export { MANAGED_PERMISSIONS };
export default new PartnerProvisioningService();
