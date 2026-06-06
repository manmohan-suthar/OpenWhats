import { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  MessageSquare,
  Zap,
  TrendingUp,
  Plus,
  ArrowRight,
  RefreshCw,
  Crown,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import { MessageAreaChart } from "../../components/ui/ActivityChart";
import { useAuth } from "../../contexts/AuthContext";
import { authFetch } from "../../services/authFetch";
import helloIcon from "../../assets/icons/hello.gif";

// ── helpers ────────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const d = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000);
  return Math.max(0, d);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_BADGE = {
  delivered: "badge-green",
  read: "badge-green",
  sent: "badge-blue",
  pending: "badge-yellow",
  failed: "badge-red",
};
const STATUS_ICON = {
  delivered: CheckCircle2,
  read: CheckCircle2,
  sent: CheckCircle2,
  pending: Clock,
  failed: XCircle,
};
const STATUS_COLOR = {
  delivered: "text-emerald-500",
  read: "text-emerald-500",
  sent: "text-blue-500",
  pending: "text-amber-500",
  failed: "text-red-500",
};

// ── Plan usage bar ─────────────────────────────────────────────────────────────
function PlanUsageBar({ label, used, limit, color = "#00a884" }) {
  const unlimited = !limit || limit === -1;
  const pct = unlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : color;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {used.toLocaleString()}
          {!unlimited && ` / ${limit.toLocaleString()}`}
          {unlimited && (
            <span className="text-[#00a884] ml-1 text-[10px]">∞</span>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: unlimited ? "20%" : `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await authFetch("/api/analytics/dashboard");
      if (!json.success)
        throw new Error(json.error || "Failed to load dashboard");
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const sub = data?.subscription;
  const plan = sub?.plan;
  const usage = sub?.usage;
  const stats = data?.stats || {};
  const days = daysLeft(sub?.subscription?.expiresAt);

  return (
    <div className="page space-y-6">
      <PageHeader
        title={
          <span className="inline-flex capitalize items-center gap-1">
            {greeting},{" "}
            <div className="text-emerald-600">
              {user?.name?.split(" ")[0] || "User"}
            </div>
            <img
              src={helloIcon}
              alt="Clubhouse icon"
              className="h-11 w-11 "
              draggable="false"
              loading="eager"
            />
          </span>
        }
        subtitle="Here's what's happening with your WhatsApp platform today."
      >
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="btn-secondary gap-2 text-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
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
          title="Active Sessions"
          value={loading ? "—" : String(stats.connectedSessions ?? 0)}
          icon={Smartphone}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          subtitle={`of ${stats.totalSessions ?? 0} total`}
        />
        <StatCard
          title="Messages Sent"
          value={loading ? "—" : (stats.sentMessages ?? 0).toLocaleString()}
          icon={MessageSquare}
          iconColor="text-violet-600"
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          subtitle="all time"
        />
        <StatCard
          title="Campaigns"
          value={loading ? "—" : String(stats.totalCampaigns ?? 0)}
          icon={Zap}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          subtitle={`${stats.activeCampaigns ?? 0} running`}
        />
        <StatCard
          title="Delivery Rate"
          value={loading ? "—" : `${stats.deliveryRate ?? 0}%`}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          subtitle={`${stats.failedMessages ?? 0} failed`}
        />
      </div>

      {/* Chart + Sessions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title text-base">Activity This Week</p>
              <p className="section-subtitle text-xs">Messages sent per day</p>
            </div>
            <span className="text-xs text-slate-400">Last 7 days</span>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#00a884]" />
            </div>
          ) : (
            <MessageAreaChart data={data?.weekChart || []} />
          )}
        </div>

        {/* Sessions quick view */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              My Sessions
            </p>
            <button
              onClick={() => navigate("/dashboard/sessions")}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 size={20} className="animate-spin text-[#00a884]" />
              </div>
            ) : data?.sessions?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No sessions yet
              </p>
            ) : (
              data?.sessions?.map((s) => (
                <div
                  key={s.sessionId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "connected" ? "bg-emerald-500" : "bg-slate-300"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {s.name || s.sessionId}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">
                      {s.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate("/dashboard/sessions")}
              className="btn-secondary w-full btn-sm text-xs gap-2"
            >
              <Plus size={13} /> Add Session
            </button>
          </div>
        </div>
      </div>

      {/* Subscription card */}
      {!loading && plan && (
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#008069] to-[#00a884] flex items-center justify-center shadow-lg">
                <Crown size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {plan.name} Plan
                  {sub?.subscription?.status && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                        sub.subscription.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : sub.subscription.status === "trial"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {sub.subscription.status}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  {sub?.subscription?.expiresAt && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Renews {fmtDate(sub.subscription.expiresAt)}
                    </span>
                  )}
                  {days !== null && days <= 10 && (
                    <span
                      className={`flex items-center gap-1 font-semibold ${days <= 3 ? "text-red-500" : "text-amber-500"}`}
                    >
                      <Clock size={11} />
                      {days === 0 ? "Expires today!" : `${days}d left`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard/subscription")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#00a884] text-white hover:bg-[#008f70] transition-colors"
            >
              {sub?.subscription?.status === "trial"
                ? "Upgrade Now"
                : "Manage Plan"}
              <ArrowRight size={14} />
            </button>
          </div>

          {usage && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <PlanUsageBar
                label="Sessions"
                used={usage.sessions ?? 0}
                limit={plan.limits?.sessions}
              />
              <PlanUsageBar
                label="Campaigns"
                used={usage.campaigns ?? 0}
                limit={plan.limits?.campaigns}
              />
              <PlanUsageBar
                label="Messages/mo"
                used={usage.messagesMonthly ?? 0}
                limit={plan.limits?.messagesMonthly}
              />
              <PlanUsageBar
                label="Storage MB"
                used={Math.round((usage.storageBytes ?? 0) / 1048576)}
                limit={plan.limits?.storageMb}
              />
            </div>
          )}
        </div>
      )}

      {/* Recent messages */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="section-title text-base">Recent Messages</p>
            <p className="section-subtitle text-xs">Latest outbound messages</p>
          </div>
          <button
            onClick={() => navigate("/dashboard/messages")}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={11} />
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={24} className="animate-spin text-[#00a884]" />
            </div>
          ) : !data?.recentMessages?.length ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <MessageSquare size={28} className="opacity-40" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            data.recentMessages.map((m) => {
              const Icon = STATUS_ICON[m.status] || Clock;
              return (
                <div
                  key={m._id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Icon
                      size={14}
                      className={STATUS_COLOR[m.status] || "text-slate-400"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {m.contactName || m.phoneNumber}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {m.message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={STATUS_BADGE[m.status] || "badge-yellow"}>
                      {m.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {timeAgo(m.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            label: "Send a Message",
            desc: "Send single or bulk messages",
            to: "/dashboard/messages",
            color: "from-wa-dark to-wa-teal",
            icon: MessageSquare,
          },
          {
            label: "View Analytics",
            desc: "Detailed usage statistics",
            to: "/dashboard/analytics",
            color: "from-violet-600 to-violet-500",
            icon: BarChart3,
          },
          {
            label: "Manage Plan",
            desc: "Upgrade or view subscription",
            to: "/dashboard/subscription",
            color: "from-[#008069] to-[#00a884]",
            icon: Crown,
          },
        ].map(({ label, desc, to, color, icon: Icon }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`group relative overflow-hidden rounded-xl p-5 bg-gradient-to-br ${color} text-white text-left hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5`}
          >
            <Icon size={20} className="mb-3 opacity-90" />
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs opacity-70 mt-0.5">{desc}</p>
            <ArrowRight
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
