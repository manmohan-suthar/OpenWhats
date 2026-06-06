import { useState, useEffect, useCallback } from "react";
import {
  Inbox, Search, RefreshCw,
  CheckCircle2, XCircle, Clock, Send, Eye, Loader2,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import { authFetch } from "../../services/authFetch";

function fmtDt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_BADGE = { delivered: "badge-green", sent: "badge-blue", failed: "badge-red", pending: "badge-yellow", read: "badge-purple" };
const STATUS_ICON  = {
  delivered: <CheckCircle2 size={13} className="text-emerald-500" />,
  read:      <CheckCircle2 size={13} className="text-blue-500" />,
  sent:      <Send         size={13} className="text-blue-500" />,
  failed:    <XCircle      size={13} className="text-red-500" />,
  pending:   <Clock        size={13} className="text-amber-500" />,
};

export default function MessageLogs() {
  const [messages, setMessages]       = useState([]);
  const [stats, setStats]             = useState({ total: 0, delivered: 0, failed: 0, pending: 0 });
  const [activeCampaigns, setActive]  = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [statusFilter, setStatus]     = useState("all");
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [detail, setDetail]           = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/admin/messages?status=${statusFilter}&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`
      );
      if (res.success) {
        setMessages(res.data.messages);
        setTotal(res.data.total);
        setStats(res.data.stats);
        setActive(res.data.activeCampaigns || []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);
  const delivRate = stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="page space-y-5">
      <PageHeader title="Message Logs" subtitle="Platform-wide delivery tracking">
        <button onClick={load} disabled={loading} className="btn-secondary btn-sm gap-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Messages" value={(stats.total || 0).toLocaleString()} icon={Inbox}        iconColor="text-slate-600"   iconBg="bg-slate-100 dark:bg-slate-800" />
        <StatCard title="Delivered"      value={(stats.delivered || 0).toLocaleString()} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20" subtitle={`${delivRate}% rate`} />
        <StatCard title="Failed"         value={(stats.failed || 0).toLocaleString()}    icon={XCircle}  iconColor="text-red-500"     iconBg="bg-red-50 dark:bg-red-900/20" />
        <StatCard title="Pending"        value={(stats.pending || 0).toLocaleString()}   icon={Clock}    iconColor="text-amber-600"   iconBg="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      {/* Active Campaigns */}
      {activeCampaigns.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="section-title text-base">Active Campaigns</p>
              <p className="section-subtitle text-xs">Currently running campaigns</p>
            </div>
            <span className="badge badge-green">
              <span className="status-dot-green" /> {activeCampaigns.length} running
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeCampaigns.map((c) => (
              <div key={String(c._id)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="status-dot status-dot-green" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                  <p className="text-[11px] text-slate-400">{c.userId?.name || "—"} · {c.sessionId?.name || "—"}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {((c.stats?.total || 0) - (c.stats?.sent || 0)).toLocaleString()} remaining
                  </p>
                  <p className="text-[10px] text-slate-400">{c.stats?.sent || 0} sent</p>
                </div>
                <span className="badge badge-green flex-shrink-0">Running</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 py-1.5 text-sm" placeholder="Search phone, name…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "delivered", "sent", "failed", "pending"].map((f) => (
              <button key={f} onClick={() => { setStatus(f); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter === f ? "bg-[#00a884] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}
              >{f}</button>
            ))}
          </div>
        </div>
        <div className="table-container border-none rounded-none">
          <table className="table">
            <thead><tr>
              <th>Status</th>
              <th>Recipient</th>
              <th className="hidden sm:table-cell">Campaign</th>
              <th className="hidden md:table-cell">User</th>
              <th className="hidden lg:table-cell">Session</th>
              <th className="hidden md:table-cell">Time</th>
              <th className="w-10"></th>
            </tr></thead>
            <tbody className="bg-white dark:bg-slate-900">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 size={24} className="animate-spin text-[#00a884] mx-auto" />
                </td></tr>
              ) : messages.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-400">No logs match your filters.</td></tr>
              ) : messages.map((m) => (
                <tr key={String(m._id)}>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICON[m.status] || STATUS_ICON.pending}
                      <span className={`badge ${STATUS_BADGE[m.status] || "badge-slate"}`}>{m.status}</span>
                    </div>
                  </td>
                  <td className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    {m.phoneNumber}
                    {m.contactName && <span className="ml-1 text-slate-400 font-sans">({m.contactName})</span>}
                  </td>
                  <td className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
                    {m.campaignId?.name || <span className="text-slate-400 italic">single</span>}
                  </td>
                  <td className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-400">
                    {m.sessionId?.userId?.name || m.sessionId?.userId?.email || "—"}
                  </td>
                  <td className="hidden lg:table-cell">
                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                      {m.sessionId?.name || "—"}
                    </code>
                  </td>
                  <td className="hidden md:table-cell text-xs text-slate-500 whitespace-nowrap">{fmtDt(m.createdAt)}</td>
                  <td>
                    <button onClick={() => setDetail(m)} className="btn-ghost btn-sm p-1.5">
                      <Eye size={13} className="text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {messages.length} of {total} messages</span>
          {totalPages > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-md text-xs ${p === page ? "bg-[#00a884] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
                >{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Message Detail" size="sm"
        footer={<button onClick={() => setDetail(null)} className="btn-primary btn-sm">Close</button>}
      >
        {detail && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {STATUS_ICON[detail.status] || STATUS_ICON.pending}
              <span className={`badge ${STATUS_BADGE[detail.status] || "badge-slate"}`}>{detail.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { k: "Recipient", v: detail.phoneNumber },
                { k: "Contact", v: detail.contactName || "—" },
                { k: "User", v: detail.sessionId?.userId?.name || detail.sessionId?.userId?.email || "—" },
                { k: "Campaign", v: detail.campaignId?.name || "Single message" },
                { k: "Session", v: detail.sessionId?.name || "—" },
                { k: "Type", v: detail.messageType || "—" },
                { k: "Sent At", v: fmtDt(detail.sentAt || detail.createdAt) },
              ].map((r) => (
                <div key={r.k} className={`px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 ${r.k === "Recipient" ? "col-span-2" : ""}`}>
                  <p className="text-[10px] text-slate-400">{r.k}</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{r.v}</p>
                </div>
              ))}
            </div>
            <div className="px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <p className="text-[10px] text-slate-400 mb-1">Message Content</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{detail.message}</p>
            </div>
            {detail.error && (
              <div className="px-3 py-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-[10px] text-red-400 mb-1">Error</p>
                <p className="text-xs text-red-600 dark:text-red-400">{detail.error}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
