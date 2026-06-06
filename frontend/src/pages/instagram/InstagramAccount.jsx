import { useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  ExternalLink,
  Globe2,
  Image,
  Loader2,
  Link2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { authFetch } from "../../services/authFetch";

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function timeAgo(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusTone(status) {
  if (status === "oauth_connected" || status === "connected") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  }

  if (status === "connecting") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

const initialState = {
  loading: true,
  refreshing: false,
  error: null,
  session: null,
  tokenStatus: null,
};

export default function InstagramAccount() {
  const [state, setState] = useState(initialState);

  const loadAccount = async (showSpinner = false) => {
    setState((prev) => ({
      ...prev,
      loading: showSpinner || prev.session == null,
      refreshing: true,
      error: null,
    }));

    try {
      const [session, tokenDebug] = await Promise.all([
        authFetch("/api/instagram/session"),
        authFetch("/api/instagram/debug/token").catch(() => null),
      ]);

      setState({
        loading: false,
        refreshing: false,
        error: null,
        session: session?.exists ? session : null,
        tokenStatus: tokenDebug?.tokenStatus || null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error.message || "Failed to load Instagram account",
      }));
    }
  };

  useEffect(() => {
    loadAccount(true);
  }, []);

  const session = state.session;
  const graph = session?.graph || {};
  const username = graph.instagramUsername || session?.username || "osho.side";
  const profilePicture = graph.instagramProfilePictureUrl;
  const followers = graph.instagramFollowersCount || 0;
  const posts = graph.instagramMediaCount || 0;
  const linkedPageId = graph.facebookPageId || null;
  const accountId = graph.instagramBusinessAccountId || null;
  const lastSync = graph.lastRefreshed || session?.lastLogin || null;
  const tokenExpiresAt = graph.facebookUserAccessTokenExpiresAt || null;
  const scopes = graph.scopes || [];
  const isConnected =
    session?.status === "oauth_connected" || session?.status === "connected";
  const tokenHealthy = state.tokenStatus?.valid;

  const handleRefresh = async () => {
    await loadAccount(false);
  };

  const handleDisconnect = async () => {
    try {
      setState((prev) => ({ ...prev, refreshing: true, error: null }));
      await authFetch("/api/instagram", { method: "DELETE" });
      await loadAccount(false);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        refreshing: false,
        error: error.message || "Failed to disconnect account",
      }));
    }
  };

  const handleReconnect = () => {
    window.location.href = "/instagram/connect";
  };

  const metrics = [
    {
      label: "Followers",
      value: formatCompactNumber(followers),
      icon: Users,
      accent: "text-fuchsia-600",
      bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    },
    {
      label: "Posts",
      value: formatCompactNumber(posts),
      icon: Camera,
      accent: "text-indigo-600",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
    },
    {
      label: "Last sync",
      value: timeAgo(lastSync),
      icon: RefreshCw,
      accent: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Token",
      value: tokenHealthy ? "Valid" : state.tokenStatus ? "Expired" : "—",
      icon: ShieldCheck,
      accent: tokenHealthy ? "text-emerald-600" : "text-slate-500",
      bg: tokenHealthy
        ? "bg-emerald-50 dark:bg-emerald-500/10"
        : "bg-slate-50 dark:bg-slate-800",
    },
  ];

  if (state.loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-3 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Globe2 size={12} /> Meta Graph API
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                No Instagram account connected
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Connect an Instagram Business Account through Facebook so this
                page can show live follower count, media count, token health,
                and sync status.
              </p>
            </div>
            <button
              onClick={handleReconnect}
              className="btn-primary gap-2 px-4 py-3"
            >
              <ExternalLink size={14} /> Connect with Meta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_34%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.92))] px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={`@${username}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500 via-fuchsia-500 to-amber-400">
                    <Image size={28} className="text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    @{username}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone(
                      session.status,
                    )}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                    {isConnected ? "Live" : "Offline"}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-white/70">
                  Real Instagram Business Account data pulled from Meta Graph
                  API. Only data that can be synced from the connected account
                  is shown here.
                </p>

                <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <BadgeCheck size={14} className="text-emerald-300" />
                    {graph.discoveryMode === "manual"
                      ? "Manual discovery"
                      : "Meta discovered"}
                  </span>
                  {linkedPageId && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <Link2 size={14} className="text-sky-300" />
                      Page {linkedPageId}
                    </span>
                  )}
                  {tokenExpiresAt && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <ShieldCheck size={14} className="text-fuchsia-300" />
                      Token expires {formatDate(tokenExpiresAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRefresh}
                className="btn-secondary gap-2 px-4 py-3"
                disabled={state.refreshing}
              >
                {state.refreshing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Syncing
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} /> Refresh Meta Data
                  </>
                )}
              </button>
              <button
                onClick={handleReconnect}
                className="btn-primary gap-2 px-4 py-3"
              >
                <ExternalLink size={14} /> Reconnect
              </button>
              <button
                onClick={handleDisconnect}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                <Trash2 size={14} /> Disconnect
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4 sm:p-8">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {metric.label}
                  </p>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.bg}`}
                  >
                    <Icon size={18} className={metric.accent} />
                  </div>
                </div>
                <p className={`mt-4 text-2xl font-black ${metric.accent}`}>
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {state.error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Account
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  Live Meta profile
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone(
                  session.status,
                )}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {session.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Instagram Business Account ID
                </p>
                <p className="mt-2 break-all text-sm font-medium text-slate-800 dark:text-slate-200">
                  {accountId || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Facebook Page ID
                </p>
                <p className="mt-2 break-all text-sm font-medium text-slate-800 dark:text-slate-200">
                  {linkedPageId || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Last synced
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(lastSync)} · {timeAgo(lastSync)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Profile picture
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {profilePicture
                    ? "Synced from Meta"
                    : "Not available from API"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Permissions
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    Available Graph scopes
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {scopes.length} granted
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {scopes.length > 0 ? (
                  scopes.map((scope) => (
                    <span
                      key={scope}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {scope}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No scope data returned by the API.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Connection health
            </h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between gap-4">
                <span>Meta session</span>
                <span
                  className={
                    isConnected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500"
                  }
                >
                  {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Token health</span>
                <span
                  className={
                    tokenHealthy
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }
                >
                  {state.tokenStatus
                    ? tokenHealthy
                      ? "Valid"
                      : "Invalid"
                    : "Unavailable"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Discovery mode</span>
                <span className="text-slate-500">
                  {graph.discoveryMode || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              What is shown here
            </h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <p>
                This view only renders values available from the connected Meta
                account.
              </p>
              <p>
                No fake engagement estimates, no editable security controls, and
                no manual activity feed.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
