import express from "express";
import messagingController from "../controllers/messagingController.js";
import authMiddleware from "../middleware/auth.js";
import apiPermission from "../middleware/apiPermission.js";
import partnerFeature from "../middleware/partnerFeature.js";

const router = express.Router();

router.post(
  "/send",
  authMiddleware,
  apiPermission("send_messages"),
  partnerFeature("whatsapp-send-message"),
  messagingController.sendMessage,
);
router.put(
  "/status/:messageId",
  authMiddleware,
  apiPermission("send_messages"),
  messagingController.updateMessageStatus,
);

export default router;
