import { useState, useEffect } from "react";
import {
  Trash2,
  Copy,
  Loader,
  ChevronDown,
  Code2,
  Check,
  AlertCircle,
  Plus,
  RefreshCw,
  Activity,
  Layers,
  MessageSquare,
  LayoutTemplate,
  AlignLeft,
  X,
  Terminal,
  Sparkles,
} from "lucide-react";
import {
  getMessageTemplates,
  deleteMessageTemplate,
} from "../../services/messageBuilderApi";
import TemplateManager from "../../components/TemplateManager/TemplateManager";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import { Link } from "react-router-dom";

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }) {
  const accents = {
    slate: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    emerald:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accents[accent]}`}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-white leading-none">
          {value}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    text: "bg-slate-100 text-slate-600",
    image: "bg-violet-50 text-violet-600",
    video: "bg-rose-50 text-rose-600",
    document: "bg-amber-50 text-amber-600",
    button: "bg-blue-50 text-blue-600",
    list: "bg-emerald-50 text-emerald-600",
  };
  return (
    <span
      className={`text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full ${map[type] || "bg-slate-100 text-slate-600"}`}
    >
      {type}
    </span>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ template, onDelete, onView }) {
  const hasButtons = (template.data?.buttons || []).length > 0;
  const hasFooter = !!template.data?.footer;
  const hasHeader = !!template.data?.header;

  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Top accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 dark:from-blue-900/40 to-violet-50 dark:to-violet-900/40 border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
              <LayoutTemplate
                size={18}
                className="text-blue-500 dark:text-blue-400"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px] leading-snug truncate">
                {template.name}
              </h3>
              <div className="mt-1.5">
                <TypeBadge type={template.type} />
              </div>
            </div>
          </div>
        </div>

        {/* Body preview */}
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {template.data?.body || (
            <span className="italic text-slate-300 dark:text-slate-600">
              No body content
            </span>
          )}
        </p>

        {/* Meta tags */}
        {(hasHeader || hasFooter || hasButtons) && (
          <div className="flex flex-wrap gap-1.5">
            {hasHeader && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 px-2 py-0.5 rounded-md font-medium">
                <AlignLeft size={10} /> Header
              </span>
            )}
            {hasFooter && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 px-2 py-0.5 rounded-md font-medium">
                <Layers size={10} /> Footer
              </span>
            )}
            {hasButtons && (
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2 py-0.5 rounded-md font-medium">
                <Activity size={10} /> {template.data.buttons.length} button
                {template.data.buttons.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-700/30">
        <button
          onClick={() => onView(template)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
        >
          View details <ChevronDown size={13} />
        </button>
        <button
          onClick={() => onDelete(template._id, template.name)}
          className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
          title="Delete template"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }) {
  if (!message) return null;
  const isSuccess = message.type === "success";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${
        isSuccess
          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
      }`}
    >
      {isSuccess ? <Check size={16} /> : <AlertCircle size={16} />}
      {message.text}
      <button onClick={onDismiss} className="ml-1 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Code Block ───────────────────────────────────────────────────────────────
function CodeBlock({ code, copyId, copiedId, onCopy }) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-slate-400 dark:text-slate-500" />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono font-medium">
            curl
          </span>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors"
        >
          {copiedId === copyId ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="bg-slate-900 dark:bg-slate-950 p-4 overflow-x-auto">
        <pre className="text-xs text-slate-300 dark:text-slate-400 font-mono leading-relaxed whitespace-pre-wrap break-words">
          {code}
        </pre>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 dark:from-blue-900/40 to-violet-100 dark:to-violet-900/40 flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(99,102,241,0.15)] dark:shadow-[0_4px_20px_rgba(99,102,241,0.05)]">
        <Sparkles size={32} className="text-violet-400 dark:text-violet-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        No templates yet
      </h3>
      <p className="text-slate-400 dark:text-slate-500 text-sm mb-8 max-w-xs">
        Create reusable message templates to streamline your WhatsApp messaging
        workflow.
      </p>
      {/* <button
        onClick={onNew}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/50 transition-all duration-200 hover:-translate-y-0.5"
      >
        <Plus size={16} />
        Create your first template
      </button> */}
      <Link
        to="/dashboard/messages/builder"
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/50 transition-all duration-200 hover:-translate-y-0.5"
      >
        <Plus size={16} />
        Create your first template
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getMessageTemplates();
      setTemplates(data.data || []);
    } catch {
      showMsg({ type: "error", text: "Failed to load templates" });
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3500);
  };

  const handleDelete = async (templateId, templateName) => {
    if (!confirm(`Delete template "${templateName}"?`)) return;
    try {
      await deleteMessageTemplate(templateId);
      setTemplates((t) => t.filter((x) => x._id !== templateId));
      showMsg({ type: "success", text: `"${templateName}" deleted` });
    } catch {
      showMsg({ type: "error", text: "Failed to delete template" });
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateCurlCommand = (template) => {
    const sessionId = template.sessionId || "wa_xxxxx";
    const phoneNumber = "918307418627";

    // Build message object based on template type
    let messageObj = {};

    if (template.type === "cta_copy") {
      const buttonCode =
        template.data?.buttons?.[0]?.params?.copy_code ||
        template.data?.buttons?.[0]?.code ||
        "123456";
      const buttonText =
        template.data?.buttons?.[0]?.params?.display_text ||
        template.data?.buttons?.[0]?.text ||
        "Copy Code";
      messageObj = {
        header: template.data?.header,
        text: template.data?.body || template.data?.text,
        footer: template.data?.footer,
        button: {
          text: buttonText,
          code: buttonCode,
        },
      };
    } else if (template.type === "cta_call") {
      const buttonPhone =
        template.data?.buttons?.[0]?.params?.phone_number ||
        template.data?.buttons?.[0]?.phone ||
        "919876543210";
      const buttonText =
        template.data?.buttons?.[0]?.params?.display_text ||
        template.data?.buttons?.[0]?.text ||
        "Call Now";
      messageObj = {
        header: template.data?.header,
        text: template.data?.body || template.data?.text,
        footer: template.data?.footer,
        button: {
          text: buttonText,
          phone: buttonPhone,
        },
      };
    } else if (template.type === "cta_url") {
      const buttonUrl =
        template.data?.buttons?.[0]?.params?.url ||
        template.data?.buttons?.[0]?.url ||
        "https://example.com";
      const buttonText =
        template.data?.buttons?.[0]?.params?.display_text ||
        template.data?.buttons?.[0]?.text ||
        "Open Link";
      messageObj = {
        header: template.data?.header,
        text: template.data?.body || template.data?.text,
        footer: template.data?.footer,
        button: {
          text: buttonText,
          url: buttonUrl,
        },
      };
    }

    // Remove undefined fields
    Object.keys(messageObj).forEach(
      (key) => messageObj[key] === undefined && delete messageObj[key],
    );

    const curl = `curl -X POST http://localhost:3000/api/messages/send \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session": "${sessionId}",
    "to": "${phoneNumber}",
    "type": "${template.type}",
    "message": ${JSON.stringify(messageObj, null, 2).split("\n").join("\n    ")}
  }'`;
    return curl;
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.data?.body || "").toLowerCase().includes(search.toLowerCase()),
  );

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f9fc] dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
            <Loader
              size={24}
              className="animate-spin text-blue-500 dark:text-blue-400"
            />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Loading templates…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-slate-950">
      <PageHeader
        title="Message Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? "s" : ""} · manage your WhatsApp message templates`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          {/* <button
            onClick={() => setShowTemplateManager(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/50 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus size={15} />
            New Template
          </button> */}
          <Link
            to="/dashboard/messages/builder"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/50 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus size={15} />
            New Template
          </Link>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto space-y-7">
        {/* ── Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Templates"
            value={templates.length}
            icon={MessageSquare}
            accent="slate"
          />
          <StatCard
            label="With Buttons"
            value={
              templates.filter((t) => (t.data?.buttons || []).length > 0).length
            }
            icon={Activity}
            accent="blue"
          />
          <StatCard
            label="With Footer"
            value={templates.filter((t) => !!t.data?.footer).length}
            icon={Layers}
            accent="emerald"
          />
        </div>

        {/* ── Search ────────────────────────────────────────────────── */}
        {templates.length > 0 && (
          <div className="relative max-w-sm">
            <Code2
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-600 transition"
            />
          </div>
        )}

        {/* ── Grid ──────────────────────────────────────────────────── */}
        {templates.length === 0 ? (
          <EmptyState onNew={() => setShowTemplateManager(true)} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-sm">
              No templates match "
              <span className="font-semibold text-slate-600">{search}</span>"
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <TemplateCard
                key={template._id}
                template={template}
                onDelete={handleDelete}
                onView={setSelectedTemplate}
              />
            ))}
          </div>
        )}

        {/* ── Footer count ──────────────────────────────────────────── */}
        {templates.length > 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 pb-4">
            Showing{" "}
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {templates.length}
            </span>{" "}
            template{templates.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Template Manager Modal ──────────────────────────────────────────────── */}
      {showTemplateManager && (
        <TemplateManager
          onClose={() => setShowTemplateManager(false)}
          onSaved={() => {
            setShowTemplateManager(false);
            loadTemplates();
            showMsg({
              type: "success",
              text: "Template created successfully!",
            });
          }}
          sessions={[]}
          defaultSessionId=""
        />
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {selectedTemplate && (
        <Modal
          open={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={selectedTemplate.name}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => {
                  handleDelete(selectedTemplate._id, selectedTemplate.name);
                  setSelectedTemplate(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Type + fields */}
            <div className="flex items-center gap-2">
              <TypeBadge type={selectedTemplate.type} />
              {selectedTemplate._id && (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded-md truncate max-w-[220px]">
                  {selectedTemplate._id}
                </span>
              )}
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
              {selectedTemplate.data?.body && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Body
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    {selectedTemplate.data.body}
                  </p>
                </div>
              )}
              {selectedTemplate.data?.header && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Header
                  </p>
                  <p className="text-slate-700">
                    {selectedTemplate.data.header}
                  </p>
                </div>
              )}
              {selectedTemplate.data?.footer && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Footer
                  </p>
                  <p className="text-slate-700">
                    {selectedTemplate.data.footer}
                  </p>
                </div>
              )}
              {selectedTemplate.data?.buttons?.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Buttons
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.data.buttons.map((btn, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg font-medium"
                      >
                        {btn.text || btn.name}
                        {btn.code && (
                          <span className="text-blue-400 text-[10px]">
                            ({btn.code})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* API Usage */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={14} className="text-slate-500" />
                <h4 className="text-sm font-bold text-slate-700">API Usage</h4>
              </div>
              <CodeBlock
                code={generateCurlCommand(selectedTemplate)}
                copyId={`curl-${selectedTemplate._id}`}
                copiedId={copiedId}
                onCopy={() =>
                  copyToClipboard(
                    generateCurlCommand(selectedTemplate),
                    `curl-${selectedTemplate._id}`,
                  )
                }
              />
              <button
                onClick={() =>
                  copyToClipboard(
                    selectedTemplate._id,
                    `id-${selectedTemplate._id}`,
                  )
                }
                className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                {copiedId === `id-${selectedTemplate._id}` ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-600">
                      Template ID copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy Template ID
                  </>
                )}
              </button>
            </div>

            {/* Setup guide */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-2">
              <p className="font-bold text-blue-700 flex items-center gap-1.5">
                <Sparkles size={13} /> Quick Setup
              </p>
              <ul className="space-y-1.5 ml-4 list-disc text-blue-700">
                <li>
                  Replace{" "}
                  <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">
                    your_api_key_here
                  </code>{" "}
                  with your actual key
                </li>
                <li>Update the phone number with the recipient's number</li>
                <li>Make sure your WhatsApp session is active</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <Toast message={message} onDismiss={() => setMessage(null)} />
    </div>
  );
}
