import PartnerTenantService from "../services/PartnerTenantService.js";

const partnerFeature = (feature) => async (req, res, next) => {
  try {
    const tenant =
      req.partnerTenant ||
      (await PartnerTenantService.requireActiveForUser(req.user?._id));
    if (!tenant) return next();
    if (!PartnerTenantService.hasFeature(tenant, feature)) {
      return res.status(403).json({
        success: false,
        code: "PARTNER_FEATURE_DISABLED",
        error: "This WhatsApp Business feature is not enabled in DeskGo.",
        feature,
      });
    }
    // DeskGo owns numeric billing limits. OpenWhats still enforces the signed
    // lifecycle state and explicit feature allowlist at the transport boundary.
    req.partnerTenant = tenant;
    req.partnerFeature = feature;
    return next();
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "PARTNER_CONTEXT_FAILED",
      error: error.message,
    });
  }
};

export default partnerFeature;
