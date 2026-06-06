import { useState, useEffect, useCallback } from "react";
import {
  Camera,
  MessageSquare,
  TrendingUp,
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
  Crown,
  Calendar,
  AlertTriangle,
  Clock,
  Heart,
  Zap,
  Loader2,
  BarChart3,
  Send,
  Image,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import { MessageAreaChart } from "../../components/ui/ActivityChart";
import { useAuth } from "../../contexts/AuthContext";
import { authFetch } from "../../services/authFetch";

// ── helpers ────────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Plan usage bar ─────────────────────────────────────────────────────────────
function PlanUsageBar({ label, used, limit, color = "#E1306C" }) {
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
            <span className="text-[#E1306C] ml-1 text-[10px]">∞</span>
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
export default function InstagramDashboard() {
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
      // Placeholder data - replace with actual API call
      setData({
        stats: {
          connectedAccounts: 2,
          totalFollowers: 48900,
          totalPosts: 156,
          engagementRate: 96.4,
          dmReplies: 1245,
          reach: 48900,
        },
        weekChart: [
          { day: "Mon", value: 234 },
          { day: "Tue", value: 421 },
          { day: "Wed", value: 345 },
          { day: "Thu", value: 567 },
          { day: "Fri", value: 678 },
          { day: "Sat", value: 812 },
          { day: "Sun", value: 934 },
        ],
        accounts: [
          {
            id: 1,
            name: "@brandaccount",
            followers: 45200,
            status: "connected",
          },
          {
            id: 2,
            name: "@personalaccount",
            followers: 3700,
            status: "connected",
          },
        ],
        recentDMs: [
          {
            _id: 1,
            senderName: "Sarah M.",
            message: "Love your latest post! 🔥",
            time: "2m ago",
            status: "new",
          },
          {
            _id: 2,
            senderName: "Creative Team",
            message: "Can we collaborate on a campaign?",
            time: "15m ago",
            status: "new",
          },
          {
            _id: 3,
            senderName: "John D.",
            message: "Amazing content quality",
            time: "1h ago",
            status: "read",
          },
        ],
        subscription: {
          plan: {
            name: "Creator Pro",
            limits: { posts: 500, campaigns: 100, storageGb: 500 },
          },
          usage: { posts: 156, campaigns: 23, storageBytes: 125000000 },
          subscription: {
            status: "active",
            expiresAt: new Date(Date.now() + 60 * 86400000),
          },
        },
      });
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

  return (
    <div className="page space-y-6">
      <PageHeader
        title={
          <span className="inline-flex capitalize items-center gap-2">
            {greeting},{" "}
            <div className="bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">
              {user?.name?.split(" ")[0] || "Creator"}
            </div>
            <Image size={28} className="text-pink-600 animate-pulse" />
          </span>
        }
        subtitle="Here's what's happening with your Instagram presence today."
      >
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="btn-secondary gap-2 text-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
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
          title="Followers"
          value={loading ? "—" : (stats.totalFollowers ?? 0).toLocaleString()}
          icon={Users}
          iconColor="text-pink-600"
          iconBg="bg-pink-50 dark:bg-pink-900/20"
          subtitle="Total reach"
        />
        <StatCard
          title="Engagement"
          value={loading ? "—" : `${stats.engagementRate ?? 0}%`}
          icon={Heart}
          iconColor="text-red-600"
          iconBg="bg-red-50 dark:bg-red-900/20"
          subtitle="This month"
        />
        <StatCard
          title="Posts"
          value={loading ? "—" : String(stats.totalPosts ?? 0)}
          icon={Camera}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          subtitle="Published"
        />
        <StatCard
          title="DM Replies"
          value={loading ? "—" : (stats.dmReplies ?? 0).toLocaleString()}
          icon={MessageSquare}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          subtitle="This week"
        />
      </div>

      {/* Chart + Accounts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title text-base">Activity This Week</p>
              <p className="section-subtitle text-xs">Engagements per day</p>
            </div>
            <span className="text-xs text-slate-400">Last 7 days</span>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-pink-600" />
            </div>
          ) : (
            <MessageAreaChart data={data?.weekChart || []} />
          )}
        </div>

        {/* Accounts quick view */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Connected Accounts
            </p>
            <button
              onClick={() => navigate("/instagram/account")}
              className="text-xs text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 size={20} className="animate-spin text-pink-600" />
              </div>
            ) : data?.accounts?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No accounts connected
              </p>
            ) : (
              data?.accounts?.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center flex-shrink-0">
                    <Image size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {a.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {a.followers.toLocaleString()} followers
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate("/instagram/connect")}
              className="btn-secondary w-full btn-sm text-xs gap-2"
            >
              <Plus size={13} /> Connect Account
            </button>
          </div>
        </div>
      </div>

      {/* Subscription card */}
      {!loading && plan && (
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
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
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
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
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/instagram/settings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-600 to-orange-500 text-white hover:opacity-90 transition-all"
            >
              Upgrade Plan
              <ArrowRight size={14} />
            </button>
          </div>

          {usage && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <PlanUsageBar
                label="Posts"
                used={usage.posts ?? 0}
                limit={plan.limits?.posts}
              />
              <PlanUsageBar
                label="Campaigns"
                used={usage.campaigns ?? 0}
                limit={plan.limits?.campaigns}
              />
              <PlanUsageBar
                label="Storage GB"
                used={Math.round((usage.storageBytes ?? 0) / 1073741824)}
                limit={plan.limits?.storageGb}
              />
            </div>
          )}
        </div>
      )}

      {/* Recent DMs */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="section-title text-base">Inbox Messages</p>
            <p className="section-subtitle text-xs">Recent direct messages</p>
          </div>
          <button
            onClick={() => navigate("/instagram/dm")}
            className="text-xs text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={11} />
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={24} className="animate-spin text-pink-600" />
            </div>
          ) : !data?.recentDMs?.length ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <MessageSquare size={28} className="opacity-40" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            data.recentDMs.map((m) => (
              <div
                key={m._id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {m.senderName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{m.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      m.status === "new"
                        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {m.status}
                  </span>
                  <span className="text-[10px] text-slate-400">{m.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            label: "Create Post",
            desc: "Share new content",
            to: "/instagram/posts",
            color: "from-pink-600 to-pink-500",
            icon: Camera,
          },
          {
            label: "View Analytics",
            desc: "Performance insights",
            to: "/instagram/analytics",
            color: "from-purple-600 to-purple-500",
            icon: BarChart3,
          },
          {
            label: "Launch Campaign",
            desc: "Start a new campaign",
            to: "/instagram/campaigns",
            color: "from-orange-500 to-orange-400",
            icon: Zap,
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
