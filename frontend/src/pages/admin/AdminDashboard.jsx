import { useState, useEffect, useCallback } from "react";
import {
  Users, Smartphone, MessageSquare, Zap, TrendingUp, AlertCircle,
  Clock, CheckCircle2, RefreshCw, Loader2,
} from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import { MessageAreaChart, ApiBarChart } from "../../components/ui/ActivityChart";
import { DonutChart } from "../../components/ui/MiniChart";
import { authFetch } from "../../services/authFetch";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const statusIcons = {
  success: <CheckCircle2 size={14} className="text-emerald-500" />,
  warning: <AlertCircle  size={14} className="text-amber-500" />,
  error:   <AlertCircle  size={14} className="text-red-500" />,
  info:    <Clock        size={14} className="text-blue-400" />,
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/overview?days=${days}`);
      if (res.success) setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};
  const planSegments = data?.planSegments || [];
  const dailyChart = data?.dailyChart || [];
  const apiChart = data?.apiChart || [];
  const recentActivity = data?.recentActivity || [];
  const topUsers = data?.topUsers || [];

  return (
    <div className="page space-y-6">
      <PageHeader title="System Overview" subtitle="Platform-wide metrics and activity">
        <div className="flex items-center gap-2">
          <select
            className="input py-1 px-2.5 text-xs w-auto"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm gap-1.5">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <span className="badge badge-green">
            <span className="status-dot-green" /> All systems operational
          </span>
        </div>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={loading ? "—" : (stats.totalUsers ?? 0).toLocaleString()}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          subtitle={`${stats.newUsersCount ?? 0} new this period`}
        />
        <StatCard
          title="Active Sessions"
          value={loading ? "—" : (stats.connectedSessions ?? 0).toLocaleString()}
          icon={Smartphone}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle={`of ${stats.totalSessions ?? 0} total`}
        />
        <StatCard
          title="Messages Sent"
          value={loading ? "—" : (stats.recentMessageCount ?? 0).toLocaleString()}
          icon={MessageSquare}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          subtitle={`this period`}
        />
        <StatCard
          title="API Keys"
          value={loading ? "—" : (stats.activeApiKeys ?? 0).toLocaleString()}
          icon={Zap}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          subtitle={`of ${stats.totalApiKeys ?? 0} total`}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title text-base mb-1">Message Activity</p>
          <p className="section-subtitle text-xs mb-4">Messages over the selected period</p>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#00a884]" />
            </div>
          ) : (
            <MessageAreaChart data={dailyChart} />
          )}
        </div>

        <div className="card p-5">
          <p className="section-title text-base mb-1">Plan Distribution</p>
          <p className="section-subtitle text-xs mb-5">Active subscriptions breakdown</p>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#00a884]" />
            </div>
          ) : planSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <p className="text-xs">No subscription data</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <DonutChart segments={planSegments} size={110} />
              <div className="w-full space-y-2">
                {planSegments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {s.value}% <span className="text-slate-400 font-normal">({s.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API usage bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-title text-base">API Usage</p>
            <p className="section-subtitle text-xs">Single-message API calls per day</p>
          </div>
        </div>
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#00a884]" />
          </div>
        ) : (
          <ApiBarChart data={apiChart} />
        )}
      </div>

      {/* Bottom: activity + top users */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="section-title text-base">Recent Activity</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-[#00a884]" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No recent activity</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="mt-0.5">{statusIcons[a.status]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{a.user}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {a.action} · <span className="font-medium text-slate-600 dark:text-slate-300">{a.session}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(a.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="section-title text-base">Top Users</p>
            <span className="text-xs text-slate-400">by messages sent</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-[#00a884]" />
            </div>
          ) : topUsers.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No data yet</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topUsers.map((u, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00a884] to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{(u.name || "?")[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{u.msgs.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">msgs</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
