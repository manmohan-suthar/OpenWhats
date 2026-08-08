import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Key,
  Lock,
  MessageCircle,
  Network,
  QrCode,
  Send,
  Server,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { API_ORIGIN } from "../../config/env";

const API_KEY_PLACEHOLDER = "wac_live_YOUR_API_KEY";
const SESSION_ID = "wa_1780579278384_8dy6xrh";
const CHAT_JID = "919876543210@s.whatsapp.net";
const GROUP_JID = "120363000000000000@g.us";
const PHONE_NUMBER = "919876543210";

const SECTIONS = [
  { id: "quickstart", label: "Quick start", icon: Terminal },
  { id: "sessions", label: "Sessions", icon: QrCode },
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "groups", label: "Groups", icon: Users },
  { id: "messages", label: "Direct messages", icon: Send },
  { id: "errors", label: "Errors & security", icon: ShieldCheck },
];

const PERMISSIONS = [
  ["manage_sessions", "Create, read, update, reconnect, logout, and delete sessions."],
  ["read_chats", "Read chat lists/history, mark chats read, and request a sync."],
  ["send_messages", "Send direct, chat, media, and interactive messages."],
  [
    "send_interactive_messages",
    "Send idempotent Quick Actions through an owned WhatsApp session.",
  ],
  ["read_groups", "Read groups and group participants."],
  ["manage_number_lists", "Reserved for the number-list provider API."],
  ["manage_flows", "Reserved for the workflow provider API."],
  ["manage_ai_agents", "Reserved for the AI-agent provider API."],
  ["read_analytics", "Read reports and usage analytics."],
  ["manage_webhooks", "Manage delivery and event webhooks."],
];

const SESSION_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/sessions",
    permission: "manage_sessions",
    title: "Create session",
    description:
      "Creates a real WhatsApp session and starts QR generation. The account subscription session limit is enforced.",
    body: `{
  "name": "Customer Support",
  "enableChatView": true,
  "chatPasscode": "change-this-passcode"
}`,
    response: `{
  "sessionId": "${SESSION_ID}",
  "name": "Customer Support",
  "status": "pending"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/sessions",
    permission: "manage_sessions",
    title: "List sessions",
    description:
      "Returns only sessions owned by the authenticated OpenWhats user, including live connection status.",
  },
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}`,
    permission: "manage_sessions",
    title: "Get session",
    description: "Returns one owned session without credentials or passcode hash.",
  },
  {
    method: "PATCH",
    path: `/api/v1/sessions/${SESSION_ID}`,
    permission: "manage_sessions",
    title: "Update session",
    description:
      "Updates the display name, chat access, or chat passcode. Sending chatPasscode automatically enables chat view.",
    body: `{
  "name": "Primary Support",
  "chatViewEnabled": true,
  "chatPasscode": "new-secure-passcode"
}`,
  },
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}/qr`,
    permission: "manage_sessions",
    title: "Get QR code",
    description:
      "Returns the current QR payload. Poll every 2–3 seconds only while the session is pending; stop after connected.",
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/reconnect`,
    permission: "manage_sessions",
    title: "Reconnect session",
    description: "Restarts an existing authenticated WhatsApp session.",
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/logout`,
    permission: "manage_sessions",
    title: "Logout session",
    description:
      "Logs out WhatsApp and removes local credentials. A new QR scan will be required.",
  },
  {
    method: "DELETE",
    path: `/api/v1/sessions/${SESSION_ID}`,
    permission: "manage_sessions",
    title: "Delete session",
    description:
      "Permanently deletes the session and its local WhatsApp credentials.",
  },
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}/message-history?limit=50&offset=0`,
    permission: "read_chats",
    title: "Get outbound message history",
    description:
      "Returns stored outbound delivery records for the session with total, limit, and offset metadata.",
  },
];

const CHAT_ENDPOINTS = [
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}/chats`,
    permission: "read_chats",
    title: "List chats",
    description:
      "Returns up to 200 synced chats, newest first, plus the session connection status.",
  },
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}/chats/${CHAT_JID}/messages?limit=50`,
    permission: "read_chats",
    title: "Get chat messages",
    description:
      "Returns oldest-to-newest messages. Use before=<ISO timestamp> for cursor pagination. limit accepts 1–100.",
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/chats/${CHAT_JID}/messages`,
    permission: "send_messages",
    title: "Reply in chat",
    description:
      "Send JSON text or multipart media to a contact/group chat. URL-encode the JID when building URLs.",
    body: `{
  "message": "Hello from your support team"
}`,
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/chats/${CHAT_JID}/interactive`,
    permission: "send_interactive_messages",
    title: "Send Pilot Quick Actions",
    description:
      "Requires an Idempotency-Key header. Supports quick_reply, list, cta_url, cta_call, and allowlisted native_flow messages. Reuse the same key when retrying the same uncertain request.",
    body: `{
  "type": "quick_reply",
  "data": {
    "title": "Customer Support",
    "body": "Create a support ticket?",
    "footer": "DeskGo Pilot",
    "fallbackText": "Reply 1 for Yes or 2 for No.",
    "buttons": [
      { "id": "opaque-action-token-yes", "text": "Yes" },
      { "id": "opaque-action-token-no", "text": "No" }
    ]
  }
}`,
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/chats/${CHAT_JID}/read`,
    permission: "read_chats",
    title: "Mark chat read",
    description: "Clears the stored unread count for this owned session chat.",
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/chats/sync`,
    permission: "read_chats",
    title: "Force chat sync",
    description:
      "Reconnects the session so WhatsApp history synchronization can run again.",
  },
];

const GROUP_ENDPOINTS = [
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}/groups`,
    permission: "read_groups",
    title: "List WhatsApp groups",
    description:
      "Loads groups from the connected WhatsApp session and returns participant summary data.",
  },
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}/groups/${GROUP_JID}/participants`,
    permission: "read_groups",
    title: "Get group participants",
    description:
      "Returns participant names, resolved phone numbers, roles, and unresolved-participant counts.",
  },
  {
    method: "GET",
    path: `/api/v1/sessions/${SESSION_ID}/groups/${GROUP_JID}/export?format=csv`,
    permission: "read_groups",
    title: "Export group participants",
    description:
      "Downloads resolved group contacts. format supports csv, doc, or pdf.",
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/groups/create`,
    permission: "read_groups",
    title: "Create WhatsApp group",
    description:
      "Creates a new WhatsApp group with specified subject name (1–25 characters) and participant phone numbers.",
    body: `{
  "subject": "VIP Support Group",
  "participants": [
    "919876543210",
    "919876543211"
  ]
}`,
    response: `{
  "success": true,
  "data": {
    "groupJid": "120363000000000000@g.us",
    "subject": "VIP Support Group",
    "participants": [
      { "id": "919876543210@s.whatsapp.net", "admin": null },
      { "id": "919876543211@s.whatsapp.net", "admin": null }
    ],
    "size": 3
  }
}`,
  },
  {
    method: "POST",
    path: `/api/v1/sessions/${SESSION_ID}/groups/${GROUP_JID}/import-number-list`,
    permission: "read_groups + manage_number_lists",
    title: "Import group into a number list",
    description:
      "Creates a reusable number list from resolved group participants and enforces the account number-list limit.",
    body: `{
  "name": "Customer Group"
}`,
  },
];

const MESSAGE_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/messages/send",
    permission: "send_messages",
    title: "Send text",
    description: "Send a plain text message to a number including country code.",
    body: `{
  "session": "${SESSION_ID}",
  "to": "${PHONE_NUMBER}",
  "message": "Your payment has been received.",
  "contactName": "Customer"
}`,
  },
  {
    method: "POST",
    path: "/api/messages/send",
    permission: "send_messages",
    title: "Send CTA and quick-reply buttons",
    description:
      "buttons must be an array (maximum 10). Each button can use its own type, so call, URL, copy-code and quick reply can be mixed.",
    body: `{
  "session": "${SESSION_ID}",
  "to": "${PHONE_NUMBER}",
  "header": "Order update",
  "message": "Choose an action for order #1024.",
  "footer": "Customer Support",
  "buttons": [
    { "type": "call", "text": "Call support", "number": "+919784740736" },
    { "type": "url", "text": "Track order", "url": "https://example.com/orders/1024" },
    { "type": "copy", "text": "Copy coupon", "code": "SAVE20" },
    { "type": "quick_reply", "text": "Resolved", "id": "order_resolved" }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/messages/send",
    permission: "send_messages",
    title: "Send WhatsApp chat button",
    description:
      "The whatsapp type converts the supplied number into a secure https://wa.me link button.",
    body: `{
  "session": "${SESSION_ID}",
  "to": "${PHONE_NUMBER}",
  "message": "Chat with our sales team.",
  "buttons": [
    { "type": "whatsapp", "text": "Open WhatsApp", "number": "+919784740736" }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/messages/send",
    permission: "send_messages",
    title: "Send media by URL",
    description:
      "media_type supports image, video, audio and document. Audio cannot be combined with interactive buttons.",
    body: `{
  "session": "${SESSION_ID}",
  "to": "${PHONE_NUMBER}",
  "media_type": "document",
  "message": "Your invoice is attached.",
  "media": {
    "url": "https://your-cdn.example/invoice.pdf",
    "caption": "Invoice #1024",
    "filename": "invoice-1024.pdf",
    "mimeType": "application/pdf"
  }
}`,
  },
];

function hydrate(value, values = {}) {
  if (!value) return value;
  return String(value)
    .replaceAll(SESSION_ID, values.sessionId || SESSION_ID)
    .replaceAll(CHAT_JID, values.chatJid || CHAT_JID)
    .replaceAll(GROUP_JID, values.groupJid || GROUP_JID)
    .replaceAll(
      `"to": "${PHONE_NUMBER}"`,
      `"to": "${values.phoneNumber || PHONE_NUMBER}"`,
    );
}

function DynamicInputs({ fields, values, onChange }) {
  return (
    <div className="card mb-5 p-4">
      <p className="mb-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
        Try with your resource values
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">
              {label}
            </label>
            <input
              className="input font-mono text-xs"
              value={values[key]}
              placeholder={placeholder}
              onChange={(event) => onChange(key, event.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        Endpoint paths, JSON bodies and cURL examples below update automatically.
      </p>
    </div>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ title, value }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{title}</span>
        <CopyButton value={value} />
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 font-mono text-xs leading-6 text-slate-700 dark:text-slate-300">
        {value}
      </pre>
    </div>
  );
}

function MethodBadge({ method }) {
  const colors = {
    GET: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    POST: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    PATCH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-bold ${colors[method]}`}>
      {method}
    </span>
  );
}

function EndpointCard({ endpoint, apiKey, values = {} }) {
  const path = hydrate(endpoint.path, values);
  const body = hydrate(endpoint.body, values);
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method);
  const idempotencyHeader = isMutation ? ` \\\n  -H "Idempotency-Key: key_${Math.floor(Date.now() / 1000)}"` : "";
  const request = `curl -X ${endpoint.method} "${API_ORIGIN}${path}" \\
  -H "x-api-key: ${apiKey}"${idempotencyHeader}${body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\n/g, "\n  ")}'` : ""}`;

  return (
    <article className="card overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <code className="break-all font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
            {path}
          </code>
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{endpoint.title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{endpoint.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800">
            <Lock size={9} /> {endpoint.permission}
          </span>
          {isMutation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-mono text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Requires Idempotency-Key header
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3 p-5">
        {body && <CodeBlock title="JSON body" value={body} />}
        <CodeBlock title="cURL" value={request} />
        {endpoint.response && (
          <CodeBlock title="Example response" value={hydrate(endpoint.response, values)} />
        )}
      </div>
    </article>
  );
}

function EndpointList({ endpoints, apiKey, values }) {
  return (
    <div className="space-y-4">
      {endpoints.map((endpoint) => (
        <EndpointCard
          key={`${endpoint.method}-${endpoint.path}-${endpoint.title}`}
          endpoint={endpoint}
          apiKey={apiKey}
          values={values}
        />
      ))}
    </div>
  );
}

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary-600">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
      {children && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{children}</p>}
    </div>
  );
}

export default function ApiDocs() {
  const [activeSection, setActiveSection] = useState("quickstart");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [values, setValues] = useState({
    sessionId: SESSION_ID,
    chatJid: CHAT_JID,
    groupJid: GROUP_JID,
    phoneNumber: PHONE_NUMBER,
  });
  const apiKey = apiKeyInput || API_KEY_PLACEHOLDER;
  const updateValue = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));

  const quickStart = useMemo(
    () => `curl "${API_ORIGIN}/api/v1/sessions" \\
  -H "x-api-key: ${apiKey}"`,
    [apiKey],
  );

  return (
    <div className="page max-w-7xl space-y-6">
      <PageHeader
        title="Provider API Documentation"
        subtitle="Sessions, chats, groups, messaging, permissions, errors, and production examples"
      />

      <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,.1),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.2),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,.16),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10">
              <Network size={20} className="text-emerald-300" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              API version 1
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold">
              Control the same WhatsApp session and inbox features used by OpenWhats.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              The v1 provider routes call the real OpenWhats services. Session ownership,
              subscription limits, and API-key scopes are checked on every request.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-slate-500">Base URL</p>
              <p className="mt-1 break-all font-mono text-slate-700 dark:text-slate-200">{API_ORIGIN}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-slate-500">Provider prefix</p>
              <p className="mt-1 font-mono text-slate-700 dark:text-slate-200">/api/v1</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit space-y-3 lg:sticky lg:top-[80px]">
          <nav className="card p-2">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  activeSection === id
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={15} />
                <span className="flex-1">{label}</span>
                <ChevronRight size={13} />
              </button>
            ))}
          </nav>
          <div className="card p-4">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Fill examples with your key
            </label>
            <input
              type="password"
              autoComplete="off"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value.trim())}
              placeholder="wac_live_…"
              className="input mt-2 font-mono text-xs"
            />
            <p className="mt-2 text-[10px] leading-4 text-slate-400">
              The value stays only in this page state. Never place a live key in browser
              source code or Git.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          {activeSection === "quickstart" && (
            <div className="space-y-6">
              <section>
                <SectionTitle eyebrow="Start here" title="Authentication and first request">
                  Generate an API key from API Keys, store the raw value when it is shown,
                  and send it through x-api-key or Authorization: Bearer.
                </SectionTitle>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    [Key, "1. Generate a key", "Choose only the scopes your integration needs."],
                    [Server, "2. Create a session", "Create the session and request its QR payload."],
                    [QrCode, "3. Scan and connect", "Poll status until connected, then send messages."],
                  ].map(([Icon, title, text]) => (
                    <div key={title} className="card p-5">
                      <Icon size={18} className="text-primary-600" />
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <CodeBlock title="Test authentication by listing sessions" value={quickStart} />

              <section className="card p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Authentication & Request headers</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <CodeBlock title="API Key Header (Recommended)" value={`x-api-key: ${apiKey}`} />
                  <CodeBlock title="Bearer Token (Also supported)" value={`Authorization: Bearer ${apiKey}`} />
                  <CodeBlock title="Idempotency Key (Required for POST/PUT/PATCH/DELETE)" value={`Idempotency-Key: your_unique_key_here`} />
                </div>
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Note: All mutation requests (POST, PUT, PATCH, DELETE) using an API key require an <code>Idempotency-Key</code> HTTP header (minimum 8 characters, e.g. <code>Idempotency-Key: req_12345678</code>) or a <code>clientRequestId</code> JSON body field to prevent accidental duplicate actions.
                </p>
              </section>

              <section>
                <SectionTitle eyebrow="Least privilege" title="API-key permissions">
                  New keys default to all currently available scopes. Reduce scopes for
                  production integrations and rotate a key if it is exposed.
                </SectionTitle>
                <div className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
                  {PERMISSIONS.map(([permission, description]) => (
                    <div key={permission} className="grid gap-1 px-5 py-3 md:grid-cols-[190px_1fr]">
                      <code className="text-xs font-semibold text-primary-600">{permission}</code>
                      <p className="text-xs leading-5 text-slate-500">{description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeSection === "sessions" && (
            <section>
              <SectionTitle eyebrow="Session lifecycle" title="Create and control WhatsApp sessions">
                A session belongs to the OpenWhats user behind the API key. IDs from another
                account always return not found.
              </SectionTitle>
              <DynamicInputs
                fields={[
                  {
                    key: "sessionId",
                    label: "Session ID",
                    placeholder: SESSION_ID,
                  },
                ]}
                values={values}
                onChange={updateValue}
              />
              <EndpointList endpoints={SESSION_ENDPOINTS} apiKey={apiKey} values={values} />
            </section>
          )}

          {activeSection === "chats" && (
            <section>
              <SectionTitle eyebrow="Inbox API" title="Read chats and send replies">
                Chat JIDs include @s.whatsapp.net, @lid, or @g.us. URL-encode dynamic JIDs
                with encodeURIComponent before adding them to request paths.
              </SectionTitle>
              <DynamicInputs
                fields={[
                  { key: "sessionId", label: "Session ID", placeholder: SESSION_ID },
                  {
                    key: "chatJid",
                    label: "Chat JID",
                    placeholder: CHAT_JID,
                  },
                ]}
                values={values}
                onChange={updateValue}
              />
              <EndpointList endpoints={CHAT_ENDPOINTS} apiKey={apiKey} values={values} />
            </section>
          )}

          {activeSection === "groups" && (
            <section>
              <SectionTitle eyebrow="Group access" title="List groups and participants">
                The underlying WhatsApp session must be connected. Group information comes
                from the real linked account, not a cached demo response.
              </SectionTitle>
              <DynamicInputs
                fields={[
                  { key: "sessionId", label: "Session ID", placeholder: SESSION_ID },
                  {
                    key: "groupJid",
                    label: "Group JID",
                    placeholder: GROUP_JID,
                  },
                ]}
                values={values}
                onChange={updateValue}
              />
              <EndpointList endpoints={GROUP_ENDPOINTS} apiKey={apiKey} values={values} />
            </section>
          )}

          {activeSection === "messages" && (
            <div className="space-y-6">
              <SectionTitle eyebrow="Messaging" title="Send to a phone number directly">
                Use the unified endpoint for a new outbound conversation. Use the chat reply
                endpoint when you already have a chat JID.
              </SectionTitle>
              <DynamicInputs
                fields={[
                  { key: "sessionId", label: "Session ID", placeholder: SESSION_ID },
                  {
                    key: "phoneNumber",
                    label: "Recipient number with country code",
                    placeholder: PHONE_NUMBER,
                  },
                ]}
                values={values}
                onChange={updateValue}
              />
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Button body fields
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    ["call", "text + number", "Phone number must include country code."],
                    ["url", "text + url", "URL must start with http:// or https://."],
                    ["whatsapp", "text + number", "Creates a wa.me chat URL."],
                    ["copy", "text + code", "Copies the supplied coupon/reference code."],
                    ["quick_reply", "text + id (optional)", "A stable id is recommended for reply handling."],
                  ].map(([type, fields, note]) => (
                    <div
                      key={type}
                      className="grid gap-1 px-5 py-3 md:grid-cols-[120px_150px_1fr]"
                    >
                      <code className="text-xs font-bold text-primary-600">{type}</code>
                      <code className="text-xs text-slate-600 dark:text-slate-300">{fields}</code>
                      <p className="text-xs text-slate-500">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
              <EndpointList endpoints={MESSAGE_ENDPOINTS} apiKey={apiKey} values={values} />
            </div>
          )}

          {activeSection === "errors" && (
            <div className="space-y-6">
              <SectionTitle eyebrow="Production behavior" title="Status codes, safety, and retries">
                Read the HTTP status and code before retrying. Do not retry validation,
                authentication, permission, or subscription-limit failures automatically.
              </SectionTitle>
              <div className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
                {[
                  ["400", "Bad request", "Missing/invalid input, offline session, or QR not ready."],
                  ["401", "Authentication failed", "Missing, invalid, expired, or revoked API key."],
                  ["403", "Permission denied", "The key does not include the required scope."],
                  ["404", "Not found", "Resource is missing or belongs to another OpenWhats user."],
                  ["409", "Conflict", "The requested operation conflicts with current resource state."],
                  ["403", "Subscription limit", "LIMIT_EXCEEDED means the account plan must be upgraded or usage reduced."],
                  ["500", "Server failure", "Retry with exponential backoff only for transient failures."],
                ].map(([status, title, text]) => (
                  <div key={`${status}-${title}`} className="grid gap-2 px-5 py-4 md:grid-cols-[60px_160px_1fr]">
                    <code className="text-xs font-bold text-red-500">{status}</code>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{title}</p>
                    <p className="text-xs leading-5 text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Key security</h3>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                    <li>• Keep keys only on a backend server or secret manager.</li>
                    <li>• Never commit keys or expose them in frontend JavaScript.</li>
                    <li>• Use separate test/live keys and minimum permissions.</li>
                    <li>• Revoke and replace a leaked key immediately.</li>
                  </ul>
                </div>
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Retry rules</h3>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                    <li>• Retry network/5xx failures with exponential backoff.</li>
                    <li>• Do not blindly retry message sends without idempotency.</li>
                    <li>• Poll QR only while pending; stop on connected/failed.</li>
                    <li>• URL-encode session, chat, and group path parameters.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
