import express from "express";
import { sendNativeMessage } from "../controllers/nativeMessageController.js";
import authMiddleware from "../middleware/auth.js";
import apiPermission from "../middleware/apiPermission.js";
import partnerFeature from "../middleware/partnerFeature.js";

const router = express.Router();

router.post(
  "/api/messages/send-native",
  authMiddleware,
  apiPermission("send_interactive_messages"),
  partnerFeature("whatsapp-interactive-messaging"),
  sendNativeMessage,
);

export default router;
