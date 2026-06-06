import { useState, useEffect } from "react";
import {
  Send,
  Search,
  Filter,
  Download,
  MessageSquare,
  Users,
  Clock,
  Loader,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import api from "../../services/api";

const STATUS_BADGE = {
  delivered: "badge-green",
  sent: "badge-blue",
  failed: "badge-red",
  pending: "badge-yellow",
};

export default function Messages() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [tab, setTab] = useState("single"); // 'single' | 'bulk'
  const [to, setTo] = useState("");
  const [session, setSession] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessions, setSessions] = useState([]);

  // Check auth and load data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load sessions
      const sessionsData = await api.getSessions();
      setSessions(Array.isArray(sessionsData.data) ? sessionsData.data : []);

      // Load messages from all sessions
      const allMessages = [];
      for (const s of Array.isArray(sessionsData.data) ? sessionsData.data : []) {
        try {
          const msgData = await api.getSessionMessages(s.sessionId);
          allMessages.push(...(msgData.messages || []));
        } catch (err) {
          console.error(
            `Failed to load messages for session ${s.sessionId}:`,
            err,
          );
        }
      }

      // Sort by newest first
      allMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMessages(allMessages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = messages.filter((m) => {
    const q = search.toLowerCase();
    const match =
      m.phoneNumber.includes(q) || m.message.toLowerCase().includes(q);
    const sf = statusFilter === "all" || m.status === statusFilter;
    return match && sf;
  });

  // Calculate stats
  const stats = {
    sent: messages.filter((m) => m.status === "sent").length,
    delivered: messages.filter((m) => m.status === "delivered").length,
    failed: messages.filter((m) => m.status === "failed").length,
    pending: messages.filter((m) => m.status === "pending").length,
  };

  const templates = [
    "Hello {{name}}, your order #{{order_id}} has been confirmed.",
    "Your OTP is {{otp}}. Valid for 5 minutes. Do not share.",
    "Hi {{name}}, your appointment is scheduled for {{date}} at {{time}}.",
  ];

  return (
    <div className="page space-y-5">
      <PageHeader
        title="Messages"
        subtitle={`${messages.length} messages total`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary gap-2 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="btn-primary gap-2"
          >
            <Send size={15} /> Compose
          </button>
        </div>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Sent",
            value: stats.sent.toString(),
            icon: Send,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "Delivered",
            value: stats.delivered.toString(),
            icon: MessageSquare,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: "Failed",
            value: stats.failed.toString(),
            icon: MessageSquare,
            color: "text-red-500",
            bg: "bg-red-50 dark:bg-red-900/20",
          },
          {
            label: "Pending",
            value: stats.pending.toString(),
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}
            >
              <s.icon size={17} className={s.color} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {s.value}
              </p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input pl-9 py-1.5 text-sm"
              placeholder="Search messages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "delivered", "sent", "failed", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter === f ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="btn-secondary btn-sm gap-1.5 ml-auto">
            <Download size={13} /> Export
          </button>
        </div>

        <div className="table-container border-none rounded-none">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={24} className="animate-spin text-primary-500" />
              <span className="ml-3 text-slate-600 dark:text-slate-400">
                Loading messages...
              </span>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th className="hidden md:table-cell">Sent Time</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900">
                {filtered.map((m) => (
                  <tr key={m.messageId}>
                    <td>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {m.contactName || "Unknown"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {m.phoneNumber}
                      </p>
                    </td>
                    <td>
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {m.message}
                      </p>
                    </td>
                    <td>
                      <span className={STATUS_BADGE[m.status] || "badge-gray"}>
                        {m.status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell text-xs text-slate-500">
                      {m.sentAt
                        ? new Date(m.sentAt).toLocaleString()
                        : new Date(m.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">
              {messages.length === 0
                ? "No messages yet. Send your first message!"
                : "No messages found."}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <Modal
        open={showCompose}
        onClose={() => setShowCompose(false)}
        title="Compose Message"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowCompose(false)}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowCompose(false)}
              className="btn-primary btn-sm gap-2"
            >
              <Send size={13} /> Send Message
            </button>
          </>
        }
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {[
            ["single", "Single Message"],
            ["bulk", "Bulk Send"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${tab === v ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              WhatsApp Session
            </label>
            <select
              className="input"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value="">Select a session...</option>
              {sessions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.name} — {s.phoneNumber || "Connecting..."}
                </option>
              ))}
            </select>
          </div>

          {tab === "single" ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Recipient Phone
              </label>
              <input
                className="input"
                placeholder="+91 98765 43210"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Recipients{" "}
                <span className="text-slate-400">(one per line)</span>
              </label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="+91 98765 43210&#10;+91 87654 32109"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Or upload a CSV file with a "phone" column.
              </p>
              <button className="btn-secondary btn-sm mt-2 gap-1.5">
                <Users size={13} /> Upload CSV
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Message
            </label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="Type your message here…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {message.length}/1000 characters
            </p>
          </div>

          {/* Templates */}
          <div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quick Templates
            </p>
            <div className="space-y-1.5">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(t)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">
              Schedule send:
            </label>
            <input
              type="datetime-local"
              className="input py-1.5 text-xs flex-1"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
