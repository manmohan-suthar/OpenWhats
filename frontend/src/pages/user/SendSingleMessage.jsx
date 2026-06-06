import { useState, useEffect, useRef } from "react";
import {
  Send,
  Phone,
  MessageSquare,
  Paperclip,
  Smile,
  Clock,
  Eye,
  ContactRound,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  FileText,
  Image,
  Zap,
  ChevronDown,
  Video,
  Mic,
  StickyNote,
  ArrowLeft,
  Loader,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import api from "../../services/api";

const TEMPLATES = [
  {
    id: 1,
    name: "Order Confirmation",
    content:
      "Hi {{name}}, your order #{{order_id}} has been confirmed. Expected delivery: {{date}}. Track: {{link}}",
    variables: ["name", "order_id", "date", "link"],
  },
  {
    id: 2,
    name: "OTP Verification",
    content: "Your OTP is {{otp}}. Valid for 5 minutes. Do not share this code.",
    variables: ["otp"],
  },
  {
    id: 3,
    name: "Appointment Reminder",
    content:
      "Hi {{name}}, your appointment is scheduled for {{date}} at {{time}}. Please reply to confirm.",
    variables: ["name", "date", "time"],
  },
  {
    id: 4,
    name: "Payment Receipt",
    content:
      "Thank you {{name}}! Payment of {{amount}} received. Reference: {{ref_id}}. Invoice: {{invoice_link}}",
    variables: ["name", "amount", "ref_id", "invoice_link"],
  },
  {
    id: 5,
    name: "Welcome Message",
    content: "Welcome {{name}}! 🎉 Thank you for joining. Get started here: {{link}}",
    variables: ["name", "link"],
  },
];

function TemplateModal({ open, onClose, onSelect }) {
  return (
    <Modal open={open} onClose={onClose} title="Select Template" size="lg">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="w-full p-4 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {template.name}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.content}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {template.variables.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded"
                    >
                      {"{{"}{v}{"}}"}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronDown
                size={16}
                className="text-slate-400 group-hover:text-blue-600 flex-shrink-0 ml-2"
              />
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default function SendSingleMessage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [recentRecipients, setRecentRecipients] = useState([]);
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleType, setScheduleType] = useState("now");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [error, setError] = useState("");
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const fileInputRef = useRef(null);
  const additionalFileInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const [mediaLimits, setMediaLimits] = useState({ image: 10, video: 50, audio: 20, document: 25 });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadSessions();
    loadRecentRecipients();
    api.getMediaLimits().then((res) => { if (res.success) setMediaLimits(res.data); }).catch(() => {});
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (phoneInputRef.current && !phoneInputRef.current.contains(e.target)) {
        setShowRecentDropdown(false);
      }
    };
    if (showRecentDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showRecentDropdown]);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await api.getSessions();
      const connectedSessions = (Array.isArray(data.data) ? data.data : []).filter(
        (s) => s.status === "connected",
      );
      setSessions(connectedSessions);
      if (connectedSessions.length > 0) {
        setSession(connectedSessions[0].sessionId);
      }
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadRecentRecipients = async () => {
    try {
      const sessionsData = await api.getSessions();
      const allMessages = [];
      for (const s of Array.isArray(sessionsData.data) ? sessionsData.data : []) {
        try {
          const msgData = await api.getSessionMessages(s.sessionId, 500, 0);
          allMessages.push(...(msgData.messages || []));
        } catch {}
      }
      const uniqueRecipients = new Map();
      allMessages.forEach((msg) => {
        if (!uniqueRecipients.has(msg.phoneNumber)) {
          uniqueRecipients.set(msg.phoneNumber, {
            phoneNumber: msg.phoneNumber,
            contactName: msg.contactName || "Unknown",
            lastMessageTime: msg.sentAt || msg.createdAt,
          });
        }
      });
      const recent = Array.from(uniqueRecipients.values())
        .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
        .slice(0, 5);
      setRecentRecipients(recent);
    } catch {}
  };

  const characterCount = message.length;
  const messageWarning = characterCount > 1000;
  const isValid = phone && session && (message || attachments.length > 0);

  const handleSelectRecentRecipient = (recipient) => {
    setPhone(recipient.phoneNumber);
    setContactName(recipient.contactName);
    setShowRecentDropdown(false);
  };

  const getFileTypeLimit = (file) => {
    if (file.type.startsWith("image/")) return (mediaLimits.image ?? 10) * 1024 * 1024;
    if (file.type.startsWith("video/")) return (mediaLimits.video ?? 50) * 1024 * 1024;
    if (file.type.startsWith("audio/")) return (mediaLimits.audio ?? 20) * 1024 * 1024;
    return (mediaLimits.document ?? 25) * 1024 * 1024;
  };

  const getFileTypeLimitLabel = (file) => {
    if (file.type.startsWith("image/")) return `${mediaLimits.image ?? 10} MB`;
    if (file.type.startsWith("video/")) return `${mediaLimits.video ?? 50} MB`;
    if (file.type.startsWith("audio/")) return `${mediaLimits.audio ?? 20} MB`;
    return `${mediaLimits.document ?? 25} MB`;
  };

  const processFiles = (files) => {
    files.forEach((file) => {
      if (file.size > getFileTypeLimit(file)) {
        alert(`File "${file.name}" exceeds the ${getFileTypeLimitLabel(file)} limit for this file type`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2),
            type: file.type,
            preview: reader.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddAttachment = (e) => {
    processFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSend = async () => {
    setError("");
    setIsSending(true);
    try {
      if (!session) throw new Error("No session selected");
      let mediaData = null;
      if (attachments.length > 0) {
        const attachment = attachments[0];
        mediaData = {
          base64: attachment.preview.split(",")[1],
          type: attachment.type,
          name: attachment.name,
        };
      }
      const result = await api.sendMessage(session, phone, message, contactName, mediaData);
      if (result.error) throw new Error(result.error);
      setSendStatus("success");
      setTimeout(() => {
        setSendStatus(null);
        setPhone("");
        setContactName("");
        setMessage("");
        setAttachments([]);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to send message");
      setSendStatus("error");
      setTimeout(() => setSendStatus(null), 3000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="page space-y-5">
      <PageHeader
        title="Send Single Message"
        subtitle="Send a WhatsApp message directly to any number"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Compose */}
        <div className="space-y-4">
          {/* Session selector */}
          <div className="card p-5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={11} />
              WhatsApp Session
            </label>
            {loadingSessions ? (
              <div className="flex items-center gap-2 py-2">
                <Loader size={15} className="animate-spin text-primary-500" />
                <span className="text-xs text-slate-400">Loading sessions…</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No connected sessions. Please create a session first.
                </p>
              </div>
            ) : (
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full input"
              >
                <option value="">Select a session…</option>
                {sessions.map((s) => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.name} — {s.phoneNumber || "Connecting…"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Recipient */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Phone size={15} className="text-slate-400" />
              Recipient
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative" ref={phoneInputRef}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setShowRecentDropdown(true)}
                  className="w-full input"
                />
                <p className="text-[10px] text-slate-400 mt-1">Include country code (+91 for India)</p>

                {showRecentDropdown && recentRecipients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">
                      Recent
                    </p>
                    {recentRecipients.map((recipient, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectRecentRecipient(recipient);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary-600">
                            {(recipient.contactName || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                            {recipient.contactName}
                          </p>
                          <p className="text-[10px] text-slate-400">{recipient.phoneNumber}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Contact Name <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Rahul Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full input"
                />
              </div>
            </div>
          </div>

          {/* Compose */}
          <div className="card p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-[#00a884] to-[#007b68] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare size={14} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Compose Message</p>
                <p className="text-xs text-white/70">{session || "No session selected"}</p>
              </div>
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className={`p-2 rounded-full transition-colors ${showSchedule ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
                title="Schedule"
              >
                <Clock size={15} className="text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                  placeholder="Type your message here…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isValid && !isSending) handleSend();
                    }
                  }}
                  className="w-full input min-h-[160px] resize-none pb-12 text-sm leading-relaxed"
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                      <Smile size={18} className="text-slate-400" />
                    </button>
                    <label className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                      <Paperclip size={18} className="text-slate-400" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleAddAttachment}
                        className="hidden"
                      />
                    </label>
                    <label className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                      <Image size={18} className="text-slate-400" />
                      <input
                        ref={additionalFileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleAddAttachment}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => setShowTemplates(true)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                      title="Templates"
                    >
                      <StickyNote size={18} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {attachments.length > 0 && (
                      <span className="px-2 py-0.5 text-[10px] bg-[#00a884] text-white rounded-full">
                        {attachments.length} file{attachments.length > 1 ? "s" : ""}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        messageWarning
                          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                      }`}
                    >
                      {characterCount}/1000
                    </span>
                  </div>
                </div>
              </div>

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="relative group flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {a.type.startsWith("image/") ? (
                        <img src={a.preview} alt={a.name} className="w-6 h-6 rounded object-cover" />
                      ) : (
                        <FileText size={14} className="text-slate-500 flex-shrink-0" />
                      )}
                      <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[100px] truncate">{a.name}</span>
                      <button
                        onClick={() => removeAttachment(a.id)}
                        className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Schedule */}
              {showSchedule && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={13} className="text-[#00a884]" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Schedule Message</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "now", label: "Now" },
                      { id: "later", label: "Later" },
                      { id: "recurring", label: "Recurring" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setScheduleType(opt.id)}
                        className={`py-1.5 rounded text-xs font-medium transition-colors ${
                          scheduleType === opt.id
                            ? "bg-[#00a884] text-white"
                            : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {scheduleType === "later" && (
                    <div className="mt-3">
                      <input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full input text-sm"
                      />
                    </div>
                  )}
                  {scheduleType === "recurring" && (
                    <div className="mt-3">
                      <select className="w-full input text-sm">
                        <option>Every day</option>
                        <option>Every 3 days</option>
                        <option>Every week</option>
                        <option>Every month</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {messageWarning && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center gap-2 border border-red-200 dark:border-red-800">
                  <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">Message exceeds 1000 characters</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              disabled={!isValid}
              className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye size={15} />
              Preview
            </button>
            <button
              onClick={handleSend}
              disabled={!isValid || isSending}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-[#00a884] to-[#008f70] hover:from-[#008f70] hover:to-[#00765c] rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#00a884]/20"
            >
              {isSending ? (
                <>
                  <Loader size={15} className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: WhatsApp Live Preview */}
        <div className="sticky top-20">
          <div className="rounded-2xl overflow-hidden shadow-2xl bg-[#ece5dd] dark:bg-[#111b21] ring-1 ring-black/5">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#008069] to-[#00a884] px-4 py-3 flex items-center gap-3 shadow-md">
              <button className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft size={17} className="text-white" />
              </button>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {contactName ? (
                  <span className="text-sm font-bold text-white">
                    {contactName[0].toUpperCase()}
                  </span>
                ) : (
                  <ContactRound size={15} className="text-white/70" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {contactName || "Select a contact"}
                </p>
                <p className="text-xs text-white/60">{phone || "Enter a phone number"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  <Video size={17} className="text-white" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  <Phone size={17} className="text-white" />
                </button>
              </div>
            </div>

            {/* Chat area */}
            <div
              className="h-[400px] relative overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]"
              style={{
                backgroundImage: `radial-gradient(#cfd8dc 1px, transparent 1px), radial-gradient(#cfd8dc 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 10px 10px",
              }}
            >
              <div className="h-full p-4 space-y-3 overflow-y-auto flex flex-col justify-end relative z-10">
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-white dark:bg-[#2a2f35] rounded-2xl rounded-bl-none px-3 py-2 shadow-sm">
                    <p className="text-sm text-slate-800 dark:text-[#e5e5e5]">
                      Hey there! 👋 Looking forward to your message.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                      {new Date(Date.now() - 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {(message || attachments.length > 0) && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-[#d1f7bf] dark:bg-[#005c4b] rounded-2xl rounded-tr-none shadow-sm overflow-hidden">
                      {attachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-0.5">
                          {attachments.slice(0, 4).map((file, idx) => (
                            <div key={file.id}>
                              {file.type.startsWith("image/") ? (
                                <img src={file.preview} alt={file.name} className="w-full h-28 object-cover" />
                              ) : (
                                <div className="h-28 bg-[#e8f5e9] dark:bg-[#0a3d32] p-3 flex flex-col items-center justify-center">
                                  <FileText size={22} className="text-slate-600 dark:text-slate-300" />
                                  <span className="text-[10px] truncate text-center text-slate-600 dark:text-slate-300 mt-1 px-1">
                                    {file.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {attachments.length > 4 && (
                            <div className="h-28 flex items-center justify-center bg-[#d1f7bf] dark:bg-[#005c4b]">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                +{attachments.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {message && (
                        <div className="px-3 py-2">
                          <p className="text-sm break-words whitespace-pre-wrap text-slate-900 dark:text-[#e5e5e5]">
                            {message}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-end gap-1">
                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            <span className="text-[#34b7f1]">✓✓</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!message && !attachments.length && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/40 dark:bg-white/5 flex items-center justify-center">
                      <MessageSquare size={22} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-400">Type a message to preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fake input bar */}
            <div className="bg-[#f0f2f5] dark:bg-[#1e2a30] px-3 py-2">
              <div className="flex items-center gap-2 bg-white dark:bg-[#2a2f35] rounded-full px-3 py-1.5 shadow-sm">
                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                  <Smile size={18} className="text-slate-400" />
                </button>
                <input
                  type="text"
                  placeholder="Type a message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                />
                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                  <Paperclip size={18} className="text-slate-400" />
                </button>
                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                  <Mic size={18} className="text-slate-400" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!isValid || isSending}
                  className="p-2 bg-[#00a884] hover:bg-[#008f70] disabled:bg-slate-300 dark:disabled:bg-slate-600 rounded-full transition-colors"
                >
                  {isSending ? (
                    <Loader size={16} className="animate-spin text-white" />
                  ) : (
                    <Send size={16} className="text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Info footer */}
            <div className="bg-white dark:bg-[#15202b] border-t border-slate-100 dark:border-slate-800 px-4 py-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">To</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{phone || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Session</p>
                <p className="font-semibold text-[#00a884] truncate">{session || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Length</p>
                <p className={`font-semibold ${messageWarning ? "text-red-500" : "text-slate-700 dark:text-slate-300"}`}>
                  {characterCount}/1000
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      {sendStatus === "success" && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-[#00a884] to-[#008f70] text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[300px]">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Message Sent!</p>
              <p className="text-xs text-white/70">Delivered to {phone}</p>
            </div>
            <button onClick={() => setSendStatus(null)} className="p-1 hover:bg-white/10 rounded">
              <X size={15} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {sendStatus === "error" && error && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[300px]">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Send Failed</p>
              <p className="text-xs text-white/70">{error}</p>
            </div>
            <button onClick={() => setSendStatus(null)} className="p-1 hover:bg-white/10 rounded">
              <X size={15} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Message Preview" size="lg">
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-[#008069] to-[#00a884] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {(contactName || "C")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{contactName || "Contact"}</p>
                <p className="text-xs text-white/70">{phone}</p>
              </div>
            </div>
            <div className="p-4 min-h-[160px] bg-[#efeae2] dark:bg-[#0b141a]">
              {(message || attachments.length > 0) && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-[#d1f7bf] dark:bg-[#005c4b] rounded-2xl rounded-tr-none shadow-sm overflow-hidden">
                    {attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-0.5">
                        {attachments.slice(0, 4).map((file) => (
                          <div key={file.id}>
                            {file.type.startsWith("image/") ? (
                              <img src={file.preview} alt={file.name} className="w-full h-24 object-cover" />
                            ) : (
                              <div className="h-24 bg-[#e8f5e9] p-2 flex flex-col items-center justify-center">
                                <FileText size={18} className="text-slate-700" />
                                <span className="text-[10px] truncate text-center">{file.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {message && (
                      <div className="px-3 py-2">
                        <p className="text-sm break-words whitespace-pre-wrap text-slate-900 dark:text-[#e5e5e5]">
                          {message}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-end gap-1">
                          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          <span className="text-[#34b7f1]">✓✓</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Recipient</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{contactName || "—"}</p>
              <p className="text-xs text-slate-400">{phone}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Session</p>
              <p className="text-sm font-medium text-[#00a884]">{session}</p>
              <p className="text-xs text-slate-400">Connected</p>
            </div>
          </div>

          {scheduleTime && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Clock size={12} />
                Scheduled for: {scheduleTime}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all"
            >
              Edit
            </button>
            <button
              onClick={() => { handleSend(); setShowPreview(false); }}
              disabled={isSending}
              className="flex-1 py-3 bg-gradient-to-r from-[#00a884] to-[#008f70] hover:from-[#008f70] hover:to-[#00765c] rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20"
            >
              <Send size={15} />
              Confirm & Send
            </button>
          </div>
        </div>
      </Modal>

      <TemplateModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(template) => {
          setMessage(template.content);
          setShowTemplates(false);
        }}
      />
    </div>
  );
}
