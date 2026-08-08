import express from "express";
import authMiddleware from "../middleware/auth.js";
import apiPermission from "../middleware/apiPermission.js";
import upload from "../utils/fileUpload.js";
import sessionController from "../controllers/sessionController.js";
import {
  getChatList,
  getChatMessages,
  sendChatMessage,
  markChatRead,
  forceSync,
  verifyPasscode,
  setPasscode,
} from "../controllers/chatController.js";
import messagingController from "../controllers/messagingController.js";
import partnerFeature from "../middleware/partnerFeature.js";
import {
  getProviderInteractiveTypes,
  sendProviderInteractive,
} from "../controllers/providerInteractiveController.js";
import blockPartnerProduct from "../middleware/blockPartnerProduct.js";
import { getProviderChatMedia } from "../controllers/providerMediaController.js";

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/sessions",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.createSession,
);
router.get(
  "/sessions",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.listSessions,
);
router.get(
  "/sessions/:id",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.getSession,
);
router.patch(
  "/sessions/:id",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.updateSession,
);
router.delete(
  "/sessions/:id",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.deleteSession,
);
router.get(
  "/sessions/:id/qr",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.getSessionQR,
);
router.post(
  "/sessions/:id/reconnect",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.reconnectSession,
);
router.post(
  "/sessions/:id/logout",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.logoutSession,
);

router.get(
  "/media",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  partnerFeature("whatsapp-media-messaging"),
  getProviderChatMedia,
);
router.get(
  "/sessions/:id/groups",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.getSessionGroups,
);
router.get(
  "/sessions/:id/groups/:groupJid/participants",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.getGroupParticipants,
);
router.get(
  "/sessions/:id/groups/:groupJid/export",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.exportGroupParticipants,
);
router.post(
  "/sessions/:id/groups/create",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.createGroupFromNumbers,
);
router.post(
  "/sessions/:id/groups/:groupJid/import-number-list",
  apiPermission("read_groups"),
  apiPermission("manage_number_lists"),
  partnerFeature("whatsapp-contacts-groups"),
  blockPartnerProduct("Group-to-list import"),
  sessionController.importGroupParticipantsToNumberList,
);
router.get(
  "/sessions/:id/message-history",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  messagingController.getSessionMessages,
);

router.get(
  "/sessions/:sessionId/chats",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  getChatList,
);
router.get(
  "/sessions/:sessionId/chats/:chatJid/messages",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  getChatMessages,
);
router.post(
  "/sessions/:sessionId/chats/:chatJid/messages",
  apiPermission("send_messages"),
  partnerFeature("whatsapp-send-message"),
  upload.single("file"),
  (req, _res, next) => {
    req.body = { ...req.body, chatJid: req.params.chatJid };
    next();
  },
  sendChatMessage,
);
router.get(
  "/interactive/types",
  apiPermission("send_interactive_messages"),
  getProviderInteractiveTypes,
);
router.post(
  "/sessions/:sessionId/chats/:chatJid/interactive",
  apiPermission("send_interactive_messages"),
  partnerFeature("whatsapp-interactive-messaging"),
  sendProviderInteractive,
);
router.post(
  "/sessions/:sessionId/chats/:chatJid/read",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  markChatRead,
);
router.post(
  "/sessions/:sessionId/chats/sync",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  forceSync,
);
router.post(
  "/sessions/:sessionId/chats/verify-pin",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  (req, _res, next) => {
    req.body = { ...req.body, sessionId: req.params.sessionId };
    next();
  },
  verifyPasscode,
);
router.patch(
  "/sessions/:sessionId/chats/pin",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  (req, _res, next) => {
    req.body = { ...req.body, sessionId: req.params.sessionId };
    next();
  },
  setPasscode,
);

export default router;
