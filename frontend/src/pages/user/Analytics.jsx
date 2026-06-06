import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Smartphone, Zap, TrendingUp, RefreshCw,
  AlertTriangle, Loader2, Crown, Calendar, Clock, ArrowRight,
  CheckCircle2, XCircle, BarChart3, Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import { MessageAreaChart, ApiBarChart } from "../../components/ui/ActivityChart";
import { authFetch } from "../../services/authFetch";
import { DonutChart } from "../../components/ui/MiniChart";

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 86400000));
}

const DELIVERY_COLORS = {
  Delivered: "#22c55e", Sent: "#3b82f6", Failed: "#ef4444", Pending: "#f59e0b",
};

// ── Plan usage ring ────────────────────────────────────────────────────────────
function UsageRing({ label, used, limit }) {
  const unlimited = !limit || limit === -1;
  const pct = unlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);
  const r = 28, circ = 2 * Math.PI * r;
  const stroke = unlimited ? 0 : (pct / 100) * circ;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#00a884";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-slate-100 dark:text-slate-700" />
        {!unlimited && (
          <circle
            cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={`${stroke} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 36 36)" />
        )}
        <text x={36} y={40} textAnchor="middle" fontSize={13} fontWeight="700" fill={color}>
          {unlimited ? "∞" : `${pct}%`}
        </text>
      </svg>
      <div className="text-center">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{used.toLocaleString()}</p>
        <p className="text-[10px] text-slate-400">{unlimited ? "unlimited" : `of ${limit.toLocaleString()}`}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await authFetch(`/api/analytics/full?days=${days}`);
      if (!json.success) throw new Error(json.error || "Failed to load analytics");
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const stats = data?.stats || {};
  const sub = data?.subscription;
  const plan = sub?.plan;
  const usage = sub?.usage;
  const expiresAt = sub?.subscription?.expiresAt;
  const renewDays = daysLeft(expiresAt);
  const maxHourly = data ? Math.max(...(data.hourlyData || [0]), 1) : 1;

  // Donut segments from delivery data
  const donutSegments = (data?.deliveryData || []).map(d => ({
    value: d.pct, color: DELIVERY_COLORS[d.label] || "#94a3b8", label: d.label,
  }));

  return (
    <div className="page space-y-5">
      <PageHeader title="Analytics" subtitle="Real usage statistics and performance">
        <div className="flex items-center gap-2">
          <select
            className="input py-1.5 px-3 text-xs w-auto"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="btn-secondary gap-2 text-xs py-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Messages Sent"
          value={loading ? "—" : (stats.sent ?? 0).toLocaleString()}
          icon={MessageSquare}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          subtitle={`${stats.total ?? 0} total`}
        />
        <StatCard
          title="Delivered"
          value={loading ? "—" : (stats.delivered ?? 0).toLocaleString()}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle={`${stats.deliveryRate ?? 0}% rate`}
        />
        <StatCard
          title="Failed"
          value={loading ? "—" : (stats.failed ?? 0).toLocaleString()}
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-50 dark:bg-red-900/20"
          subtitle="delivery failures"
        />
        <StatCard
          title="Sessions"
          value={loading ? "—" : String(data?.sessions?.length ?? 0)}
          icon={Smartphone}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          subtitle={`${data?.sessions?.filter(s => s.status === "connected").length ?? 0} connected`}
        />
      </div>

      {/* Message chart + Delivery donut */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title text-base mb-1">Message Activity</p>
          <p className="section-subtitle text-xs mb-4">
            Daily messages — last {days} day{days > 1 ? "s" : ""}
          </p>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#00a884]" />
            </div>
          ) : (
            <MessageAreaChart data={data?.dailyChart || []} />
          )}
        </div>
        <div className="card p-5">
          <p className="section-title text-base mb-1">Delivery Status</p>
          <p className="section-subtitle text-xs mb-5">
            {(stats.total ?? 0).toLocaleString()} messages total
          </p>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#00a884]" />
            </div>
          ) : donutSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 h-32 text-slate-400">
              <BarChart3 size={24} className="opacity-40" />
              <p className="text-xs">No data yet</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <DonutChart segments={donutSegments} size={100} />
              <div className="w-full space-y-2">
                {(data?.deliveryData || []).map(d => (
                  <div key={d.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DELIVERY_COLORS[d.label] }} />
                      <span className="text-slate-600 dark:text-slate-400">{d.label}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {d.value.toLocaleString()} <span className="text-slate-400 font-normal">({d.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API usage chart */}
      <div className="card p-5">
        <p className="section-title text-base mb-1">API Requests</p>
        <p className="section-subtitle text-xs mb-4">Single messages sent via API per day</p>
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#00a884]" />
          </div>
        ) : (
          <ApiBarChart data={(data?.apiChart || []).map(d => ({ ...d, errors: 0 }))} />
        )}
      </div>

      {/* Hourly heatmap */}
      <div className="card p-5">
        <p className="section-title text-base mb-1">Peak Hours</p>
        <p className="section-subtitle text-xs mb-4">Message volume by hour of day</p>
        {loading ? (
          <div className="h-16 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#00a884]" />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1 h-16">
              {(data?.hourlyData || Array(24).fill(0)).map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#00a884] rounded-t transition-all hover:bg-[#008069] cursor-default"
                  style={{
                    height: `${maxHourly > 0 ? (v / maxHourly) * 100 : 0}%`,
                    minHeight: v > 0 ? 4 : 0,
                    opacity: 0.4 + (v / maxHourly) * 0.6,
                  }}
                  title={`${i}:00 — ${v} messages`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
            </div>
          </>
        )}
      </div>

      {/* Subscription & Plan usage */}
      {!loading && plan && (
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div>
              <p className="section-title text-base flex items-center gap-2">
                <Crown size={16} className="text-[#00a884]" /> Subscription — {plan.name} Plan
              </p>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                {expiresAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> Renews {fmtDate(expiresAt)}
                  </span>
                )}
                {renewDays !== null && renewDays <= 14 && (
                  <span className={`flex items-center gap-1 font-semibold ${renewDays <= 3 ? "text-red-500" : "text-amber-500"}`}>
                    <Clock size={11} />
                    {renewDays === 0 ? "Expires today!" : `${renewDays} days left`}
                  </span>
                )}
                <span className={`flex items-center gap-1 capitalize font-medium ${
                  sub?.subscription?.status === "active" ? "text-emerald-600" :
                  sub?.subscription?.status === "trial" ? "text-amber-600" : "text-red-500"
                }`}>
                  <Activity size={11} /> {sub?.subscription?.status || "unknown"}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard/subscription")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#00a884] text-white hover:bg-[#008f70] transition-colors"
            >
              {sub?.subscription?.status === "trial" ? "Upgrade Now" : "Manage Plan"}
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Usage rings */}
          {usage && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <UsageRing label="Sessions" used={usage.sessions ?? 0} limit={plan.limits?.sessions} />
              <UsageRing label="Campaigns" used={usage.campaigns ?? 0} limit={plan.limits?.campaigns} />
              <UsageRing label="Messages/mo" used={usage.messagesMonthly ?? 0} limit={plan.limits?.messagesMonthly} />
              <UsageRing label="Storage MB" used={Math.round((usage.storageBytes ?? 0) / 1048576)} limit={plan.limits?.storageMb} />
            </div>
          )}

          {/* Plan limits table */}
          {plan.limits && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Plan Limits</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Sessions", key: "sessions" },
                  { label: "Campaigns", key: "campaigns" },
                  { label: "Number Lists", key: "numberLists" },
                  { label: "Msgs/Month", key: "messagesMonthly" },
                  { label: "Msgs/Day", key: "messagesDaily" },
                  { label: "Msgs/Week", key: "messagesWeekly" },
                  { label: "Storage (MB)", key: "storageMb" },
                ].map(({ label, key }) => {
                  const val = plan.limits[key];
                  return (
                    <div key={key} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                      <p className={`text-base font-bold mt-0.5 ${val === -1 ? "text-[#00a884]" : "text-slate-800 dark:text-white"}`}>
                        {val === -1 ? "∞" : (val ?? 0).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
