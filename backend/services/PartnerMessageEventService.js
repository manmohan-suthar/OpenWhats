import {
  WaChatMessage,
  WhatsAppSession,
} from "../models/index.js";
import PartnerWebhookService from "./PartnerWebhookService.js";

export async function publishPartnerMessageSentEvent({
  userId,
  sessionId,
  messageId,
}) {
  const claimedAt = new Date();
  const message = await WaChatMessage.findOneAndUpdate(
    {
      userId,
      sessionId,
      messageId,
      partnerSentWebhookAt: null,
      direction: "out",
    },
    { $set: { partnerSentWebhookAt: claimedAt } },
    { new: true },
  ).lean();
  if (!message) return null;

  try {
    const session = await WhatsAppSession.findOne({
      userId,
      sessionId,
    })
      .select("sessionId phoneNumber")
      .lean();
    const delivery = await PartnerWebhookService.enqueueForUser(
      userId,
      "whatsapp.message.sent",
      {
        session: {
          sessionId,
          phoneNumber: session?.phoneNumber || "",
        },
        chat: {
          chatJid: message.chatJid,
          isGroup: message.chatJid.endsWith("@g.us"),
          participantJid: null,
        },
        contact: {
          phoneNumber: message.chatJid.split("@")[0],
          displayName: "",
        },
        message: {
          messageId: message.messageId,
          direction: "out",
          type: message.messageType || message.mediaType || "text",
          text: message.text || "",
          timestamp: message.timestamp.toISOString(),
          ...(message.mediaType
            ? {
                media: {
                  type: message.mediaType,
                  url: message.mediaUrl || null,
                  name: message.mediaName || null,
                  caption: message.text || "",
                },
              }
            : {}),
        },
        ...(message.interactive
          ? { interactive: message.interactive }
          : {}),
      },
    );
    if (!delivery) {
      await WaChatMessage.updateOne(
        { _id: message._id, partnerSentWebhookAt: claimedAt },
        { $set: { partnerSentWebhookAt: null } },
      );
    }
    return delivery;
  } catch (error) {
    await WaChatMessage.updateOne(
      { _id: message._id, partnerSentWebhookAt: claimedAt },
      { $set: { partnerSentWebhookAt: null } },
    ).catch(() => {});
    throw error;
  }
}

export async function publishPartnerMessageReceivedEvent({
  userId,
  sessionId,
  messageId,
  eventType,
  data,
}) {
  const claimedAt = new Date();
  const message = await WaChatMessage.findOneAndUpdate(
    {
      userId,
      sessionId,
      messageId,
      partnerReceivedWebhookAt: null,
      direction: "in",
    },
    { $set: { partnerReceivedWebhookAt: claimedAt } },
    { new: true },
  ).lean();
  if (!message) return null;

  try {
    const delivery = await PartnerWebhookService.enqueueForUser(
      userId,
      eventType,
      data,
    );
    if (!delivery) {
      await WaChatMessage.updateOne(
        { _id: message._id, partnerReceivedWebhookAt: claimedAt },
        { $set: { partnerReceivedWebhookAt: null } },
      );
    }
    return delivery;
  } catch (error) {
    await WaChatMessage.updateOne(
      { _id: message._id, partnerReceivedWebhookAt: claimedAt },
      { $set: { partnerReceivedWebhookAt: null } },
    ).catch(() => {});
    throw error;
  }
}

export default {
  publishPartnerMessageSentEvent,
  publishPartnerMessageReceivedEvent,
};
