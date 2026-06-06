const BASE_URL = process.env.PUBLIC_API_URL || "";

const sendMessageExample = {
  session: "wa_1780579278384_8dy6xrh",
  to: "918307418627",
  media_type: "image",
  cta_type: "call",
  header: "Suthar Tech",
  footer: "Support team",
  message: "Need help with your order?",
  media: {
    url: "https://easyflow.suthartech.com/logo.png",
    caption: "Hello image",
  },
  buttons: [
    { text: "Call support", number: "+919784740736" },
    { text: "Sales team", number: "+919619218048" },
  ],
  contactName: "Suthar Tech",
};

const docs = {
  success: true,
  name: "WhatsApp Messaging API",
  version: "2026-06-06",
  baseUrl: BASE_URL || "Use your deployed backend origin",
  authentication: {
    required: true,
    headers: {
      "x-api-key": "wac_live_YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    note: "Bearer auth also works for dashboard users. Public integrations should use x-api-key.",
  },
  endpoints: [
    {
      method: "POST",
      path: "/api/messages/send",
      description:
        "Unified endpoint for text, URL media, CTA buttons, and mixed button payloads.",
      body: {
        session:
          "Required. WhatsApp session id. sessionId is also accepted.",
        to: "Required. Recipient number with country code. phoneNumber is also accepted.",
        message:
          "Main body text. If empty, media.caption is used for media/button messages.",
        media_type:
          "Optional. text, image, video, audio, document. mediaType and legacy typo meda_type are also accepted.",
        cta_type:
          "Optional default button type. call, url, copy, quick_reply, whatsapp.",
        header: "Optional interactive header text.",
        footer:
          "Optional footer text. Legacy typo fotter is also accepted.",
        media:
          "Optional object: { url, caption, filename, mimeType }. URL must be http/https.",
        buttons:
          "Optional array. Up to 10 buttons. Each button can override type.",
        contactName: "Optional name stored in message logs.",
      },
      supportedMediaTypes: ["text", "image", "video", "audio", "document"],
      supportedCtaTypes: ["call", "url", "copy", "quick_reply", "whatsapp"],
      buttonExamples: {
        call: { text: "Call support", number: "+919784740736" },
        url: { text: "Open website", url: "https://example.com" },
        whatsapp: { type: "whatsapp", text: "Chat on WhatsApp", number: "+919784740736" },
        copy: { text: "Copy coupon", code: "SAVE20" },
        quick_reply: { type: "quick_reply", text: "Yes", id: "yes" },
      },
      example: sendMessageExample,
      curl: `curl -X POST ${BASE_URL || "https://your-domain.com"}/api/messages/send \\
  -H "x-api-key: wac_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(sendMessageExample, null, 2)}'`,
      successResponse: {
        success: true,
        messageId: "msg_665f1e8c9e7b2a0012345678",
        to: "918307418627",
        status: "sent",
        type: "image",
        cta_type: "call",
        buttons: 2,
        timestamp: "2026-06-06T10:30:00.000Z",
      },
    },
    {
      method: "POST",
      path: "/api/messages/media/send",
      description:
        "Dedicated media endpoint for URL media or multipart file uploads without interactive buttons.",
    },
    {
      method: "POST",
      path: "/api/sessions/:id/reconnect",
      description:
        "Force reconnect a recoverable WhatsApp session. Auto reconnect also runs in the background.",
    },
  ],
  compatibility: {
    acceptedAliases: {
      sessionId: "session",
      phoneNumber: "to",
      mediaType: "media_type",
      meda_type: "media_type",
      fotter: "footer",
    },
    legacyTextPayload:
      '{ "session": "wa_x", "to": "918...", "message": "Hello" } still works.',
    templateId:
      "No template id is required for the unified send API. Buttons are built from cta_type and buttons.",
  },
  commonErrors: [
    {
      status: 400,
      error: "session (or sessionId) is required",
      fix: "Pass a valid connected WhatsApp session id.",
    },
    {
      status: 400,
      error: "media.url is required when media_type is not text",
      fix: "Pass media.url for image/video/audio/document messages.",
    },
    {
      status: 401,
      error: "Unauthorized",
      fix: "Send a valid x-api-key header.",
    },
    {
      status: 404,
      error: "Session not found",
      fix: "Use a session that belongs to the API key owner.",
    },
    {
      status: 503,
      error: "Session is not connected",
      fix: "Wait for auto reconnect or call /api/sessions/:id/reconnect.",
    },
  ],
};

export const getHelpDocs = (req, res) => {
  return res.json(docs);
};

export default { getHelpDocs };
