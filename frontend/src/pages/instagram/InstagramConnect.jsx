import { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Camera,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { authFetch } from "../../services/authFetch";

// sessions will be fetched from backend; initialize empty
const initialSessions = [];

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function timeAgo(date) {
  if (!date) return "—";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function InstagramSessionCard({ session, onReconnect, onDelete }) {
  const isConnected =
    session.status === "connected" || session.status === "oauth_connected";
  const isConnecting = session.status === "connecting";

  return (
    <div className="card group relative p-5">
      <div
        className={`absolute left-0 right-0 top-0 h-1 rounded-t-2xl ${isConnected ? "bg-emerald-400" : isConnecting ? "bg-amber-400" : "bg-slate-300 dark:bg-slate-700"}`}
      />

      <div className="mb-4 mt-1 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${isConnected ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            {isConnecting ? (
              <Loader2 size={20} className="animate-spin text-amber-500" />
            ) : isConnected ? (
              <Camera size={20} className="text-emerald-500" />
            ) : (
              <WifiOff size={20} className="text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {session.name}
            </p>
            <p className="truncate text-xs text-slate-400">{session.handle}</p>
          </div>
        </div>

        <span
          className={`badge px-2 py-0.5 text-[10px] font-semibold ${isConnected ? "badge-green" : isConnecting ? "badge-yellow" : "badge-red"}`}
        >
          <span
            className={`status-dot mr-1 ${isConnected ? "status-dot-green" : isConnecting ? "status-dot-yellow" : "status-dot-red"}`}
          />
          {isConnected ? "Live" : isConnecting ? "Connecting" : "Offline"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] text-slate-400">
            <Users size={9} /> Followers
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {formatNumber(session.followers)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] text-slate-400">
            <BarChart3 size={9} /> Posts
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {formatNumber(session.posts)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] text-slate-400">
            <Clock size={9} /> Created
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {timeAgo(session.createdAt)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] text-slate-400">
            <Activity size={9} /> Active
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {timeAgo(session.lastActive)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isConnected ? (
          <button
            onClick={() => onReconnect(session.id)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-transform hover:-translate-y-0.5"
          >
            {isConnecting ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Reconnecting
              </>
            ) : (
              <>
                <RefreshCw size={12} /> Reconnect
              </>
            )}
          </button>
        ) : (
          <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/10 dark:text-emerald-400">
            <Check size={12} /> Connected
          </button>
        )}
        <button
          onClick={() => onDelete(session.id)}
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:border-slate-700 dark:hover:bg-red-900/20"
          title="Remove session"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function InstagramConnect() {
  const [sessions, setSessions] = useState(initialSessions);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const connected = sessions.filter(
    (session) =>
      session.status === "connected" || session.status === "oauth_connected",
  ).length;
  const connectingCount = sessions.filter(
    (session) => session.status === "connecting",
  ).length;
  const offline = sessions.filter(
    (session) =>
      session.status === "offline" || session.status === "disconnected",
  ).length;
  const totalFollowers = sessions.reduce(
    (sum, session) => sum + session.followers,
    0,
  );

  // Check URL for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthError = params.get("oauth_error");
    if (oauthSuccess) {
      setSuccessMessage("Instagram account connected successfully!");
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh session status
      fetchSessionStatus();
    }
    if (oauthError) {
      setError(`OAuth failed: ${oauthError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // fetch session status once on mount
  const fetchSessionStatus = async () => {
    try {
      const json = await authFetch("/api/instagram/session");
      if (json.exists) {
        const sessionData = {
          id: `ig-${json.username}`,
          name: json.username,
          handle: `@${json.username}`,
          status: json.status,
          followers: json.graph?.instagramFollowersCount || 0,
          posts: json.graph?.instagramMediaCount || 0,
          lastActive: json.lastLogin || new Date().toISOString(),
          createdAt: json.lastLogin || new Date().toISOString(),
        };
        setSessions([sessionData]);
      } else {
        setSessions([]);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchSessionStatus();
  }, []);

  const handleDelete = async (id) => {
    try {
      await authFetch("/api/instagram", { method: "DELETE" });
      setSessions([]);
    } catch (e) {
      setError("Failed to delete session");
    }
  };

  const handleReconnect = (id) => {
    // For OAuth, reconnecting means initiating OAuth again
    initiateOAuth();
  };

  const initiateOAuth = async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await authFetch("/api/instagram/oauth/initiate");
      const { oauth_url } = response;
      // Redirect user to Facebook OAuth page
      window.location.href = oauth_url;
    } catch (err) {
      setError("Failed to start OAuth flow. Please try again.");
      setConnecting(false);
    }
  };

  const openConnectModal = () => {
    setShowConnectModal(true);
  };

  const closeConnectModal = () => {
    setShowConnectModal(false);
    setError(null);
  };

  return (
    <div className="page space-y-5">
      <PageHeader
        title="Instagram Sessions"
        subtitle={`${sessions.length} sessions · ${connected} active`}
      >
        <button
          onClick={initiateOAuth}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold"
          disabled={connecting}
        >
          {connecting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Connecting...
            </>
          ) : (
            <>
              <Plus size={14} /> Connect with Facebook
            </>
          )}
        </button>
      </PageHeader>

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
          <Check size={15} className="flex-shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {successMessage}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Sessions",
            value: sessions.length,
            icon: Camera,
            color: "text-pink-600",
            bg: "bg-pink-50 dark:bg-pink-900/20",
          },
          {
            label: "Active",
            value: connected,
            icon: Wifi,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: "Connecting",
            value: connectingCount,
            icon: Activity,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: "Followers",
            value: formatNumber(totalFollowers),
            icon: Users,
            color: "text-violet-600",
            bg: "bg-violet-50 dark:bg-violet-900/20",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card flex items-center gap-3 p-4">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${card.bg}`}
              >
                <Icon size={16} className={card.color} />
              </div>
              <div>
                <p className={`text-2xl font-bold leading-tight ${card.color}`}>
                  {card.value}
                </p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 ">
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No Instagram sessions yet"
              description="Connect your Instagram Business Account via Facebook OAuth to manage posts, comments, and analytics."
              action={
                <button
                  onClick={initiateOAuth}
                  className="btn-primary gap-2"
                  disabled={connecting}
                >
                  {connecting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />{" "}
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Connect with Facebook
                    </>
                  )}
                </button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => (
                <InstagramSessionCard
                  key={session.id}
                  session={session}
                  onReconnect={handleReconnect}
                  onDelete={handleDelete}
                />
              ))}

              <button
                onClick={initiateOAuth}
                className="card group flex min-h-[236px] cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 bg-white p-5 transition-all hover:border-pink-400 hover:bg-pink-50/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-pink-600 dark:hover:bg-pink-900/10"
                disabled={connecting}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-pink-100 dark:bg-slate-800 dark:group-hover:bg-pink-900/30">
                  {connecting ? (
                    <Loader2 size={22} className="animate-spin text-pink-600" />
                  ) : (
                    <Plus
                      size={22}
                      className="text-slate-400 group-hover:text-pink-600"
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-500 group-hover:text-pink-600">
                    {connecting ? "Connecting..." : "Add Session"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Connect another Instagram account
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showConnectModal}
        onClose={closeConnectModal}
        title="Connect Instagram Account"
        size="sm"
        footer={
          <>
            <button
              onClick={closeConnectModal}
              className="btn-secondary btn-sm inline-flex items-center gap-2 rounded-full px-3 py-2"
            >
              Cancel
            </button>
            <button
              onClick={initiateOAuth}
              disabled={connecting}
              className="btn-primary btn-sm inline-flex items-center gap-2 rounded-full px-3 py-2 disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <ExternalLink size={13} /> Continue to Facebook
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-900/20">
            <div className="flex items-start gap-2">
              <Shield size={14} className="mt-0.5 text-amber-600" />
              <div className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                <p className="font-semibold">🔐 OAuth Connection</p>
                <p className="mt-1">
                  You will be redirected to Facebook to authorize our app to
                  access your Instagram Business Account.
                </p>
                <p className="mt-1">
                  Required permissions: Instagram Basic, Manage Comments, Pages
                  Read Engagement.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 text-pink-500" />
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Your Instagram account must be linked to a Facebook Page. If you
                haven't done this yet, please set it up in Facebook Business
                Manager first.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
