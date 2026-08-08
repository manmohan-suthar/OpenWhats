const origin = (req) =>
  String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`)
    .replace(/\/$/, "");

const endpoint = (
  method,
  path,
  permission,
  summary,
  extra = {},
) => ({ method, path, permission, summary, ...extra });

const endpoints = [
  endpoint("POST", "/api/v1/sessions", "manage_sessions", "Create a WhatsApp session and start QR generation.", {
    body: { name: "Customer Support", enableChatView: true, chatPasscode: "minimum-6-characters" },
  }),
  endpoint("GET", "/api/v1/sessions", "manage_sessions", "List sessions owned by the API-key account."),
  endpoint("GET", "/api/v1/sessions/:id", "manage_sessions", "Get one owned session."),
  endpoint("PATCH", "/api/v1/sessions/:id", "manage_sessions", "Update session name or chat access.", {
    body: { name: "Primary Support", chatViewEnabled: true, chatPasscode: "new-secure-passcode" },
  }),
  endpoint("DELETE", "/api/v1/sessions/:id", "manage_sessions", "Delete a session and its local WhatsApp credentials."),
  endpoint("GET", "/api/v1/sessions/:id/qr", "manage_sessions", "Get the current QR payload while a session is pending."),
  endpoint("POST", "/api/v1/sessions/:id/reconnect", "manage_sessions", "Reconnect an existing session."),
  endpoint("POST", "/api/v1/sessions/:id/logout", "manage_sessions", "Logout WhatsApp and require a new QR scan."),
  endpoint("GET", "/api/v1/sessions/:id/message-history?limit=50&offset=0", "read_chats", "Read stored outbound message history."),
  endpoint("GET", "/api/v1/sessions/:sessionId/chats", "read_chats", "List synchronized chats."),
  endpoint("GET", "/api/v1/sessions/:sessionId/chats/:chatJid/messages?limit=50", "read_chats", "Read chat messages. Use before=<ISO timestamp> for pagination."),
  endpoint("POST", "/api/v1/sessions/:sessionId/chats/:chatJid/messages", "send_messages", "Reply with JSON text or multipart media.", {
    body: { message: "Hello from your support team" },
  }),
  endpoint("GET", "/api/v1/interactive/types", "send_interactive_messages", "Read the provider's current interactive capabilities and limits."),
  endpoint("POST", "/api/v1/sessions/:sessionId/chats/:chatJid/interactive", "send_interactive_messages", "Send an idempotent quick reply, list, URL, call, or allowlisted native flow.", {
    headers: { "Idempotency-Key": "pilot-turn-018f4f21" },
    body: {
      type: "quick_reply",
      data: {
        title: "Customer Support",
        body: "Would you like us to create a support ticket?",
        footer: "DeskGo Pilot",
        fallbackText: "Reply 1 for Yes or 2 for No.",
        buttons: [
          { id: "action-token-yes", text: "Yes" },
          { id: "action-token-no", text: "No" },
        ],
      },
    },
  }),
  endpoint("POST", "/api/v1/sessions/:sessionId/chats/:chatJid/read", "read_chats", "Mark an owned chat as read."),
  endpoint("POST", "/api/v1/sessions/:sessionId/chats/sync", "read_chats", "Request WhatsApp chat synchronization."),
  endpoint("GET", "/api/v1/sessions/:id/groups", "read_groups", "List groups visible to a connected session."),
  endpoint("GET", "/api/v1/sessions/:id/groups/:groupJid/participants", "read_groups", "List resolved group participants."),
  endpoint("GET", "/api/v1/sessions/:id/groups/:groupJid/export?format=csv", "read_groups", "Export participants as csv, doc, or pdf."),
  endpoint("POST", "/api/v1/sessions/:id/groups/:groupJid/import-number-list", "read_groups + manage_number_lists", "Create a number list from group participants.", {
    body: { name: "Customer Group" },
  }),
  endpoint("POST", "/api/messages/send", "send_messages", "Send text, URL media, or interactive content.", {
    body: {
      session: "wa_SESSION_ID",
      to: "919876543210",
      message: "Your payment has been received.",
      contactName: "Customer",
    },
    buttonBody: {
      session: "wa_SESSION_ID",
      to: "919876543210",
      header: "Order update",
      message: "Choose an action.",
      footer: "Customer Support",
      buttons: [
        { type: "call", text: "Call support", number: "+919784740736" },
        { type: "url", text: "Track order", url: "https://example.com/orders/1024" },
        { type: "whatsapp", text: "Chat on WhatsApp", number: "+919784740736" },
        { type: "copy", text: "Copy coupon", code: "SAVE20" },
        { type: "quick_reply", text: "Resolved", id: "order_resolved" },
      ],
    },
    buttonRules: {
      maximum: 10,
      call: "text + number",
      url: "text + http/https url",
      whatsapp: "text + number",
      copy: "text + code",
      quick_reply: "text + optional id",
    },
  }),
  endpoint("POST", "/api/messages/media/send", "send_messages", "Send URL media or multipart file uploads."),
];

export const getHelpDocs = (req, res) => {
  const baseUrl = origin(req);
  return res.json({
    success: true,
    name: "OpenWhats Provider API",
    version: "v1",
    baseUrl,
    documentationUrl: `${baseUrl}/api/docs`,
    authentication: {
      headers: {
        "x-api-key": "wac_live_YOUR_API_KEY",
        Authorization: "Bearer wac_live_YOUR_API_KEY",
      },
      note: "Use either authentication header. Keep API keys on your backend only.",
    },
    permissions: {
      manage_sessions: "Create and control sessions.",
      read_chats: "Read chats, history, and message records.",
      send_messages: "Send direct, chat, media, and interactive messages.",
      send_interactive_messages:
        "Send owned-session interactive messages through the idempotent provider endpoint.",
      read_groups: "Read groups and their participants.",
      manage_number_lists: "Create number lists from group contacts.",
    },
    pagination: {
      chatMessages: "limit=1..100 and before=<ISO timestamp>",
      messageHistory: "limit and offset",
    },
    endpoints,
    statusCodes: {
      400: "Invalid request, offline session, or QR not ready.",
      401: "Missing, invalid, expired, or revoked API key.",
      403: "Missing permission or account limit reached.",
      404: "Resource not found or owned by another account.",
      409: "Operation conflicts with current resource state.",
      429: "Rate limit exceeded.",
      500: "Unexpected server error.",
      502: "WhatsApp rejected or failed the provider send.",
      503: "The connected provider socket is temporarily unavailable.",
    },
    retryPolicy:
      "Retry only network, 429, and transient 5xx failures with exponential backoff. Reuse the same Idempotency-Key for the same interactive request; never generate a new key for an uncertain send.",
    curl: `curl "${baseUrl}/api/v1/sessions" \\\n  -H "x-api-key: wac_live_YOUR_API_KEY"`,
  });
};

export default { getHelpDocs };
