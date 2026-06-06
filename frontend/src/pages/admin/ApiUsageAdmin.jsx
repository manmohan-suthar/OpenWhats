import { useState, useEffect, useCallback } from "react";
import { Zap, CheckCircle2, TrendingUp, Key, RefreshCw, Loader2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { ApiBarChart } from "../../components/ui/ActivityChart";
import { authFetch } from "../../services/authFetch";

export default function ApiUsageAdmin() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/api-usage?days=${days}`);
      if (res.success) setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};
  const weekChart = data?.weekChart || [];
  const topConsumers = data?.topConsumers || [];

  return (
    <div className="page space-y-5">
      <PageHeader title="API Usage Overview" subtitle="Platform-wide API analytics and performance">
        <div className="flex items-center gap-2">
          <select className="input py-1 px-2.5 text-xs w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm gap-1.5">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total API Calls"
          value={loading ? "—" : (stats.totalCallCount ?? 0).toLocaleString()}
          icon={Zap}
          iconColor="text-[#00a884]"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          title="Active Keys"
          value={loading ? "—" : (stats.activeKeys ?? 0).toLocaleString()}
          icon={Key}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          subtitle={`of ${stats.totalKeys ?? 0} total`}
        />
        <StatCard
          title="Success Rate"
          value={loading ? "—" : `${stats.successRate ?? 100}%`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          title="Total Keys Created"
          value={loading ? "—" : (stats.totalKeys ?? 0).toLocaleString()}
          icon={TrendingUp}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title text-base mb-1">Request Volume</p>
          <p className="section-subtitle text-xs mb-4">Daily single-message API calls</p>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#00a884]" />
            </div>
          ) : (
            <ApiBarChart data={weekChart} />
          )}
        </div>

        <div className="card p-5">
          <p className="section-title text-base mb-1">Top API Consumers</p>
          <p className="section-subtitle text-xs mb-4">By total API key call count</p>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#00a884]" />
            </div>
          ) : topConsumers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <p className="text-xs">No API usage yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topConsumers.map((u, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate flex-1 mr-2">{u.name}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">{u.calls.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <div className="h-full bg-[#00a884] rounded-full transition-all duration-700" style={{ width: `${u.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="card p-5">
        <p className="section-title text-base mb-2">API Key Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Keys Created", value: stats.totalKeys ?? 0 },
            { label: "Active Keys", value: stats.activeKeys ?? 0 },
            { label: "Revoked Keys", value: (stats.totalKeys ?? 0) - (stats.activeKeys ?? 0) },
            { label: "Total Calls Tracked", value: stats.totalCallCount ?? 0 },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">
                {loading ? "—" : s.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
