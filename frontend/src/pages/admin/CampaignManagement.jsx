import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Search, Play, Pause, Eye, Calendar, CheckCircle2,
  Loader2, RefreshCw, Download,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import { authFetch } from "../../services/authFetch";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const statusConfig = {
  running:   { badge: "badge-green",  label: "Running",   dot: "status-dot-green" },
  completed: { badge: "badge-blue",   label: "Completed", dot: "status-dot-slate" },
  scheduled: { badge: "badge-yellow", label: "Scheduled", dot: "status-dot-yellow" },
  paused:    { badge: "badge-slate",  label: "Paused",    dot: "status-dot-slate" },
  failed:    { badge: "badge-red",    label: "Failed",    dot: "status-dot-red" },
  draft:     { badge: "badge-slate",  label: "Draft",     dot: "status-dot-slate" },
};

const typeColors = {
  broadcast: "badge-blue", notification: "badge-violet", reminder: "badge-yellow",
  otp: "badge-green", marketing: "badge-purple",
};

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats]         = useState({ running: 0, scheduled: 0, completed: 0, totalSent: 0 });
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [detail, setDetail]       = useState(null);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/campaigns?status=${statusFilter}&search=${encodeURIComponent(search)}&page=${page}&limit=20`);
      if (res.success) {
        setCampaigns(res.data.campaigns);
        setTotal(res.data.total);
        setStats(res.data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page space-y-5">
      <PageHeader title="Campaign Management" subtitle="All user campaigns across the platform">
        <button onClick={load} disabled={loading} className="btn-secondary btn-sm gap-1.5">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Campaigns" value={stats.running}                  icon={Play}         iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard title="Scheduled"        value={stats.scheduled}                icon={Calendar}     iconColor="text-amber-600"  iconBg="bg-amber-50 dark:bg-amber-900/20" />
        <StatCard title="Completed"        value={stats.completed}                icon={CheckCircle2} iconColor="text-blue-600"   iconBg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard title="Total Msgs Sent"  value={(stats.totalSent || 0).toLocaleString()} icon={Megaphone} iconColor="text-violet-600" iconBg="bg-violet-50 dark:bg-violet-900/20" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 py-2 text-sm" placeholder="Search campaigns or users…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "running", "scheduled", "paused", "completed", "failed"].map((f) => (
            <button key={f} onClick={() => { setStatus(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === f ? "bg-[#00a884] text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Campaign</th>
            <th className="hidden sm:table-cell">User</th>
            <th>Status</th>
            <th className="hidden md:table-cell">Type</th>
            <th className="hidden lg:table-cell">Progress</th>
            <th className="hidden xl:table-cell">Delivery</th>
            <th className="hidden xl:table-cell">Created</th>
            <th className="w-10"></th>
          </tr></thead>
          <tbody className="bg-white dark:bg-slate-900">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12">
                <Loader2 size={24} className="animate-spin text-[#00a884] mx-auto" />
              </td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-sm text-slate-400">No campaigns found.</td></tr>
            ) : campaigns.map((c) => {
              const cfg = statusConfig[c.status] || statusConfig.draft;
              const delivRate = c.stats?.sent > 0 ? ((c.stats.delivered / c.stats.sent) * 100).toFixed(0) : 0;
              const progress = c.progress || (c.stats?.total > 0 ? Math.round((c.stats.sent / c.stats.total) * 100) : 0);
              return (
                <tr key={String(c._id)}>
                  <td>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{c.name}</p>
                    <p className="text-[10px] text-slate-400">{c.sessionId?.name || "—"}</p>
                  </td>
                  <td className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00a884] to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[9px] font-bold">{(c.userId?.name || c.userId?.email || "?")[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{c.userId?.name || c.userId?.email || "—"}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${cfg.badge}`}>
                      <span className={cfg.dot} /> {cfg.label}
                    </span>
                  </td>
                  <td className="hidden md:table-cell">
                    <span className={`badge ${typeColors[c.type] || "badge-slate"}`}>{c.type}</span>
                  </td>
                  <td className="hidden lg:table-cell">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <div className={`h-full rounded-full ${c.status === "failed" ? "bg-red-400" : c.status === "completed" ? "bg-emerald-500" : "bg-[#00a884]"}`}
                          style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0 w-8">{progress}%</span>
                    </div>
                  </td>
                  <td className="hidden xl:table-cell">
                    <div className="text-xs">
                      <span className="font-semibold text-emerald-600">{delivRate}%</span>
                      <span className="text-slate-400"> ({(c.stats?.delivered || 0).toLocaleString()}/{(c.stats?.sent || 0).toLocaleString()})</span>
                    </div>
                  </td>
                  <td className="hidden xl:table-cell text-xs text-slate-500">{fmtDate(c.createdAt)}</td>
                  <td>
                    <button onClick={() => setDetail(c)} className="btn-ghost btn-sm p-1.5" title="View">
                      <Eye size={14} className="text-slate-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Campaign Details" size="md"
        footer={<button onClick={() => setDetail(null)} className="btn-primary btn-sm">Close</button>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${statusConfig[detail.status]?.badge || "badge-slate"}`}>{statusConfig[detail.status]?.label || detail.status}</span>
              <span className={`badge ${typeColors[detail.type] || "badge-slate"}`}>{detail.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "User", v: detail.userId?.name || detail.userId?.email || "—" },
                { k: "Session", v: detail.sessionId?.name || "—" },
                { k: "Created", v: fmtDate(detail.createdAt) },
                { k: "Delay", v: `${detail.delaySeconds || 0}s` },
                { k: "Total", v: (detail.stats?.total || 0).toLocaleString() },
                { k: "Sent", v: (detail.stats?.sent || 0).toLocaleString() },
                { k: "Delivered", v: (detail.stats?.delivered || 0).toLocaleString() },
                { k: "Failed", v: (detail.stats?.failed || 0).toLocaleString() },
              ].map((r) => (
                <div key={r.k} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <p className="text-[10px] text-slate-400">{r.k}</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.v}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold">{detail.progress || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className={`h-full rounded-full ${detail.status === "failed" ? "bg-red-400" : "bg-[#00a884]"}`}
                  style={{ width: `${detail.progress || 0}%` }} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
