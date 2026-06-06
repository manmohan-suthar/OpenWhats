import { useState, useEffect, useCallback } from "react";
import { BarChart2, Users, MessageSquare, Smartphone, RefreshCw, Loader2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { MessageAreaChart, ApiBarChart } from "../../components/ui/ActivityChart";
import { authFetch } from "../../services/authFetch";

export default function SystemAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths]   = useState(6);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/analytics?months=${months}`);
      if (res.success) setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats || {};
  const activityChart = data?.activityChart || [];
  const apiChart = data?.apiChart || [];
  const geoData = data?.geoData || [];

  return (
    <div className="page space-y-5">
      <PageHeader title="System Analytics" subtitle="Platform growth and engagement trends">
        <div className="flex items-center gap-2">
          <select className="input py-1.5 px-3 text-xs w-auto" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last year</option>
          </select>
          <button onClick={load} disabled={loading} className="btn-secondary btn-sm gap-1.5">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={loading ? "—" : (stats.totalUsers ?? 0).toLocaleString()}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          trend="up"
          trendValue={stats.userTrend || "—"}
          subtitle={`past ${months} months`}
        />
        <StatCard
          title="Messages Sent"
          value={loading ? "—" : (stats.totalMessages ?? 0).toLocaleString()}
          icon={MessageSquare}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          trend="up"
          trendValue={stats.msgTrend || "—"}
          subtitle={`past ${months} months`}
        />
        <StatCard
          title="Sessions Created"
          value={loading ? "—" : (stats.peakSessions ?? 0).toLocaleString()}
          icon={Smartphone}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle={`past ${months} months`}
        />
        <StatCard
          title="API Calls"
          value={loading ? "—" : (stats.totalApiCalls ?? 0).toLocaleString()}
          icon={BarChart2}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          subtitle={`past ${months} months`}
        />
      </div>

      <div className="card p-5">
        <p className="section-title text-base mb-1">Message & Session Volume</p>
        <p className="section-subtitle text-xs mb-4">Monthly platform activity</p>
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#00a884]" />
          </div>
        ) : (
          <MessageAreaChart data={activityChart} />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title text-base mb-1">API Growth</p>
          <p className="section-subtitle text-xs mb-4">Monthly single-message API calls</p>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#00a884]" />
            </div>
          ) : (
            <ApiBarChart data={apiChart} />
          )}
        </div>

        <div className="card p-5">
          <p className="section-title text-base mb-1">User Locations</p>
          <p className="section-subtitle text-xs mb-4">Distribution by location field</p>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#00a884]" />
            </div>
          ) : geoData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <p className="text-xs">No location data — users haven't set their location yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {geoData.map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-24 flex-shrink-0 truncate">{g.country}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <div className="h-full bg-[#00a884] rounded-full transition-all duration-700" style={{ width: `${g.pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right flex-shrink-0">{g.users}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-8 text-right flex-shrink-0">{g.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
