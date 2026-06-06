import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Smartphone,
  WifiOff,
  Trash2,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Loader,
  Wifi,
  Activity,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Signal,
  PhoneCall,
  Calendar,
  Hash,
  ShieldCheck,
  Zap,
  Lock,
  Copy,
  Check,
  Eye,
  EyeOff,
  MessageSquare,
  Shield,
  KeyRound,
} from "lucide-react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import api from "../../services/api";
import { API_ORIGIN } from "../../config/env";
import {
  LimitExceededModal,
  LimitBanner,
  LockedButton,
  parseLimitError,
} from "../../components/ui/LimitExceeded";

// ── QR Modal ───────────────────────────────────────────────────────────────────
function QrModal({ open, onClose, onConnect, sessionId }) {
  const [step, setStep] = useState("loading");
  const [qrCode, setQrCode] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!open || !sessionId) return;

    setStep("loading");
    setQrCode(null);

    // BUG FIX: use "token" not "authToken" — matches AuthContext key
    socketRef.current = io(API_ORIGIN, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      query: { token: localStorage.getItem("token") },
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join:session", { sessionId });
    });

    socketRef.current.on("qrcode", (data) => {
      setQrCode(data.qr);
      setStep("scan");
    });

    socketRef.current.on("status", (data) => {
      if (data.status === "connected") setStep("success");
    });

    // Fallback: poll QR via REST if socket doesn't deliver in 3s
    const fallback = setTimeout(() => {
      api
        .getSessionQR(sessionId)
        .then((data) => {
          if (data.qr) {
            setQrCode(data.qr);
            setStep("scan");
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      clearTimeout(fallback);
      socketRef.current?.disconnect();
    };
  }, [open, sessionId]);

  const handleClose = () => {
    setStep("loading");
    setQrCode(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Connect WhatsApp"
      size="sm"
      footer={
        step === "success" ? (
          <button
            onClick={() => {
              onConnect();
              handleClose();
            }}
            className="btn-primary btn-sm w-full gap-2"
          >
            <CheckCircle2 size={13} /> Done
          </button>
        ) : (
          <button onClick={handleClose} className="btn-secondary btn-sm w-full">
            Cancel
          </button>
        )
      }
    >
      {step === "loading" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Loader size={28} className="text-primary-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Initializing session…
            </p>
            <p className="text-xs text-slate-400 mt-1">
              This takes a few seconds
            </p>
          </div>
        </div>
      )}

      {step === "scan" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-52 h-52 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
            {qrCode ? (
              <img
                src={qrCode}
                alt="QR Code"
                className="w-full h-full rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <QrCode
                  size={56}
                  className="text-slate-300 dark:text-slate-600"
                  strokeWidth={1}
                />
                <Loader size={14} className="text-primary-400 animate-spin" />
              </div>
            )}
          </div>
          <div className="w-full px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <span className="font-semibold">How to connect:</span>
              <br />
              1. Open WhatsApp → tap ⋮ → Linked Devices
              <br />
              2. Tap "Link a Device"
              <br />
              3. Scan the QR code above
            </p>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-18 h-18 rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-5 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900 dark:text-white text-base">
              Connected!
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Your WhatsApp session is ready to use.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <Signal size={13} className="text-emerald-500" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Session live
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Session Card ───────────────────────────────────────────────────────────────
function SessionCard({ session, onDelete, onReconnect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isConnected = session.status === "connected";
  const isConnecting = session.status === "connecting";
  const shortSessionId = session.sessionId
    ? String(session.sessionId).slice(0, 13)
    : "";

  const copySessionId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(session.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="card p-5 group relative">
      {/* Status stripe */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${isConnected ? "bg-emerald-400" : isConnecting ? "bg-amber-400" : "bg-slate-300 dark:bg-slate-700"}`}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 mt-1">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isConnected
                ? "bg-emerald-50 dark:bg-emerald-900/20"
                : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            {isConnecting ? (
              <Loader size={20} className="text-amber-500 animate-spin" />
            ) : isConnected ? (
              <Smartphone size={20} className="text-emerald-500" />
            ) : (
              <WifiOff size={20} className="text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {session.name}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[140px]">
                {shortSessionId}
              </p>
              <button
                onClick={copySessionId}
                title="Copy session ID"
                className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {copied ? (
                  <Check size={11} className="text-emerald-500" />
                ) : (
                  <Copy size={11} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status badge + menu */}
        <div className="flex items-center gap-2">
          <span
            className={`badge text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isConnected
                ? "badge-green"
                : isConnecting
                  ? "badge-yellow"
                  : "badge-red"
            }`}
          >
            <span
              className={`status-dot ${isConnected ? "status-dot-green" : isConnecting ? "status-dot-yellow" : "status-dot-red"} mr-1`}
            />
            {isConnected ? "Live" : isConnecting ? "Connecting" : "Offline"}
          </span>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-xs">
                {!isConnected && (
                  <button
                    onClick={() => {
                      onReconnect(session.sessionId);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <RefreshCw size={12} className="text-primary-500" />{" "}
                    Reconnect
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(session.sessionId);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                >
                  <Trash2 size={12} /> Delete Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone number */}
      <div className="flex items-center gap-2 mb-4">
        <PhoneCall size={12} className="text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          {session.phoneNumber || session.phone || "Awaiting connection…"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800">
          <p className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
            <Calendar size={9} /> Created
          </p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {new Date(session.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {new Date(session.createdAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800">
          <p className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
            <Clock size={9} /> Last Seen
          </p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {session.lastConnected
              ? new Date(session.lastConnected).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {session.lastConnected
              ? new Date(session.lastConnected).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "—"}
          </p>
        </div>
      </div>

      {/* Action button */}
      {!isConnected ? (
        <button
          onClick={() => onReconnect(session.sessionId)}
          className="btn-primary w-full btn-sm gap-2"
        >
          {isConnecting ? (
            <>
              <Loader size={13} className="animate-spin" /> Connecting…
            </>
          ) : (
            <>
              <RefreshCw size={13} /> Connect WhatsApp
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Connected
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Sessions() {
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [newSessionId, setNewSessionId] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [delId, setDelId] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [enableChatView, setEnableChatView] = useState(false);
  const [chatPassword, setChatPassword] = useState("");
  const [showChatPwd, setShowChatPwd] = useState(false);
  const [limitError, setLimitError] = useState(null); // { resource, used, limit }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadSessions();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id || !token) return;

    const socket = io(API_ORIGIN, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      query: { token },
    });

    socket.on("connect", () => {
      socket.emit("register:user", { userId: user._id });
    });

    socket.on("session:update", (update) => {
      if (!update?.sessionId) return;

      setSessions((prevSessions) => {
        const existingIndex = prevSessions.findIndex(
          (session) => session.sessionId === update.sessionId,
        );

        if (existingIndex >= 0) {
          const nextSessions = [...prevSessions];
          nextSessions[existingIndex] = {
            ...nextSessions[existingIndex],
            ...update,
            phoneNumber:
              update.phoneNumber || nextSessions[existingIndex].phoneNumber,
          };
          return nextSessions;
        }

        return [...prevSessions, update];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token, user?._id]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSessions();
      // BUG FIX: check both data.success and data.data
      if (data.success === false) {
        setError(data.error || "Failed to load sessions");
        setSessions([]);
      } else {
        setSessions(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      setError("Network error — could not load sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const openQrModal = () => {
    setSessionName("");
    setEnableChatView(false);
    setChatPassword("");
    setShowChatPwd(false);
    setShowNameModal(true);
  };

  const createSessionWithName = async () => {
    if (!sessionName.trim()) {
      alert("Please enter a session name");
      return;
    }
    try {
      setCreatingSession(true);
      setShowNameModal(false);
      const data = await api.createSession(sessionName.trim(), {
        enableChatView,
        chatPasscode: enableChatView ? chatPassword : "",
      });
      const limitErr = parseLimitError(data);
      if (limitErr) {
        setLimitError(limitErr);
        return;
      }
      if (data.success === false) {
        setError(data.error || "Failed to create session");
        return;
      }
      setShowQr(true);
      setNewSessionId(data.sessionId || data.data?.sessionId);
    } catch (err) {
      console.error("Failed to create session:", err);
      setShowQr(false);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleConnect = () => {
    loadSessions();
    setNewSessionId(null);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.sessionId !== id));
      setDelId(null);
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleReconnect = async (id) => {
    try {
      await api.reconnectSession(id);
    } catch (err) {
      // session may already be in reconnecting state, proceed to QR anyway
    }
    setNewSessionId(id);
    setShowQr(true);
  };

  // Stats
  const connected = sessions.filter((s) => s.status === "connected").length;
  const disconnected = sessions.filter(
    (s) => s.status === "disconnected",
  ).length;
  const connecting = sessions.filter((s) => s.status === "connecting").length;

  if (loading) {
    return (
      <div className="page flex items-center justify-center">
        <div className="text-center">
          <Loader
            size={32}
            className="text-primary-500 animate-spin mx-auto mb-2"
          />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Loading sessions…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page space-y-5">
      {/* Limit modal */}
      {limitError && (
        <LimitExceededModal
          resource={limitError.resource}
          used={limitError.used}
          limit={limitError.limit}
          onClose={() => setLimitError(null)}
        />
      )}

      <PageHeader
        title="WhatsApp Sessions"
        subtitle={`${sessions.length} sessions · ${connected} active`}
      >
        {limitError ? (
          <LockedButton
            label="Connect Session"
            onClick={() => setLimitError(limitError)}
          />
        ) : (
          <button
            onClick={openQrModal}
            disabled={creatingSession}
            className="btn-primary gap-2 disabled:opacity-50"
          >
            {creatingSession ? (
              <>
                <Loader size={14} className="animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus size={14} /> Connect Session
              </>
            )}
          </button>
        )}
      </PageHeader>

      {/* Limit banner */}
      {limitError && (
        <LimitBanner
          resource={limitError.resource}
          used={limitError.used}
          limit={limitError.limit}
          onUpgrade={() => setLimitError({ ...limitError, _show: true })}
        />
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={loadSessions}
            className="ml-auto text-xs text-red-600 font-medium hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Sessions",
              value: sessions.length,
              icon: Smartphone,
              color: "text-blue-600",
              bg: "bg-blue-50 dark:bg-blue-900/20",
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
              value: connecting,
              icon: Activity,
              color: "text-amber-600",
              bg: "bg-amber-50 dark:bg-amber-900/20",
            },
            {
              label: "Offline",
              value: disconnected,
              icon: WifiOff,
              color: "text-red-500",
              bg: "bg-red-50 dark:bg-red-900/20",
            },
          ].map((s) => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}
              >
                <s.icon size={16} className={s.color} />
              </div>
              <div>
                <p className={`text-2xl font-bold leading-tight ${s.color}`}>
                  {s.value}
                </p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sessions grid */}
      {sessions.length === 0 && !error ? (
        <EmptyState
          icon={Smartphone}
          title="No sessions yet"
          description="Connect your first WhatsApp number to start sending messages and campaigns."
          action={
            <button
              onClick={openQrModal}
              disabled={creatingSession}
              className="btn-primary gap-2 disabled:opacity-50"
            >
              <Plus size={14} /> Connect Session
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <SessionCard
              key={s.sessionId}
              session={s}
              onDelete={(id) => setDelId(id)}
              onReconnect={handleReconnect}
            />
          ))}
          {/* Add card — locked if limit reached */}
          {limitError ? (
            <button
              onClick={() => setLimitError({ ...limitError })}
              className="card p-5 flex flex-col items-center justify-center gap-3 border-dashed border-2 border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10 transition-all cursor-pointer min-h-[240px] group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Lock size={22} className="text-amber-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Session Limit Reached
                </p>
                <p className="text-xs text-amber-500 mt-0.5">
                  {limitError.used}/{limitError.limit} used · Upgrade to add
                  more
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg">
                Upgrade Plan
              </span>
            </button>
          ) : (
            <button
              onClick={openQrModal}
              disabled={creatingSession}
              className="card p-5 flex flex-col items-center justify-center gap-3 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all cursor-pointer min-h-[240px] disabled:opacity-50 group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
                <Plus
                  size={22}
                  className="text-slate-400 group-hover:text-primary-600 transition-colors"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-500 group-hover:text-primary-600 transition-colors">
                  Add Session
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect another WhatsApp number
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Session Name Modal */}
      <Modal
        open={showNameModal}
        onClose={() => setShowNameModal(false)}
        title="Create New Session"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowNameModal(false)}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={createSessionWithName}
              disabled={
                creatingSession || (enableChatView && chatPassword.length < 4)
              }
              className="btn-primary btn-sm disabled:opacity-50"
            >
              {creatingSession ? (
                <>
                  <Loader size={13} className="animate-spin" /> Creating...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Session name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Session Name
            </label>
            <input
              type="text"
              placeholder="e.g. Business WhatsApp, Support Team"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createSessionWithName()}
              autoFocus
              className="input"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Give this session a descriptive name to identify it later.
            </p>
          </div>

          {/* Chat View toggle card */}
          <div
            className={`rounded-xl border-2 transition-colors overflow-hidden ${enableChatView ? "border-primary-400 dark:border-primary-600" : "border-slate-200 dark:border-slate-700"}`}
          >
            {/* Toggle row */}
            <div
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none ${enableChatView ? "bg-primary-50 dark:bg-primary-900/20" : "bg-slate-50 dark:bg-slate-800/50"}`}
              onClick={() => {
                setEnableChatView((v) => !v);
                setChatPassword("");
              }}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${enableChatView ? "bg-primary-100 dark:bg-primary-900/40" : "bg-white dark:bg-slate-700"}`}
              >
                <MessageSquare
                  size={16}
                  className={
                    enableChatView ? "text-primary-600" : "text-slate-400"
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-semibold ${enableChatView ? "text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-300"}`}
                >
                  Enable WhatsApp Chat View
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  View incoming &amp; outgoing messages in Chats page
                </p>
              </div>
              {/* Toggle switch */}
              <div
                className={`relative w-10 h-5.5 flex-shrink-0 rounded-full transition-colors duration-200 ${enableChatView ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                style={{ height: "22px", width: "40px" }}
              >
                <span
                  className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${enableChatView ? "translate-x-[18px]" : "translate-x-0.5"}`}
                  style={{ width: "18px", height: "18px", top: "2px" }}
                />
              </div>
            </div>

            {/* Password section — visible when enabled */}
            {enableChatView && (
              <div className="px-4 pb-4 pt-3 border-t border-primary-100 dark:border-primary-900/40 bg-white dark:bg-slate-900 space-y-3">
                {/* Info banner */}
                <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                  <Shield
                    size={13}
                    className="text-blue-500 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    Set a password to protect your chat inbox. You'll need it
                    every time you switch sessions in the Chats page.
                  </p>
                </div>

                {/* Password input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <KeyRound size={11} className="text-primary-500" /> Chat
                    Lock Password
                  </label>
                  <div className="relative">
                    <input
                      type={showChatPwd ? "text" : "password"}
                      placeholder="Minimum 4 characters"
                      value={chatPassword}
                      onChange={(e) => setChatPassword(e.target.value)}
                      className="input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChatPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showChatPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {chatPassword.length > 0 && chatPassword.length < 4 && (
                    <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> At least 4 characters required
                    </p>
                  )}
                  {chatPassword.length >= 4 && (
                    <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1">
                      <Check size={10} /> Password set — chats will be secured
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* QR Modal */}
      <QrModal
        open={showQr}
        onClose={() => {
          setShowQr(false);
          setNewSessionId(null);
        }}
        onConnect={handleConnect}
        sessionId={newSessionId}
      />

      {/* Delete confirm */}
      <Modal
        open={!!delId}
        onClose={() => setDelId(null)}
        title="Delete Session"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDelId(null)}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(delId)}
              className="btn-sm px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Delete session{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {delId}
          </span>
          ? All associated data will be permanently removed.
        </p>
      </Modal>
    </div>
  );
}
