import express from "express";
import authMiddleware from "../middleware/auth.js";
import upload from "../utils/fileUpload.js";
import apiPermission from "../middleware/apiPermission.js";
import partnerFeature from "../middleware/partnerFeature.js";
import {
  verifyPasscode,
  setPasscode,
  getChatList,
  getChatMessages,
  sendChatMessage,
  markChatRead,
  forceSync,
} from "../controllers/chatController.js";

const router = express.Router();

router.use(authMiddleware);

// Passcode management
router.post(
  "/passcode/verify",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  verifyPasscode,
);
router.post(
  "/passcode/set",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  setPasscode,
);

// Chat inbox — note: (.+) on :chatJid so Express doesn't truncate at the dot
// e.g. 918307418627@s.whatsapp.net  or  120363xxxxxx@g.us
router.get(
  "/:sessionId/list",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  getChatList,
);
router.get(
  "/:sessionId/messages/:chatJid(.+)",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  getChatMessages,
);
router.post(
  "/:sessionId/send",
  apiPermission("send_messages"),
  partnerFeature("whatsapp-send-message"),
  upload.single("file"),
  sendChatMessage,
);
router.post(
  "/:sessionId/read/:chatJid(.+)",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  markChatRead,
);
router.post(
  "/:sessionId/force-sync",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  forceSync,
);

export default router;
