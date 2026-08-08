import express from "express";
import sessionController from "../controllers/sessionController.js";
import messagingController from "../controllers/messagingController.js";
import authMiddleware from "../middleware/auth.js";
import apiPermission from "../middleware/apiPermission.js";
import partnerFeature from "../middleware/partnerFeature.js";
import blockPartnerProduct from "../middleware/blockPartnerProduct.js";

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/create",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.createSession,
);
router.get(
  "/",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.listSessions,
);
router.get(
  "/:id",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.getSession,
);
router.patch(
  "/:id",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.updateSession,
);
router.get(
  "/:id/qr",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.getSessionQR,
);
router.get(
  "/:id/groups",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.getSessionGroups,
);
router.get(
  "/:id/groups/:groupJid/participants",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.getGroupParticipants,
);
router.get(
  "/:id/groups/:groupJid/export",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.exportGroupParticipants,
);
router.post(
  "/:id/groups/create",
  apiPermission("read_groups"),
  partnerFeature("whatsapp-contacts-groups"),
  sessionController.createGroupFromNumbers,
);
router.post(
  "/:id/groups/:groupJid/import-number-list",
  apiPermission("read_groups"),
  apiPermission("manage_number_lists"),
  partnerFeature("whatsapp-contacts-groups"),
  blockPartnerProduct("Group-to-list import"),
  sessionController.importGroupParticipantsToNumberList,
);
router.delete(
  "/:id",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.deleteSession,
);
router.post(
  "/:id/logout",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.logoutSession,
);
router.post(
  "/:id/reconnect",
  apiPermission("manage_sessions"),
  partnerFeature("whatsapp-session-management"),
  sessionController.reconnectSession,
);
router.get(
  "/:id/messages",
  apiPermission("read_chats"),
  partnerFeature("whatsapp-live-chat"),
  messagingController.getSessionMessages,
);

export default router;
