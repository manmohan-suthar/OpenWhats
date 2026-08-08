import PartnerTenantService from "../services/PartnerTenantService.js";

const blockPartnerProduct = (productName) => async (req, res, next) => {
  try {
    const tenant = await PartnerTenantService.findForUser(req.user?._id);
    if (!tenant) return next();
    return res.status(403).json({
      success: false,
      code: "PARTNER_PRODUCT_MANAGED_EXTERNALLY",
      error: `${productName} is managed by DeskGo for partner customers`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Unable to verify partner product access",
    });
  }
};

export default blockPartnerProduct;
