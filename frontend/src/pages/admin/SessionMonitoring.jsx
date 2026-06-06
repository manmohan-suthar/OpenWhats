import { useState, useEffect, useCallback } from "react";
import { Smartphone, RefreshCw, WifiOff, Wifi, Search, AlertTriangle, Loader2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { authFetch } from "../../services/authFetch";

function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const statusConfig = {
  connected:    { badge: "badge-green",  dot: "status-dot-green",  label: "Connected" },
  disconnected: { badge: "badge-red",    dot: "status-dot-red",    label: "Disconnected" },
  connecting:   { badge: "badge-yellow", dot: "status-dot-yellow", label: "Connecting…" },
  pending:      { badge: "badge-yellow", dot: "status-dot-yellow", label: "Pending" },
  failed:       { badge: "badge-red",    dot: "status-dot-red",    label: "Failed" },
};

function HealthBar({ status }) {
  const val = status === "connected" ? 95 : status === "connecting" || status === "pending" ? 30 : 0;
  const color = val >= 80 ? "bg-emerald-500" : val >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${val}%` }} />
      </div>
      <span className="text-xs text-slate-500">{val > 0 ? `${val}%` : "—"}</span>
    </div>
  );
}

export default function SessionMonitoring() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats]       = useState({ total: 0, connected: 0, disconnected: 0, connecting: 0 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/sessions");
      if (res.success) {
        setSessions(res.data.sessions);
        setStats(res.data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    const match = (s.name || "").toLowerCase().includes(q) ||
      (s.sessionId || "").toLowerCase().includes(q) ||
      (s.user?.name || s.user?.email || "").toLowerCase().includes(q) ||
      (s.phoneNumber || "").includes(q);
    const statusMatch = filter === "all" || s.status === filter ||
      (filter === "connecting" && ["connecting", "pending"].includes(s.status));
    return match && statusMatch;
  });

  return (
    <div className="page space-y-5">
      <PageHeader title="Session Monitoring" subtitle="Live status of all WhatsApp sessions">
        <button onClick={load} disabled={loading} className="btn-secondary gap-2 btn-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Sessions"  value={stats.total}        icon={Smartphone}    iconColor="text-slate-600"   iconBg="bg-slate-100 dark:bg-slate-800" />
        <StatCard title="Connected"       value={stats.connected}    icon={Wifi}          iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard title="Disconnected"    value={stats.disconnected} icon={WifiOff}       iconColor="text-red-500"     iconBg="bg-red-50 dark:bg-red-900/20" />
        <StatCard title="Reconnecting"   value={stats.connecting}   icon={AlertTriangle}  iconColor="text-amber-500"   iconBg="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 py-2 text-sm" placeholder="Search sessions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "connected", "disconnected", "connecting"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-[#00a884] text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}
            >{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={28} className="animate-spin text-[#00a884]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-slate-400">
          <Smartphone size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{sessions.length === 0 ? "No sessions yet" : "No sessions match your filter"}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const cfg = statusConfig[s.status] || statusConfig.disconnected;
            return (
              <div key={String(s._id)} className="card p-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#00a884]/10 dark:bg-[#00a884]/20 flex items-center justify-center">
                      <Smartphone size={17} className="text-[#00a884]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.phoneNumber || s.sessionId?.slice(0, 16) || "—"}</p>
                    </div>
                  </div>
                  <span className={`badge ${cfg.badge}`}>
                    <span className={cfg.dot} /> {cfg.label}
                  </span>
                </div>

                <div className="text-xs text-slate-500 mb-3">
                  {s.user?.name || s.user?.email || "Unknown user"}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <p className="text-[10px] text-slate-400 mb-0.5">Messages</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{(s.messages || 0).toLocaleString()}</p>
                  </div>
                  <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <p className="text-[10px] text-slate-400 mb-0.5">Last Active</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{timeAgo(s.lastConnected)}</p>
                  </div>
                </div>

                <HealthBar status={s.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
