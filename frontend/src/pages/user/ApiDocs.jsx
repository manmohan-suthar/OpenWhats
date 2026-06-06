import { useState } from "react";
import {
  BookOpen,
  Terminal,
  Key,
  Copy,
  Check,
  Send,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info,
  Code2,
  Upload,
  Globe,
  Image,
  Video,
  FileText,
  Mic,
  Layers3,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { API_ORIGIN } from "../../config/env";

function CopyBtn({ text, className = "" }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors ${className || "text-slate-400 hover:text-white hover:bg-white/10"}`}
    >
      {copied ? (
        <>
          <Check size={11} className="text-emerald-400" /> Copied
        </>
      ) : (
        <>
          <Copy size={11} /> Copy
        </>
      )}
    </button>
  );
}

function CodeBlock({ title, code }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 text-xs">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          {title && <span className="text-slate-400 font-mono">{title}</span>}
        </div>
        <CopyBtn text={code} />
      </div>
      <pre className="bg-slate-950 px-4 py-4 overflow-x-auto leading-relaxed text-slate-300 font-mono whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

function ParamRow({ name, type, required, children }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-2 w-44 flex-shrink-0 pt-0.5">
        <code className="text-xs font-mono font-semibold text-primary-600 dark:text-primary-400">
          {name}
        </code>
        {required && (
          <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
            req
          </span>
        )}
      </div>
      <div className="flex-1">
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2">
          {type}
        </span>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {children}
        </span>
      </div>
    </div>
  );
}

function ResponseField({ name, type, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 w-32 flex-shrink-0 pt-0.5">
        {name}
      </code>
      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded h-fit flex-shrink-0">
        {type}
      </span>
      <span className="text-xs text-slate-600 dark:text-slate-400">
        {children}
      </span>
    </div>
  );
}

const BASE = API_ORIGIN;
const ENDPOINT = "/api/messages/send";
const MEDIA_ENDPOINT = "/api/messages/media/send";
const HELP_ENDPOINT = "/api/help";
const FULL_URL = `${BASE}${ENDPOINT}`;
const MEDIA_FULL_URL = `${BASE}${MEDIA_ENDPOINT}`;
const PLACEHOLDER = "wac_live_YOUR_API_KEY";

const buildSnippets = (apiKey) => ({
  curl: `curl -X POST ${FULL_URL} \
  -H "x-api-key: ${apiKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "wa_1780579278384_8dy6xrh",
    "to": "918307418627",
    "media_type": "image",
    "cta_type": "call",
    "header": "Suthar Tech",
    "footer": "Support team",
    "message": "Need help with your order?",
    "media": {
      "url": "https://easyflow.suthartech.com/logo.png",
      "caption": "Hello image"
    },
    "buttons": [
      { "text": "Call support", "number": "+919784740736" },
      { "text": "Sales team", "number": "+919619218048" }
    ],
    "contactName": "Suthar Tech"
  }'`,
  js: `const response = await fetch("${FULL_URL}", {
  method: "POST",
  headers: {
    "x-api-key": "${apiKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
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
  }),
});

const data = await response.json();
console.log(data);`,
  python: `import requests

response = requests.post(
    "${FULL_URL}",
    headers={
        "x-api-key": "${apiKey}",
        "Content-Type": "application/json",
    },
    json={
        "session": "wa_1780579278384_8dy6xrh",
        "to": "918307418627",
        "media_type": "image",
        "cta_type": "call",
        "header": "Suthar Tech",
        "footer": "Support team",
        "message": "Need help with your order?",
        "media": {
            "url": "https://easyflow.suthartech.com/logo.png",
            "caption": "Hello image",
        },
        "buttons": [
            {"text": "Call support", "number": "+919784740736"},
            {"text": "Sales team", "number": "+919619218048"},
        ],
        "contactName": "Suthar Tech",
    },
)

print(response.json())`,
  php: `<?php
$response = file_get_contents("${FULL_URL}", false,
  stream_context_create([
    "http" => [
      "method"  => "POST",
      "header"  => implode("\r\n", [
        "x-api-key: ${apiKey}",
        "Content-Type: application/json",
      ]),
      "content" => json_encode([
        "session"     => "wa_1780579278384_8dy6xrh",
        "to"          => "918307418627",
        "media_type"  => "image",
        "cta_type"    => "call",
        "header"      => "Suthar Tech",
        "footer"      => "Support team",
        "message"     => "Need help with your order?",
        "media"       => [
          "url" => "https://easyflow.suthartech.com/logo.png",
          "caption" => "Hello image",
        ],
        "buttons"     => [
          ["text" => "Call support", "number" => "+919784740736"],
          ["text" => "Sales team", "number" => "+919619218048"],
        ],
        "contactName" => "Suthar Tech",
      ]),
    ],
  ])
);
echo $response;`,
});

const buildMediaSnippets = (apiKey) => ({
  url: `curl -X POST ${MEDIA_FULL_URL} \
  -H "x-api-key: ${apiKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "wa_1776437321495_*****",
    "to": "9183074*****",
    "type": "image",
    "media": {
      "url": "https://yourcdn.com/image.jpg",
      "caption": "Hello image 👋"
    },
    "contactName": "Suthar Tech"
  }'`,
  upload: `curl -X POST ${MEDIA_FULL_URL} \
  -H "x-api-key: ${apiKey}" \
  -F "session=wa_1776437321495_*****" \
  -F "to=9183074*****" \
  -F "type=image" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=Hello from upload"`,
  js: `const response = await fetch("${MEDIA_FULL_URL}", {
  method: "POST",
  headers: {
    "x-api-key": "${apiKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    session: "wa_1776437321495_*****",
    to: "9183074*****",
    type: "video",
    media: {
      url: "https://yourcdn.com/video.mp4",
      caption: "Watch this video",
    },
    contactName: "Suthar Tech",
  }),
});

const data = await response.json();
console.log(data);`,
  python: `import requests

response = requests.post(
    "${MEDIA_FULL_URL}",
    headers={
        "x-api-key": "${apiKey}",
        "Content-Type": "application/json",
    },
    json={
        "session": "wa_1776437321495_*****",
        "to": "9183074*****",
        "type": "document",
        "media": {
            "url": "https://yourcdn.com/file.pdf",
            "filename": "invoice.pdf",
        },
        "contactName": "Suthar Tech",
    },
)

print(response.json())`,
  php: `<?php
$response = file_get_contents("${MEDIA_FULL_URL}", false,
  stream_context_create([
    "http" => [
      "method"  => "POST",
      "header"  => implode("\r\n", [
        "x-api-key: ${apiKey}",
        "Content-Type: application/json",
      ]),
      "content" => json_encode([
        "session"     => "wa_1776437321495_*****",
        "to"          => "9183074*****",
        "type"        => "audio",
        "media"       => [
          "url" => "https://yourcdn.com/audio.mp3",
        ],
        "contactName" => "Suthar Tech",
      ]),
    ],
  ])
);
echo $response;`,
});

const SUCCESS_RESPONSE = `{
  "success": true,
  "messageId": "msg_3FA85F64-5717-4562-B3FC-2C963F66AFA6",
  "to": "918307418627",
  "status": "sent",
  "type": "image",
  "cta_type": "call",
  "buttons": 2,
  "media": {
    "source": "url",
    "type": "image",
    "url": "https://easyflow.suthartech.com/logo.png"
  },
  "timestamp": "2026-06-06T10:30:00.000Z"
}`;

const ERROR_RESPONSE = `{
  "success": false,
  "error": "WhatsApp session not connected",
  "code": "SESSION_OFFLINE"
}`;

const LANG_LABELS = {
  curl: "cURL",
  js: "JavaScript",
  python: "Python",
  php: "PHP",
};

const MEDIA_TYPES = [
  {
    icon: Image,
    title: "Image",
    type: '"image"',
    payload:
      '"media": { "url": "https://example.com/photo.jpg", "caption": "Nice photo" }',
  },
  {
    icon: Video,
    title: "Video",
    type: '"video"',
    payload:
      '"media": { "url": "https://example.com/video.mp4", "caption": "Watch this video" }',
  },
  {
    icon: FileText,
    title: "Document",
    type: '"document"',
    payload:
      '"media": { "url": "https://example.com/file.pdf", "filename": "invoice.pdf" }',
  },
  {
    icon: Mic,
    title: "Audio",
    type: '"audio"',
    payload: '"media": { "url": "https://example.com/audio.mp3" }',
  },
];

export default function ApiDocs() {
  const [lang, setLang] = useState("curl");
  const [mediaMode, setMediaMode] = useState("url");
  const [apiKey, setApiKey] = useState(PLACEHOLDER);

  const SNIPPETS = buildSnippets(apiKey);
  const MEDIA_SNIPPETS = buildMediaSnippets(apiKey);
  const isReal = apiKey !== PLACEHOLDER && apiKey.trim().length > 10;

  return (
    <div className="page space-y-6 max-w-4xl">
      <PageHeader
        title="API Documentation"
        subtitle="Send text and media messages with a universal payload built for production SaaS"
      />

      <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="card p-5 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0b1220] text-white border border-white/10 overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at top right, rgba(34,197,94,.35), transparent 28%), radial-gradient(circle at bottom left, rgba(59,130,246,.22), transparent 24%)",
            }}
          />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.28em] text-white/50 font-semibold mb-2">
                Recommended SaaS format
              </p>
              <h2 className="text-2xl font-semibold leading-tight mb-2">
                One payload for text, media, and CTA buttons.
              </h2>
              <p className="text-sm text-white/70 leading-relaxed max-w-2xl">
                Use the send endpoint for greenfield integrations. The media
                upload endpoint remains available for local file uploads.
              </p>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            {[
              "API key auth",
              "URL media",
              "CTA buttons",
              "Multipart upload",
              "Help API",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/80 border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Base URL", value: BASE, icon: Globe },
            { label: "Send endpoint", value: ENDPOINT, icon: Send },
            { label: "Help endpoint", value: HELP_ENDPOINT, icon: BookOpen },
            { label: "Auth header", value: "x-api-key", icon: Key },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="card p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                <Icon size={14} />
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {label}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Key size={15} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-0.5">
            Authentication
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Every request must include your API key in the{" "}
            <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
              x-api-key
            </code>{" "}
            header. Generate one from the{" "}
            <a
              href="/dashboard/api-keys"
              className="underline font-semibold hover:text-blue-900 dark:hover:text-blue-100"
            >
              API Keys
            </a>{" "}
            page. Base URL:{" "}
            <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
              {BASE}
            </code>
          </p>
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3 border border-slate-200 dark:border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Terminal size={14} className="text-slate-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Paste your API key to auto-fill examples
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={apiKey === PLACEHOLDER ? "" : apiKey}
              onChange={(e) => setApiKey(e.target.value.trim() || PLACEHOLDER)}
              placeholder="wac_live_… or wac_test_…"
              className="flex-1 font-mono text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {isReal && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                <Check size={11} /> Ready to copy
              </span>
            )}
          </div>
          {!isReal && (
            <p className="text-[11px] text-slate-400 mt-1.5">
              Get your key from{" "}
              <a
                href="/dashboard/api-keys"
                className="underline text-primary-500 hover:text-primary-600"
              >
                API Keys
              </a>{" "}
              page — copy it when first created (shown only once).
            </p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
            <Send size={17} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide font-mono bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                POST
              </span>
              <code className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                {ENDPOINT}
              </code>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unified send endpoint for text, media URLs, CTA buttons, and
              mixed button payloads.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Code2 size={12} className="text-primary-500" /> Request Body
            </p>
            <div className="card bg-slate-50 dark:bg-slate-800/50 px-4 py-1">
              <ParamRow name="session" type="string" required>
                The sessionId of a connected WhatsApp session.
              </ParamRow>
              <ParamRow name="to" type="string" required>
                Recipient phone number in international format without the +
                sign.
              </ParamRow>
              <ParamRow name="message" type="string">
                Main body text. If empty, media.caption is used for media and
                button messages.
              </ParamRow>
              <ParamRow name="media_type" type="string">
                text, image, video, audio, or document. mediaType and meda_type
                are also accepted.
              </ParamRow>
              <ParamRow name="cta_type" type="string">
                call, url, copy, quick_reply, or whatsapp. Buttons can override
                this with their own type.
              </ParamRow>
              <ParamRow name="header" type="string">
                Optional interactive header text.
              </ParamRow>
              <ParamRow name="footer" type="string">
                Optional footer text. The legacy typo fotter is also accepted.
              </ParamRow>
              <ParamRow name="media" type="object">
                Optional URL media object: url, caption, filename, mimeType.
              </ParamRow>
              <ParamRow name="buttons" type="array">
                Optional button array. Up to 10 buttons are accepted.
              </ParamRow>
              <ParamRow name="contactName" type="string">
                Optional display name for the recipient.
              </ParamRow>
            </div>
          </section>

          <section>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Terminal size={12} className="text-primary-500" /> Example
              Request
            </p>

            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit mb-3">
              {Object.entries(LANG_LABELS).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setLang(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    lang === id
                      ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <CodeBlock code={SNIPPETS[lang]} />
          </section>

          <section>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Upload size={12} className="text-primary-500" /> Media Send API
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { id: "url", label: "URL-based media" },
                { id: "upload", label: "Multipart upload" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMediaMode(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mediaMode === item.id
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid  gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {mediaMode === "url"
                      ? "Best for production"
                      : "Best for local files"}
                  </span>
                </div>
                <CodeBlock
                  code={
                    mediaMode === "url"
                      ? MEDIA_SNIPPETS.url
                      : MEDIA_SNIPPETS.upload
                  }
                />
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {MEDIA_TYPES.map(({ icon: Icon, title, type, payload }) => (
                <div
                  key={title}
                  className="card p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className="text-primary-500" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {title}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mb-2">
                    type: {type}
                  </p>
                  <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {payload}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ArrowRight size={12} className="text-primary-500" /> Response
              Fields
            </p>
            <div className="card bg-slate-50 dark:bg-slate-800/50 px-4 py-1 mb-4">
              <ResponseField name="success" type="boolean">
                <code className="font-mono text-[11px]">true</code> on success,{" "}
                <code className="font-mono text-[11px]">false</code> on failure.
              </ResponseField>
              <ResponseField name="messageId" type="string">
                Unique identifier for the sent message.
              </ResponseField>
              <ResponseField name="to" type="string">
                The recipient phone number.
              </ResponseField>
              <ResponseField name="status" type="string">
                Delivery status —{" "}
                <code className="font-mono text-[11px]">sent</code>,{" "}
                <code className="font-mono text-[11px]">delivered</code>, or{" "}
                <code className="font-mono text-[11px]">failed</code>.
              </ResponseField>
              <ResponseField name="timestamp" type="string">
                ISO 8601 timestamp of when the message was sent.
              </ResponseField>
              <ResponseField name="error" type="string">
                Human-readable error description (only present on failure).
              </ResponseField>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    200 — Success
                  </span>
                </div>
                <CodeBlock code={SUCCESS_RESPONSE} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={13} className="text-red-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    4xx — Error
                  </span>
                </div>
                <CodeBlock code={ERROR_RESPONSE} />
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Info size={12} className="text-primary-500" /> Common Errors
            </p>
            <div className="space-y-2">
              {[
                {
                  code: 401,
                  label: "Unauthorized",
                  desc: "Missing or invalid API key.",
                },
                {
                  code: 400,
                  label: "Bad Request",
                  desc: "A required field is missing.",
                },
                {
                  code: 404,
                  label: "Session Not Found",
                  desc: "The session does not exist or belongs to another account.",
                },
                {
                  code: 503,
                  label: "Session Offline",
                  desc: "The WhatsApp session is disconnected. Reconnect it first.",
                },
              ].map(({ code, label, desc }) => (
                <div
                  key={code}
                  className="flex items-start gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                >
                  <span className="text-xs font-bold font-mono text-red-500 w-8 flex-shrink-0 pt-0.5">
                    {code}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle
          size={15}
          className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
        />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Phone number format:</strong> always include the country code
          and remove the leading <code className="font-mono">+</code>.
        </p>
      </div>
    </div>
  );
}
