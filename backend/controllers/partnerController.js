import PartnerTenantService from "../services/PartnerTenantService.js";
import PartnerProvisioningService from "../services/PartnerProvisioningService.js";

export async function provisionTenant(req, res) {
  try {
    const result = await PartnerProvisioningService.provision(
      req.body || {},
      req.partner,
    );
    return res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      data: {
        externalCompanyId: result.tenant.externalCompanyId,
        openWhatsUserId: result.user._id,
        managedByPartner: true,
        apiKey: result.rawKey,
        apiKeyPrefix: result.apiKey.keyPrefix,
        credentialVersion: result.credentialVersion,
        subscriptionStatus: result.tenant.status,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code,
      error: error.message || "Partner tenant provisioning failed",
    });
  }
}

export async function syncEntitlement(req, res) {
  try {
    const result = await PartnerTenantService.syncEntitlement(
      req.body || {},
      req.partner,
    );
    return res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: result.duplicate,
      data: {
        partner: result.tenant?.partner,
        externalCompanyId: result.tenant?.externalCompanyId,
        openWhatsUserId: result.tenant?.userId,
        moduleKey: result.tenant?.moduleKey,
        status: result.tenant?.status,
        features: result.tenant?.features || [],
        limits: result.tenant?.limits || {},
        currentPeriodEnd: result.tenant?.currentPeriodEnd,
        lastSyncedAt: result.tenant?.lastSyncedAt,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code,
      error: error.message || "Partner entitlement sync failed",
    });
  }
}
