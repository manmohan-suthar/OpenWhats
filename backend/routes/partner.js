import express from "express";
import partnerAuth from "../middleware/partnerAuth.js";
import {
  provisionTenant,
  syncEntitlement,
} from "../controllers/partnerController.js";

const router = express.Router();

router.post("/v1/tenants/provision", partnerAuth, provisionTenant);
router.post("/v1/entitlements/sync", partnerAuth, syncEntitlement);

export default router;
