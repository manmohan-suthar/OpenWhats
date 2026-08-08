import crypto from "crypto";
import ApiKey from "../models/ApiKey.js";
import {
  API_PERMISSIONS,
  PARTNER_MANAGED_API_PERMISSIONS,
  isValidApiPermission,
} from "../constants/apiPermissions.js";

const sha256 = (str) => crypto.createHash("sha256").update(str).digest("hex");

const generateRawKey = (env) => {
  const prefix = env === "test" ? "wac_test_" : "wac_live_";
  const random = crypto.randomBytes(24).toString("hex"); // 48 hex chars
  return prefix + random;
};

// POST /api/api-keys
export const createApiKey = async (req, res) => {
  try {
    const { name, environment = "live", permissions } = req.body;
    const userId = req.user.id;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: "Key name is required" });
    }

    const cap = await ApiKey.countDocuments({ userId, status: "active" });
    if (cap >= 10) {
      return res.status(400).json({ success: false, error: "Maximum of 10 active API keys allowed" });
    }

    const rawKey = generateRawKey(environment);
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 16); // "wac_live_a1b2c3d4"

    if (!["live", "test"].includes(environment)) {
      return res.status(400).json({
        success: false,
        error: "environment must be live or test",
      });
    }

    if (
      permissions !== undefined &&
      (!Array.isArray(permissions) ||
        permissions.length === 0 ||
        permissions.some((permission) => !isValidApiPermission(permission)))
    ) {
      return res.status(400).json({
        success: false,
        error: "permissions contains an unsupported permission",
        allowedPermissions: API_PERMISSIONS,
      });
    }

    const requestedPermissions = permissions || API_PERMISSIONS;
    const apiKey = await ApiKey.create({
      userId,
      name: name.trim(),
      keyHash,
      keyPrefix,
      environment,
      permissions: [...new Set(requestedPermissions)],
    });

    // Return the raw key ONCE — it will never be retrievable again
    res.status(201).json({
      success: true,
      data: {
        id: apiKey._id,
        name: apiKey.name,
        environment: apiKey.environment,
        permissions: apiKey.permissions,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
        // Only returned on creation:
        rawKey,
      },
    });
  } catch (err) {
    console.error("createApiKey:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/api-keys
export const listApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();

    const safe = keys.map((k) => ({
      id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      environment: k.environment,
      permissions: k.permissions,
      status: k.status,
      lastUsed: k.lastUsed,
      callCount: k.callCount,
      createdAt: k.createdAt,
    }));

    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateApiKey = async (req, res) => {
  try {
    const { name, permissions } = req.body || {};
    const updates = {};

    if (name !== undefined) {
      const normalizedName = String(name).trim();
      if (!normalizedName || normalizedName.length > 100) {
        return res.status(400).json({
          success: false,
          error: "Key name must be between 1 and 100 characters",
        });
      }
      updates.name = normalizedName;
    }

    if (permissions !== undefined) {
      if (
        !Array.isArray(permissions) ||
        permissions.length === 0 ||
        permissions.some((permission) => !isValidApiPermission(permission))
      ) {
        return res.status(400).json({
          success: false,
          error: "permissions contains an unsupported permission",
          allowedPermissions: API_PERMISSIONS,
        });
      }
      updates.permissions = [...new Set(permissions)];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Provide name or permissions to update",
      });
    }

    const key = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!key) {
      return res.status(404).json({ success: false, error: "API key not found" });
    }

    return res.json({
      success: true,
      data: {
        id: key._id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        environment: key.environment,
        permissions: key.permissions,
        status: key.status,
        lastUsed: key.lastUsed,
        callCount: key.callCount,
        createdAt: key.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/api-keys/:id  (revoke)
export const revokeApiKey = async (req, res) => {
  try {
    const key = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: "revoked" },
      { new: true }
    );
    if (!key) return res.status(404).json({ success: false, error: "API key not found" });
    res.json({ success: true, message: "API key revoked" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/api-keys/:id/permanent  (hard delete)
export const deleteApiKey = async (req, res) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!key) return res.status(404).json({ success: false, error: "API key not found" });
    res.json({ success: true, message: "API key deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const findApiKeyPrincipal = async (rawKey) => {
  try {
    const keyHash = sha256(rawKey);
    const apiKey = await ApiKey.findOne({
      keyHash,
      status: "active",
    }).populate("userId");

    if (!apiKey?.userId) return null;

    // Partner-managed credentials are controlled by the partner contract, not
    // by the hidden OpenWhats account. Reconcile new provider capabilities on
    // first use so existing DeskGo tenants do not require credential rotation.
    if (
      apiKey.userId.managedByPartner &&
      apiKey.userId.partner === "deskgo" &&
      String(apiKey.name || "").startsWith("DeskGo · ") &&
      (apiKey.permissions.length !== PARTNER_MANAGED_API_PERMISSIONS.length ||
        PARTNER_MANAGED_API_PERMISSIONS.some(
          (permission) => !apiKey.permissions.includes(permission),
        ))
    ) {
      apiKey.permissions = [...PARTNER_MANAGED_API_PERMISSIONS];
      await apiKey.save();
    }

    ApiKey.updateOne(
      { _id: apiKey._id },
      { lastUsed: new Date(), $inc: { callCount: 1 } },
    ).catch(() => {});

    return { user: apiKey.userId, apiKey };
  } catch (err) {
    console.error("API key authentication failed:", err.message);
    return null;
  }
};
