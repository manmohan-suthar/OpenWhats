import express from "express";
import authMiddleware from "../middleware/auth.js";
import upload from "../utils/fileUpload.js";
import mediaMessageController from "../controllers/mediaMessageController.js";
import apiPermission from "../middleware/apiPermission.js";
import partnerFeature from "../middleware/partnerFeature.js";

const router = express.Router();

router.post(
  "/send",
  authMiddleware,
  apiPermission("send_messages"),
  partnerFeature("whatsapp-media-messaging"),
  upload.single("file"),
  mediaMessageController.sendMediaMessage,
);

export default router;
