import { useState, useEffect } from "react";
import {
  Send,
  Save,
  AlertCircle,
  Loader,
  Check,
  ChevronDown,
  MessageSquare,
  Link2,
  Phone,
  List,
  KeySquare,
  Layers,
  X,
  BookOpen,
  PlusCircle,
  Zap,
  Eye,
  Radio,
} from "lucide-react";
import QuickReplyForm from "./QuickReplyForm";
import CTAUrlForm from "./forms/CTAUrlForm";
import CTACallForm from "./forms/CTACallForm";
import ListForm from "./forms/ListForm";
import CopyOTPForm from "./forms/CopyOTPForm";
import WhatsAppPreview from "./preview/WhatsAppPreview";
import SavedTemplates from "./SavedTemplates";
import TemplateManager from "../TemplateManager/TemplateManager";
import PageHeader from "../../components/ui/PageHeader";
import {
  sendInteractiveMessage,
  getWhatsAppSessions,
  saveMessageTemplate,
} from "../../services/messageBuilderApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const MESSAGE_TYPES = [
  //   {
  //     id: "quick_reply",
  //     label: "Quick Reply",
  //     description: "Tap-to-reply buttons",
  //     icon: MessageSquare,
  //     color: "blue",
  //   },
  {
    id: "cta_url",
    label: "URL Button",
    description: "Link to a webpage",
    icon: Link2,
    color: "violet",
  },
  {
    id: "cta_call",
    label: "Call Button",
    description: "Tap to call directly",
    icon: Phone,
    color: "emerald",
  },
  //   {
  //     id: "list",
  //     label: "List Message",
  //     description: "Scrollable item list",
  //     icon: List,
  //     color: "amber",
  //   },
  {
    id: "cta_copy",
    label: "OTP Copy",
    description: "One-tap OTP copy",
    icon: KeySquare,
    color: "rose",
  },
];

const TYPE_COLOR_MAP = {
  blue: {
    active: "border-blue-500 bg-blue-50/80 shadow-blue-100",
    icon: "bg-blue-500 text-white",
    badge: "bg-blue-50 text-blue-700 border-blue-100",
    dot: "bg-blue-500",
  },
  violet: {
    active: "border-violet-500 bg-violet-50/80 shadow-violet-100",
    icon: "bg-violet-500 text-white",
    badge: "bg-violet-50 text-violet-700 border-violet-100",
    dot: "bg-violet-500",
  },
  emerald: {
    active: "border-emerald-500 bg-emerald-50/80 shadow-emerald-100",
    icon: "bg-emerald-500 text-white",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
    dot: "bg-emerald-500",
  },
  amber: {
    active: "border-amber-500 bg-amber-50/80 shadow-amber-100",
    icon: "bg-amber-500 text-white",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
    dot: "bg-amber-500",
  },
  rose: {
    active: "border-rose-500 bg-rose-50/80 shadow-rose-100",
    icon: "bg-rose-500 text-white",
    badge: "bg-rose-50 text-rose-700 border-rose-100",
    dot: "bg-rose-500",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepLabel({ number, label }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
        {number}
      </div>
      <h2 className="text-[13px] font-bold text-slate-700 uppercase tracking-widest">
        {label}
      </h2>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_1px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.3)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return <Card className={`p-6 ${className}`}>{children}</Card>;
}

function Toast({ message, onDismiss }) {
  if (!message) return null;
  const isSuccess = message.type === "success";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold max-w-sm ${
        isSuccess
          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
      }`}
      style={{ animation: "slideUp 0.25s ease" }}
    >
      {isSuccess ? (
        <Check size={16} className="flex-shrink-0" />
      ) : (
        <AlertCircle size={16} className="flex-shrink-0" />
      )}
      <span className="flex-1">{message.text}</span>
      <button
        onClick={onDismiss}
        className="opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function SessionSelect({ sessions, value, onChange }) {
  const active = sessions.find((s) => (s.sessionId || s._id || s.id) === value);
  const isOnline = active?.status === "active" || active?.connected;

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
        <Radio size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-600 appearance-none transition font-medium"
      >
        <option value="">Select a session…</option>
        {sessions.map((session) => (
          <option
            key={session.sessionId || session._id || session.id}
            value={session.sessionId || session._id || session.id}
          >
            {session.phoneNumber || session.sessionId}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none gap-1.5">
        {value && (
          <span
            className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
          />
        )}
        <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
    </div>
  );
}

function PhoneInput({ value, onChange }) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-tight">
          +
        </span>
      </div>
      <input
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="918307418627"
        className="w-full pl-7 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-600 transition font-mono tracking-wide"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MessageBuilder() {
  const [messageType, setMessageType] = useState("quick_reply");
  const [sessionId, setSessionId] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [formData, setFormData] = useState({});
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateRefresh, setTemplateRefresh] = useState(0);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleLoadTemplate = (template) => {
    if (!template) return;
    setMessageType(template.type || "quick_reply");
    setFormData(template.data || {});
    setTemplateName(template.name || "");
    if (template.sessionId) setSessionId(template.sessionId);
    setShowTemplates(false);
  };

  const handleTemplateSaved = (template) => {
    handleLoadTemplate(template);
    if (template?.selectedSessionId) setSessionId(template.selectedSessionId);
    setShowTemplateManager(false);
    setTemplateRefresh((prev) => prev + 1);
    setShowTemplates(true);
  };

  const loadSessions = async () => {
    try {
      const data = await getWhatsAppSessions();
      setSessions(data.data || []);
      if (data.data?.length > 0) {
        setSessionId(
          data.data[0].sessionId || data.data[0]._id || data.data[0].id,
        );
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !toPhone) {
      showMsg({ type: "error", text: "Session and phone number are required" });
      return;
    }
    setLoading(true);
    try {
      const response = await sendInteractiveMessage({
        sessionId,
        to: toPhone,
        type: messageType,
        data: formData,
      });
      if (response.success) {
        setSendSuccess(true);
        setTimeout(() => {
          setSendSuccess(false);
          setFormData({});
          setToPhone("");
        }, 2000);
        showMsg({ type: "success", text: "Message delivered successfully!" });
      } else {
        showMsg({ type: "error", text: response.error || "Failed to send" });
      }
    } catch (err) {
      showMsg({ type: "error", text: err.message || "Error sending message" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      showMsg({ type: "error", text: "Please enter a template name" });
      return;
    }
    setSaving(true);
    try {
      const response = await saveMessageTemplate({
        name: templateName,
        type: messageType,
        sessionId,
        data: formData,
      });
      if (response.success) {
        const id = response.data?._id || response.data?.id || "";
        showMsg({
          type: "success",
          text: id ? `Saved! Template ID: ${id}` : "Template saved!",
        });
        setTimeout(() => setTemplateName(""), 1500);
      } else {
        showMsg({ type: "error", text: response.error || "Failed to save" });
      }
    } catch (err) {
      showMsg({ type: "error", text: err.message || "Error saving template" });
    } finally {
      setSaving(false);
    }
  };

  const activeType = MESSAGE_TYPES.find((t) => t.id === messageType);
  const activeColors = TYPE_COLOR_MAP[activeType?.color || "blue"];

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease forwards; }
      `}</style>

      <div className="min-h-screen bg-[#f8f9fc] dark:bg-slate-950">
        <PageHeader
          title="Message Builder"
          subtitle="Craft & send interactive WhatsApp messages"
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowTemplates((s) => !s)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
                showTemplates
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <BookOpen size={14} />
              {showTemplates ? "Hide Templates" : "Templates"}
            </button>
            <button
              onClick={() => setShowTemplateManager(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 rounded-lg hover:shadow-lg hover:shadow-teal-200/50 dark:hover:shadow-teal-900/50 hover:-translate-y-px transition-all duration-200"
            >
              <PlusCircle size={14} />
              New Template
            </button>
          </div>
        </PageHeader>

        <div className="max-w-7xl mx-auto ">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-7">
            {/* ── Left Column ─────────────────────────────────────────── */}
            <div className="space-y-6">
              {/* Step 1 — Message Type */}
              <SectionCard>
                <StepLabel number="1" label="Message Type" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {MESSAGE_TYPES.map((type) => {
                    const isActive = messageType === type.id;
                    const colors = TYPE_COLOR_MAP[type.color];
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          setMessageType(type.id);
                          setFormData({});
                        }}
                        className={`group relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          isActive
                            ? `${colors.active} shadow-sm`
                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                            isActive
                              ? colors.icon
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-[12px] font-bold leading-snug ${
                              isActive ? "text-slate-800" : "text-slate-600"
                            }`}
                          >
                            {type.label}
                          </p>
                          <p
                            className={`text-[10px] mt-0.5 leading-snug ${
                              isActive ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            {type.description}
                          </p>
                        </div>
                        {isActive && (
                          <div
                            className={`absolute top-2 right-2 w-2 h-2 rounded-full ${colors.dot}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {/* Step 2 — Recipient */}
              <SectionCard>
                <StepLabel number="2" label="Recipient" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      WhatsApp Session
                    </label>
                    <SessionSelect
                      sessions={sessions}
                      value={sessionId}
                      onChange={setSessionId}
                    />
                    {sessions.length === 0 && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 mt-1">
                        <AlertCircle size={11} /> No sessions connected
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Recipient Number
                    </label>
                    <PhoneInput value={toPhone} onChange={setToPhone} />
                    <p className="text-[11px] text-slate-400 font-medium">
                      With country code, without +
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Step 3 — Content */}
              <SectionCard>
                <div className="flex items-start justify-between mb-5">
                  <StepLabel number="3" label="Message Content" />
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${activeColors.badge}`}
                    >
                      {activeType?.label}
                    </span>
                  </div>
                </div>

                {/* Template loader */}
                <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-slate-50">
                  <button
                    onClick={() => setShowTemplates((s) => !s)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      showTemplates
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <Layers size={12} />
                    {showTemplates ? "Hide Templates" : "Load Template"}
                  </button>
                  <button
                    onClick={() => setShowTemplateManager(true)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-xl hover:bg-teal-100 transition-all"
                  >
                    <PlusCircle size={12} />
                    Create Template
                  </button>
                </div>

                {showTemplates && (
                  <div className="mb-5 animate-fadeIn">
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                      <SavedTemplates
                        key={templateRefresh}
                        onLoadTemplate={handleLoadTemplate}
                      />
                    </div>
                  </div>
                )}

                {showTemplateManager && (
                  <TemplateManager
                    onClose={() => setShowTemplateManager(false)}
                    onSaved={handleTemplateSaved}
                    sessions={sessions}
                    defaultSessionId={sessionId}
                  />
                )}

                {/* Dynamic form — rendered by parent as-is */}
                <div className="space-y-4">
                  {messageType === "quick_reply" && (
                    <QuickReplyForm data={formData} onChange={setFormData} />
                  )}
                  {messageType === "cta_url" && (
                    <CTAUrlForm data={formData} onChange={setFormData} />
                  )}
                  {messageType === "cta_call" && (
                    <CTACallForm data={formData} onChange={setFormData} />
                  )}
                  {messageType === "list" && (
                    <ListForm data={formData} onChange={setFormData} />
                  )}
                  {messageType === "cta_copy" && (
                    <CopyOTPForm data={formData} onChange={setFormData} />
                  )}
                </div>
              </SectionCard>

              {/* Step 4 — Send + Save */}
              <SectionCard>
                <StepLabel number="4" label="Send & Save" />

                {/* Send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={loading || sendSuccess}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 ${
                    sendSuccess
                      ? "bg-emerald-500 text-white scale-[0.99]"
                      : "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-teal-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Sending…
                    </>
                  ) : sendSuccess ? (
                    <>
                      <Check size={16} />
                      Delivered!
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Message
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400 font-medium">
                    or save as template
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Save template row */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name…"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition font-medium"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveTemplate()
                      }
                    />
                  </div>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={saving || !templateName.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? (
                      <Loader size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    Save
                  </button>
                </div>
              </SectionCard>
            </div>

            {/* ── Right Column — Preview ───────────────────────────────── */}
            <div className="space-y-4">
              <Card className="sticky top-6 overflow-hidden">
                {/* Preview header */}
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Live Preview
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${activeColors.badge}`}
                  >
                    {activeType?.label}
                  </span>
                </div>

                {/* Phone frame */}
                <div className="p-5">
                  <div className="bg-[#e5ddd5] rounded-2xl overflow-hidden border border-slate-200/60 shadow-inner">
                    {/* Status bar mock */}
                    <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageSquare size={13} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold leading-tight">
                          Preview
                        </p>
                        <p className="text-white/60 text-[10px]">online</p>
                      </div>
                    </div>
                    <div className="p-3 min-h-[240px]">
                      <WhatsAppPreview type={messageType} data={formData} />
                    </div>
                  </div>
                </div>

                {/* Tip */}
                <div className="px-5 pb-4">
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Preview updates as you type. Actual rendering may vary by
                    device.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message={message} onDismiss={() => setMessage(null)} />
    </>
  );
}
