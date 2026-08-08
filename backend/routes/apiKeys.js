import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  createApiKey,
  listApiKeys,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
} from "../controllers/apiKeyController.js";
import { API_PERMISSIONS } from "../constants/apiPermissions.js";

const router = express.Router();

// ── PROTECTED routes ───────────────────────────────────────────────────────────
router.use(authMiddleware);

router.get("/", listApiKeys);
router.get("/permissions", (_req, res) =>
  res.json({ success: true, data: API_PERMISSIONS }),
);
router.post("/", createApiKey);
router.patch("/:id", updateApiKey);
router.patch("/:id/revoke", revokeApiKey);
router.delete("/:id", deleteApiKey);

export default router;
