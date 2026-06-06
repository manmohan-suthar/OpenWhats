import { useState, useEffect, useRef } from "react";
import {
  Megaphone,
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  RotateCw,
  BarChart2,
  Calendar,
  StopCircle,
  Eye,
  Grid,
  List,
  Send,
  AlertTriangle,
  Zap,
  MessageSquare,
  ArrowRight,
  Bell,
  Upload,
  Image as ImageIcon,
  Folder,
  FolderOpen,
  ChevronRight,
  X,
  Timer,
  CalendarClock,
  Shuffle,
  TrendingUp,
  Activity,
  Loader,
  AlertCircle,
  RefreshCw,
  Target,
  FileText,
  Music,
  Video,
  File as FileIcon,
  RotateCcw,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import {
  LimitExceededModal,
  LockedButton,
  parseLimitError,
} from "../../components/ui/LimitExceeded";
import { resolveApiUrl } from "../../config/env";
import { authFetch } from "../../services/authFetch";
import { mediaService } from "../../services/mediaService";

// ── Constants ──────────────────────────────────────────────────────────────────
const CAMPAIGN_TYPES = [
  {
    id: "broadcast",
    label: "Broadcast",
    icon: Megaphone,
    description: "Send to multiple contacts",
  },
  {
    id: "notification",
    label: "Notification",
    icon: Bell,
    description: "Important alerts",
  },
  {
    id: "reminder",
    label: "Reminder",
    icon: Clock,
    description: "Scheduled reminders",
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Zap,
    description: "Marketing campaigns",
  },
];

const statusConfig = {
  running: {
    badge: "badge-green",
    dot: "status-dot-green",
    label: "Running",
    icon: Play,
    color: "emerald",
  },
  completed: {
    badge: "badge-blue",
    dot: "status-dot-slate",
    label: "Completed",
    icon: CheckCircle2,
    color: "blue",
  },
  scheduled: {
    badge: "badge-yellow",
    dot: "status-dot-yellow",
    label: "Scheduled",
    icon: CalendarClock,
    color: "amber",
  },
  paused: {
    badge: "badge-slate",
    dot: "status-dot-slate",
    label: "Paused",
    icon: Pause,
    color: "slate",
  },
  failed: {
    badge: "badge-red",
    dot: "status-dot-red",
    label: "Failed",
    icon: XCircle,
    color: "red",
  },
  draft: {
    badge: "badge-slate",
    dot: "status-dot-slate",
    label: "Draft",
    icon: Eye,
    color: "slate",
  },
};

// ── Progress Bar ───────────────────────────────────────────────────────────────
function ProgressBar({ value, status }) {
  const color =
    status === "failed"
      ? "bg-red-500"
      : status === "completed"
        ? "bg-emerald-500"
        : status === "paused"
          ? "bg-slate-400"
          : "bg-primary-500";
  return (
    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ── Campaign Card ──────────────────────────────────────────────────────────────
function CampaignCard({
  campaign,
  sessions,
  onStart,
  onPause,
  onResume,
  onRetry,
  onRestart,
  onDelete,
  onView,
  onEditSchedule,
  onChangeSession,
  updatingSessionId,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sc = statusConfig[campaign.status] || statusConfig.draft;
  const typeInfo = CAMPAIGN_TYPES.find((t) => t.id === campaign.type);
  const TypeIcon = typeInfo?.icon || Megaphone;
  const total = campaign.stats?.total || 0;
  const sent = campaign.stats?.sent || 0;
  const delivered = campaign.stats?.delivered || 0;
  const failed = campaign.stats?.failed || 0;
  const sessionOptions = getCampaignSessionOptions(campaign, sessions);
  const activeSessionKey = String(
    getSessionKey(campaign.sessionId) || getSessionKey(sessionOptions[0]) || "",
  );
  const activeSession =
    sessionOptions.find(
      (session) => String(getSessionKey(session)) === activeSessionKey,
    ) ||
    campaign.sessionId ||
    sessionOptions[0] ||
    null;
  const activeSessionLabel = getSessionLabel(activeSession);
  const isSessionUpdating = updatingSessionId === campaign._id;

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="card  group flex flex-col h-full">
      {/* Top color stripe */}
      <div
        className={`h-1 flex-shrink-0 ${sc.color === "emerald" ? "bg-emerald-400" : sc.color === "blue" ? "bg-blue-400" : sc.color === "amber" ? "bg-amber-400" : sc.color === "red" ? "bg-red-400" : "bg-slate-200 dark:bg-slate-700"}`}
      />

      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
              <TypeIcon size={15} className="text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {campaign.name}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-[10px] text-slate-400">
                  <span className="inline-flex max-w-[170px] items-center gap-1.5 ">
                    {sessionOptions.length > 1 && (
                      <span className="inline-flex items-center gap-1 ">
                        <Shuffle size={9} className="text-primary-500" />
                        {sessionOptions.length}{" "}
                        <span className="truncate">{activeSessionLabel}</span>
                      </span>
                    )}
                  </span>
                </p>
                {campaign.multiSession?.enabled &&
                  campaign.sessions?.length > 1 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-[9px] font-semibold rounded-full border border-violet-200 dark:border-violet-800">
                      <Shuffle size={8} />
                      {campaign.sessions.length} sessions ·{" "}
                      {campaign.multiSession.mode === "round-robin"
                        ? "RR"
                        : "Split"}
                    </span>
                  )}
                {campaign.repeat?.enabled && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[9px] font-semibold rounded-full border border-primary-200 dark:border-primary-800">
                    <RefreshCw size={8} />
                    {campaign.repeat.type === "daily" &&
                      `Daily ${campaign.repeat.time}`}
                    {campaign.repeat.type === "weekly" &&
                      `Weekly ${campaign.repeat.time}`}
                    {campaign.repeat.type === "monthly" &&
                      `Monthly ${campaign.repeat.time}`}
                  </span>
                )}
                {campaign.status === "scheduled" && campaign.scheduledFor && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[9px] font-semibold rounded-full border border-amber-200 dark:border-amber-800">
                    <CalendarClock size={8} />
                    {new Date(campaign.scheduledFor).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {sessionOptions.length > 0 && (
                <div
                  className="mt-2 flex flex-wrap items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                ></div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`badge text-[10px] ${sc.badge}`}>
              <span className={`status-dot ${sc.dot} mr-1`} />
              {sc.label}
            </span>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen((p) => !p)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <MoreHorizontal size={13} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 text-xs shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  {sessionOptions.length > 0 && (
                    <div className="px-3 pb-1.5 pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Change Session
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        Current: {activeSessionLabel}
                      </p>
                    </div>
                  )}
                  {sessionOptions.length > 0 && (
                    <div className="max-h-44 space-y-1 overflow-y-auto px-2 pb-1">
                      {sessionOptions.map((session, idx) => {
                        const key = String(getSessionKey(session));
                        const isActive = key === activeSessionKey;
                        return (
                          <button
                            key={key || idx}
                            type="button"
                            onClick={() => {
                              if (key && !isActive) {
                                onChangeSession(campaign._id, key);
                              }
                              setMenuOpen(false);
                            }}
                            disabled={isSessionUpdating}
                            className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all ${isActive ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"} ${isSessionUpdating ? "opacity-60 cursor-wait" : ""}`}
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
                              >
                                <Users size={12} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-semibold">
                                  {getSessionLabel(session)}
                                </p>
                                <p className="truncate text-[10px] text-slate-400">
                                  {session.phoneNumber ||
                                    session.name ||
                                    session.sessionId ||
                                    `Session ${idx + 1}`}
                                </p>
                              </div>
                            </div>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-emerald-600 shadow-sm dark:bg-slate-950 dark:text-emerald-300 dark:shadow-none">
                                <CheckCircle2 size={9} /> Active
                              </span>
                            ) : isSessionUpdating ? (
                              <Loader
                                size={10}
                                className="animate-spin text-primary-500"
                              />
                            ) : (
                              <span className="text-[9px] font-semibold text-primary-600 opacity-80">
                                Switch
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {campaign.status === "draft" && (
                    <button
                      onClick={() => {
                        onStart();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-primary-600"
                    >
                      <Play size={12} /> Start
                    </button>
                  )}
                  {campaign.status === "running" && (
                    <button
                      onClick={() => {
                        onPause();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-600"
                    >
                      <Pause size={12} /> Pause
                    </button>
                  )}
                  {campaign.status === "paused" && (
                    <button
                      onClick={() => {
                        onResume();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-primary-600"
                    >
                      <Play size={12} /> Resume
                    </button>
                  )}
                  {campaign.status === "failed" && (
                    <button
                      onClick={() => {
                        onRetry();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600"
                    >
                      <RotateCw size={12} /> Retry
                    </button>
                  )}
                  {(campaign.status === "completed" ||
                    campaign.status === "failed" ||
                    campaign.status === "paused") && (
                    <button
                      onClick={() => {
                        onRestart();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-600"
                    >
                      <RotateCcw size={12} /> Restart
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onEditSchedule();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <CalendarClock size={12} /> Edit Schedule
                  </button>
                  <button
                    onClick={() => {
                      onView();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <BarChart2 size={12} /> Report
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp-style message preview */}
        <div
          className="mb-3 rounded-xl overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]"
          style={{ minHeight: "88px", maxHeight: "140px" }}
        >
          <div className="flex flex-col h-full justify-end px-2 py-1.5 gap-1">
            {/* Multi-media grid (up to 4 thumbnails) */}
            {(() => {
              const allMedia =
                campaign.mediaFiles?.length > 0
                  ? campaign.mediaFiles
                  : campaign.mediaUrl
                    ? [
                        {
                          url: campaign.mediaUrl,
                          type: campaign.mediaType,
                          name: campaign.mediaName,
                        },
                      ]
                    : [];
              if (allMedia.length === 0) {
                return (
                  <div className="flex justify-end">
                    <div className="max-w-[92%] bg-[#d1f7bf] dark:bg-[#005c4b] rounded-2xl rounded-tr-none shadow-sm px-2 py-1.5">
                      <p className="text-[11px] text-slate-800 dark:text-[#e5e5e5] line-clamp-3 break-words leading-tight">
                        {campaign.message}
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 text-right flex items-center justify-end gap-0.5 mt-0.5">
                        {new Date(campaign.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <span className="text-[#34b7f1]">✓✓</span>
                      </p>
                    </div>
                  </div>
                );
              }
              if (allMedia.length === 1) {
                const m = allMedia[0];
                const Icon = TYPE_ICON[m.type] || FileIcon;
                return (
                  <div className="flex justify-end">
                    <div className="max-w-[92%] bg-[#d1f7bf] dark:bg-[#005c4b] rounded-2xl rounded-tr-none shadow-sm overflow-hidden flex flex-col">
                      {m.type === "image" ? (
                        <img
                          src={resolveMediaUrl(m.url)}
                          alt={m.name}
                          className="w-full object-cover flex-shrink-0"
                          style={{ height: "64px" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#b2f0a0] dark:bg-[#004a3a] flex-shrink-0">
                          <Icon
                            size={13}
                            className="text-slate-600 dark:text-slate-300 flex-shrink-0"
                          />
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                            {m.name}
                          </span>
                        </div>
                      )}
                      <div className="px-2 py-1">
                        <p className="text-[11px] text-slate-800 dark:text-[#e5e5e5] line-clamp-1 break-words leading-tight">
                          {campaign.message}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 text-right flex items-center justify-end gap-0.5 mt-0.5">
                          {new Date(campaign.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <span className="text-[#34b7f1]">✓✓</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              // Multiple media: show thumbnail grid
              const visible = allMedia.slice(0, 4);
              const extra = allMedia.length - 4;
              return (
                <div className="flex justify-end">
                  <div className="max-w-[92%] bg-[#d1f7bf] dark:bg-[#005c4b] rounded-2xl rounded-tr-none shadow-sm overflow-hidden">
                    <div
                      className={`grid gap-0.5 p-0.5 ${visible.length >= 4 ? "grid-cols-2" : `grid-cols-${visible.length}`}`}
                      style={{ maxHeight: "80px" }}
                    >
                      {visible.map((m, i) => {
                        const Icon = TYPE_ICON[m.type] || FileIcon;
                        const isLast = i === 3 && extra > 0;
                        return (
                          <div
                            key={i}
                            className="relative bg-[#b2f0a0] dark:bg-[#004a3a] rounded overflow-hidden flex items-center justify-center"
                            style={{ height: "38px" }}
                          >
                            {m.type === "image" ? (
                              <img
                                src={resolveMediaUrl(m.url)}
                                alt={m.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <Icon
                                size={14}
                                className="text-slate-600 dark:text-slate-300"
                              />
                            )}
                            {isLast && extra > 0 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold">
                                  +{extra + 1}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-2 py-1 flex items-center justify-between">
                      <p className="text-[10px] text-slate-600 dark:text-slate-300">
                        {allMedia.length} files
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                        {new Date(campaign.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <span className="text-[#34b7f1]">✓✓</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 flex items-center gap-1">
              <Users size={9} /> {total} contacts
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {campaign.progress || 0}%
            </span>
          </div>
          <ProgressBar
            value={campaign.progress || 0}
            status={campaign.status}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 mb-3">
          {[
            {
              label: "Sent",
              value: sent,
              color: "text-slate-700 dark:text-slate-300",
            },
            { label: "Delivered", value: delivered, color: "text-emerald-600" },
            { label: "Failed", value: failed, color: "text-red-500" },
            {
              label: "Pending",
              value: Math.max(0, total - sent),
              color: "text-amber-600",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-xs font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTA — pushed to bottom */}
        <div className="mt-auto">
          {campaign.status === "draft" ? (
            <button
              onClick={onStart}
              className="w-full btn-primary btn-sm gap-1.5"
            >
              <Play size={11} /> Start Campaign
            </button>
          ) : campaign.status === "completed" ||
            campaign.status === "failed" ? (
            <div className="flex gap-2">
              <button
                onClick={onRestart}
                className="flex-1 btn-secondary btn-sm gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <RotateCcw size={11} /> Restart
              </button>
              <button
                onClick={onView}
                className="flex-1 btn-secondary btn-sm gap-1"
              >
                <BarChart2 size={11} /> Report
              </button>
            </div>
          ) : (
            <button
              onClick={onView}
              className="w-full btn-secondary btn-sm gap-1.5"
            >
              <BarChart2 size={11} /> View Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Campaign Details Modal ─────────────────────────────────────────────────────
function CampaignDetailsModal({ campaign, onClose, onPause, onResume }) {
  const [showLogs, setShowLogs] = useState(false);

  if (!campaign) return null;

  const sc = statusConfig[campaign.status] || statusConfig.draft;
  const stats = campaign.stats || {
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
  };

  const deliveryRate =
    stats.total > 0
      ? (((stats.delivered || 0) / stats.total) * 100).toFixed(1)
      : 0;

  const successRate =
    stats.sent > 0
      ? (((stats.delivered || 0) / stats.sent) * 100).toFixed(1)
      : 0;

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Modal
      open={!!campaign}
      onClose={onClose}
      title={`${campaign.name} — Report`}
      size="lg"
      footer={
        <div className="flex gap-2 ml-auto">
          <button onClick={onClose} className="btn-secondary btn-sm">
            Close
          </button>
          {campaign.status === "running" && (
            <button
              onClick={() => {
                onPause();
                onClose();
              }}
              className="btn-secondary btn-sm gap-2"
            >
              <Pause size={13} /> Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={() => {
                onResume();
                onClose();
              }}
              className="btn-primary btn-sm gap-2"
            >
              <Play size={13} /> Resume
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Section with Status & Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Status
            </p>
            <div className="flex items-center gap-3">
              <span className={`badge ${sc.badge} text-xs`}>
                <span className={`status-dot ${sc.dot} mr-1`} />
                {sc.label}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {campaign.status === "running" && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Progress
              </p>
              <div className="space-y-1.5">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                    style={{ width: `${campaign.progress || 0}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {campaign.progress || 0}% Complete
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "Total Recipients",
              value: stats.total,
              icon: Users,
              bg: "bg-blue-50 dark:bg-blue-900/20",
              text: "text-blue-600 dark:text-blue-400",
              border: "border-blue-200 dark:border-blue-900/50",
            },
            {
              label: "Pending",
              value: stats.pending || 0,
              icon: Clock,
              bg: "bg-amber-50 dark:bg-amber-900/20",
              text: "text-amber-600 dark:text-amber-400",
              border: "border-amber-200 dark:border-amber-900/50",
            },
            {
              label: "Sent",
              value: stats.sent,
              icon: Send,
              bg: "bg-indigo-50 dark:bg-indigo-900/20",
              text: "text-indigo-600 dark:text-indigo-400",
              border: "border-indigo-200 dark:border-indigo-900/50",
            },
            {
              label: "Delivered",
              value: stats.delivered,
              icon: CheckCircle2,
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
              text: "text-emerald-600 dark:text-emerald-400",
              border: "border-emerald-200 dark:border-emerald-900/50",
            },
            {
              label: "Failed",
              value: stats.failed,
              icon: XCircle,
              bg: "bg-red-50 dark:bg-red-900/20",
              text: "text-red-600 dark:text-red-400",
              border: "border-red-200 dark:border-red-900/50",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={`${s.bg} border ${s.border} rounded-xl p-4 text-center transition-all hover:shadow-sm`}
              >
                <div className={`flex justify-center mb-2 ${s.text}`}>
                  <Icon size={16} />
                </div>
                <p className={`text-2xl md:text-3xl font-bold ${s.text}`}>
                  {s.value}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Key Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Delivery Rate */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Delivery Rate
                </p>
                {stats.total > 0 ? (
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {deliveryRate}%
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-slate-400 dark:text-slate-500 mt-1">
                    N/A
                  </p>
                )}
              </div>
              <TrendingUp
                className="text-emerald-600 dark:text-emerald-400"
                size={24}
              />
            </div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full transition-all duration-300"
                style={{ width: `${parseFloat(deliveryRate)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {stats.sent > 0 ? (
                <>
                  {stats.delivered} of {stats.sent} messages delivered
                </>
              ) : stats.pending > 0 ? (
                <>{stats.pending} waiting to be sent</>
              ) : (
                <>No messages to deliver</>
              )}
            </p>
          </div>

          {/* Success Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Success Rate
                </p>
                {stats.sent > 0 ? (
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {successRate}%
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-slate-400 dark:text-slate-500 mt-1">
                    N/A
                  </p>
                )}
              </div>
              <Activity
                className="text-blue-600 dark:text-blue-400"
                size={24}
              />
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                style={{
                  width: `${stats.sent > 0 ? parseFloat(successRate) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {stats.sent > 0 ? (
                <>Based on {stats.sent} total sent messages</>
              ) : stats.pending > 0 ? (
                <>Waiting for campaign to start sending</>
              ) : (
                <>No data available</>
              )}
            </p>
          </div>
        </div>

        {/* Message Preview */}
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            Message
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {campaign.message}
          </p>
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              Type
            </p>
            <p className="text-slate-700 dark:text-slate-300 capitalize font-medium">
              {campaign.type}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              Created
            </p>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {new Date(campaign.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          {campaign.completedAt && (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                Duration
              </p>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {formatDuration(
                  new Date(campaign.completedAt) - new Date(campaign.createdAt),
                )}
              </p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {campaign.messageLog && campaign.messageLog.length > 0 && (
          <div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare
                  size={14}
                  className="text-slate-600 dark:text-slate-400"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Recent Activity
                </span>
                <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full px-2 py-0.5 font-medium">
                  {campaign.messageLog.length}
                </span>
              </div>
              <ChevronRight
                size={14}
                className={`text-slate-500 transition-transform ${showLogs ? "rotate-90" : ""}`}
              />
            </button>

            {showLogs && (
              <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  {campaign.messageLog
                    .slice(-10)
                    .reverse()
                    .map((log, i) => {
                      const statusColor =
                        log.status === "delivered"
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                          : log.status === "sent"
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                            : log.status === "failed"
                              ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                              : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";

                      return (
                        <div
                          key={i}
                          className={`px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0 flex items-center justify-between text-xs ${
                            i % 2 === 0
                              ? "bg-slate-50 dark:bg-slate-800"
                              : "bg-white dark:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-700 dark:text-slate-300 font-medium truncate">
                              {log.phoneNumber}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <span
                            className={`${statusColor} px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0 capitalize`}
                          >
                            {log.status}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Media Picker Modal ─────────────────────────────────────────────────────────
const MEDIA_COLORS = {
  blue: {
    bg: "bg-blue-500",
    light: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600",
  },
  emerald: {
    bg: "bg-emerald-500",
    light: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600",
  },
  violet: {
    bg: "bg-violet-500",
    light: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-600",
  },
  amber: {
    bg: "bg-amber-500",
    light: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600",
  },
  rose: {
    bg: "bg-rose-500",
    light: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-600",
  },
  cyan: {
    bg: "bg-cyan-500",
    light: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-600",
  },
};
const TYPE_ICON = {
  image: ImageIcon,
  pdf: FileText,
  video: Activity,
  document: AlertCircle,
  audio: Bell,
};

function getSessionKey(session) {
  if (!session) return "";
  if (typeof session === "string") return session;
  const directKey = session._id || session.id || session.sessionId;
  if (directKey) return String(directKey);
  if (typeof session.toString === "function") {
    const fallback = session.toString();
    if (fallback && fallback !== "[object Object]") return String(fallback);
  }
  return "";
}

function getSessionLabel(session) {
  if (!session) return "Unknown session";
  if (typeof session === "string") {
    return session.length > 18
      ? `${session.slice(0, 7)}…${session.slice(-4)}`
      : session;
  }
  return (
    session.phone ||
    session.phoneNumber ||
    session.name ||
    session.sessionId ||
    "Session"
  );
}

function getCampaignSessionOptions(campaign, availableSessions = []) {
  const source =
    Array.isArray(campaign.sessions) && campaign.sessions.length > 0
      ? campaign.sessions
      : campaign.sessionId
        ? [campaign.sessionId]
        : [];

  const lookup = new Map(
    availableSessions.map((session) => [
      String(getSessionKey(session)),
      session,
    ]),
  );
  const options = [];

  source.forEach((sessionRef) => {
    const key = String(getSessionKey(sessionRef));
    if (!key || options.some((item) => String(getSessionKey(item)) === key))
      return;
    options.push(lookup.get(key) || sessionRef);
  });

  // Always allow switching to any currently connected session.
  availableSessions.forEach((session) => {
    const key = String(getSessionKey(session));
    if (!key || options.some((item) => String(getSessionKey(item)) === key))
      return;
    options.push(session);
  });

  if (campaign.sessionId) {
    const activeKey = String(getSessionKey(campaign.sessionId));
    if (
      activeKey &&
      !options.some((item) => String(getSessionKey(item)) === activeKey)
    ) {
      options.unshift(lookup.get(activeKey) || campaign.sessionId);
    }
  }

  return options;
}

function resolveMediaUrl(fileUrl) {
  if (!fileUrl) return "";
  if (
    fileUrl.startsWith("data:") ||
    fileUrl.startsWith("http://") ||
    fileUrl.startsWith("https://")
  ) {
    return fileUrl;
  }
  return resolveApiUrl(fileUrl);
}

function MediaPickerModal({ open, onClose, onConfirm }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCol, setActiveCol] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Map()); // id → file

  useEffect(() => {
    if (!open) return;
    setActiveCol(null);
    setActiveSub(null);
    setSearch("");
    setSelected(new Map());
    setLoading(true);
    mediaService
      .getCollections()
      .then((d) =>
        setCollections(
          Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : [],
        ),
      )
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, [open]);

  const toggleFile = (file) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(file.id)) next.delete(file.id);
      else next.set(file.id, file);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size > 0) onConfirm(Array.from(selected.values()));
  };

  const level = activeSub ? "files" : activeCol ? "subfolders" : "collections";

  const allFiles = () => {
    if (activeSub) return activeSub.media || [];
    if (activeCol)
      return [
        ...(activeCol.media || []),
        ...activeCol.subcollections.flatMap((s) => s.media || []),
      ];
    return [];
  };

  const filtered = allFiles().filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => {
                setActiveCol(null);
                setActiveSub(null);
              }}
              className={`flex items-center gap-1 ${!activeCol ? "font-semibold text-slate-800 dark:text-slate-200" : "hover:text-primary-600"}`}
            >
              <Folder size={12} /> Media
            </button>
            {activeCol && (
              <>
                <ChevronRight size={11} className="text-slate-300" />
                <button
                  onClick={() => setActiveSub(null)}
                  className={`${!activeSub ? "font-semibold text-slate-800 dark:text-slate-200" : "hover:text-primary-600"}`}
                >
                  {activeCol.name}
                </button>
              </>
            )}
            {activeSub && (
              <>
                <ChevronRight size={11} className="text-slate-300" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeSub.name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                {selected.size} selected
              </span>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search (show when inside a collection) */}
        {level !== "collections" && (
          <div className="px-5 pt-3 pb-1">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input pl-8 h-8 text-xs"
                placeholder="Search files…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader size={24} className="text-primary-500 animate-spin" />
            </div>
          ) : level === "collections" ? (
            collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <FolderOpen
                  size={40}
                  className="text-slate-300 dark:text-slate-700"
                />
                <p className="text-sm text-slate-500">
                  No media collections found
                </p>
                <p className="text-xs text-slate-400">
                  Upload files in Media Gallery first
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {collections.map((col) => {
                  const c = MEDIA_COLORS[col.colorId] || MEDIA_COLORS.blue;
                  const count =
                    (col.media?.length || 0) +
                    (col.subcollections?.reduce(
                      (s, sc) => s + (sc.media?.length || 0),
                      0,
                    ) || 0);
                  return (
                    <button
                      key={col.id || col._id}
                      onClick={() => setActiveCol(col)}
                      className="card p-4 text-left hover:shadow-card-hover transition-all group"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
                      >
                        <Folder size={16} className="text-white" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {col.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {col.subcollections?.length || 0} folders · {count}{" "}
                        files
                      </p>
                    </button>
                  );
                })}
              </div>
            )
          ) : level === "subfolders" ? (
            <div className="space-y-3">
              {/* Direct files in collection */}
              {(activeCol.media || []).length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-2">
                    Files in collection
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {activeCol.media.map((f) => (
                      <MediaFileCard
                        key={f.id}
                        file={f}
                        selected={selected.has(f.id)}
                        onToggle={toggleFile}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Subfolders */}
              {activeCol.subcollections?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-2">
                    Subfolders
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeCol.subcollections.map((sc) => {
                      const c =
                        MEDIA_COLORS[activeCol.colorId] || MEDIA_COLORS.blue;
                      return (
                        <button
                          key={sc.id}
                          onClick={() => setActiveSub(sc)}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all text-left group"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Folder size={13} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {sc.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {sc.media?.length || 0} files
                            </p>
                          </div>
                          <ChevronRight
                            size={12}
                            className="text-slate-300 group-hover:text-slate-500"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {(activeCol.media || []).length === 0 &&
                !activeCol.subcollections?.length && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <FolderOpen size={32} className="text-slate-300" />
                    <p className="text-xs text-slate-400">
                      This collection is empty
                    </p>
                  </div>
                )}
            </div>
          ) : // Files view
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <ImageIcon size={32} className="text-slate-300" />
              <p className="text-xs text-slate-400">
                {search ? "No files match" : "No files in this folder"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((f) => (
                <MediaFileCard
                  key={f.id}
                  file={f}
                  selected={selected.has(f.id)}
                  onToggle={toggleFile}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer confirm */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500">
            {selected.size === 0
              ? "Click files to select"
              : `${selected.size} file${selected.size > 1 ? "s" : ""} selected`}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="btn-primary btn-sm gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 size={13} /> Add{" "}
              {selected.size > 0 ? selected.size : ""} File
              {selected.size !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaFileCard({ file, selected, onToggle }) {
  const Icon = TYPE_ICON[file.type] || FileIcon;
  const colors = {
    image: "bg-blue-50 dark:bg-blue-900/20 text-blue-500",
    pdf: "bg-red-50 dark:bg-red-900/20 text-red-500",
    video: "bg-violet-50 dark:bg-violet-900/20 text-violet-500",
    document: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
    audio: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500",
  };
  const cls = colors[file.type] || colors.document;
  const previewUrl = resolveMediaUrl(file.fileUrl);
  return (
    <button
      onClick={() => onToggle(file)}
      className={`card p-2.5 transition-all group text-left relative ${selected ? "ring-2 ring-primary-500 shadow-card-hover" : "hover:shadow-card-hover hover:ring-2 hover:ring-primary-300"}`}
    >
      {/* Checkbox overlay */}
      <div
        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all ${selected ? "bg-primary-600" : "bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600"}`}
      >
        {selected && <CheckCircle2 size={13} className="text-white" />}
      </div>
      <div
        className={`w-full aspect-square rounded-lg ${cls} flex items-center justify-center mb-2 overflow-hidden`}
      >
        {file.type === "image" && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <Icon size={22} strokeWidth={1.5} />
        )}
      </div>
      <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">
        {file.name}
      </p>
      <p className="text-[9px] text-slate-400">{file.size}</p>
    </button>
  );
}

// ── Distribution Preview ───────────────────────────────────────────────────────
function DistributionPreview({ sessions, totalContacts, mode }) {
  if (!sessions?.length || totalContacts === 0) return null;
  const n = sessions.length;

  const rows = sessions.map((s, idx) => {
    const phone = s.phone || s.phoneNumber || s.sessionId;
    if (mode === "round-robin") {
      const count =
        Math.ceil(totalContacts / n) +
        (idx < totalContacts % n
          ? 0
          : -Math.floor(
              totalContacts - n * Math.floor(totalContacts / n) === 0 ? 0 : 0,
            ));
      // Round-robin: each session gets floor or ceil of total/n
      const base = Math.floor(totalContacts / n);
      const extra = totalContacts % n;
      const myCount = idx < extra ? base + 1 : base;
      return { phone, count: myCount, label: `~${myCount} msgs (alternating)` };
    }
    // Split mode: even chunks
    const chunkSize = Math.ceil(totalContacts / n);
    const start = idx * chunkSize + 1;
    const end = Math.min((idx + 1) * chunkSize, totalContacts);
    const myCount = Math.max(0, end - start + 1);
    return { phone, count: myCount, label: `msgs ${start}–${end}` };
  });

  const maxCount = Math.max(...rows.map((r) => r.count));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Target size={11} className="text-primary-500" /> Distribution Preview
          <span className="ml-auto text-[10px] font-normal text-slate-400">
            {totalContacts} total contacts
          </span>
        </p>
      </div>
      <div className="p-3 space-y-2.5">
        {rows.map((row, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                S{idx + 1}: {row.phone}
              </span>
              <span className="text-slate-500 font-mono">{row.label}</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{
                  width:
                    maxCount > 0 ? `${(row.count / maxCount) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        ))}
        <p className="text-[10px] text-slate-400 pt-1">
          {mode === "round-robin"
            ? "Each session alternates: S1 → S2 → S1 → S2…"
            : "Messages sent sequentially per session block"}
        </p>
      </div>
    </div>
  );
}

// ── Create Campaign Modal ──────────────────────────────────────────────────────
function CreateCampaignModal({
  numberLists,
  sessions,
  onClose,
  onCreate,
  onUploadMedia,
}) {
  const [step, setStep] = useState(1);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTab, setMediaTab] = useState("upload"); // "upload" | "gallery"
  const [creating, setCreating] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaLimits, setMediaLimits] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "broadcast",
    message: "",
    selectedMedia: [], // [{id, name, type, fileUrl, size, preview}]
    numberListId: "",
    sessionId: "",
    // Sending settings
    mode: "instant", // instant | scheduled | delayed
    scheduledFor: "", // datetime-local value
    minDelay: 10, // seconds
    maxDelay: 30, // seconds
    randomizeDelay: true,
    retryFailed: false,
    // Repeat schedule
    repeatEnabled: false,
    repeatType: "daily", // daily | weekly | monthly
    repeatTime: "09:00",
    repeatDays: [1], // weekly: 0-6 (Sun-Sat), monthly: [1-31]
    // Multi-session auto-switch
    selectedSessionIds: [], // array of selected session IDs (first = primary)
    autoSwitchSessions: false,
    sessionMode: "split", // "split" | "round-robin"
  });

  const addMedia = (files) =>
    setForm((prev) => ({
      ...prev,
      selectedMedia: [
        ...prev.selectedMedia,
        ...files.filter((f) => !prev.selectedMedia.find((m) => m.id === f.id)),
      ],
    }));
  const removeMedia = (id) =>
    set(
      "selectedMedia",
      form.selectedMedia.filter((m) => m.id !== id),
    );

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const steps = ["Details", "Recipients", "Message", "Settings", "Review"];

  const errors = () => {
    const e = [];
    if (step === 1 && !form.name.trim()) e.push("name");
    if (step === 2) {
      if (!form.numberListId) e.push("list");
      if (!form.selectedSessionIds || form.selectedSessionIds.length === 0)
        e.push("session");
    }
    if (step === 3 && !form.message.trim()) e.push("message");
    if (step === 4 && form.mode === "scheduled" && !form.scheduledFor)
      e.push("scheduledFor");
    return e;
  };

  const canNext = () => errors().length === 0;

  const selectedList = numberLists?.find(
    (l) => l._id === form.numberListId || l.id === form.numberListId,
  );
  // Primary session = first selected
  const selectedSession = sessions?.find(
    (s) =>
      s._id === form.selectedSessionIds?.[0] ||
      s.sessionId === form.selectedSessionIds?.[0],
  );
  const selectedSessionsAll =
    sessions?.filter((s) =>
      form.selectedSessionIds.includes(s._id || s.sessionId),
    ) || [];

  const getLocalMediaType = (file) =>
    file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : file.type.includes("pdf")
            ? "pdf"
            : "document";

  const formatLocalFileSize = (bytes) =>
    bytes > 1048576
      ? `${(bytes / 1048576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const getLimitKeyForMediaType = (mediaType) => {
    if (mediaType === "image") return "image";
    if (mediaType === "video") return "video";
    if (mediaType === "audio") return "audio";
    return "document";
  };

  const loadMediaLimits = async () => {
    if (mediaLimits) return mediaLimits;

    const data = await authFetch("/api/settings/media-limits");
    if (!data?.success || !data?.data) {
      throw new Error("Unable to fetch media limits. Please try again.");
    }

    setMediaLimits(data.data);
    return data.data;
  };

  const validateFileByLimits = (file, limits) => {
    const mediaType = getLocalMediaType(file);
    const limitKey = getLimitKeyForMediaType(mediaType);
    const maxMb = Number(limits?.[limitKey]);

    if (!Number.isFinite(maxMb) || maxMb <= 0) {
      return { ok: true };
    }

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb <= maxMb) {
      return { ok: true };
    }

    return {
      ok: false,
      message: `${file.name} is ${fileSizeMb.toFixed(2)} MB. Max ${limitKey} size is ${maxMb} MB.`,
    };
  };

  const handleLocalFilePick = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (fileList.length === 0 || typeof onUploadMedia !== "function") return;

    setMediaError("");
    setUploadingMedia(true);

    try {
      const limits = await loadMediaLimits();
      const uploadedItems = [];
      const blockedMessages = [];

      for (const file of fileList) {
        const fallbackType = getLocalMediaType(file);

        const validation = validateFileByLimits(file, limits);
        if (!validation.ok) {
          blockedMessages.push(validation.message);
          continue;
        }

        const uploaded = await onUploadMedia(file);

        // Limit modal is opened by parent when this returns null.
        if (!uploaded) continue;

        uploadedItems.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: uploaded.name || file.name,
          type: uploaded.type || fallbackType,
          file: null,
          fileUrl: uploaded.url,
          size: formatLocalFileSize(uploaded.fileSize || file.size || 0),
          preview:
            (uploaded.type || fallbackType) === "image"
              ? URL.createObjectURL(file)
              : null,
        });
      }

      if (uploadedItems.length > 0) {
        addMedia(uploadedItems);
      }

      if (blockedMessages.length > 0) {
        setMediaError(blockedMessages.slice(0, 2).join(" "));
      }
    } catch (err) {
      setMediaError(err?.message || "Failed to upload selected file(s)");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCreate = () => {
    if (!canNext() || creating) return;
    setCreating(true);
    Promise.resolve(onCreate(form)).finally(() => setCreating(false));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Megaphone size={17} className="text-primary-600" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white">
                New Campaign
              </p>
              <p className="text-xs text-slate-500">{steps[step - 1]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-7 pt-4 pb-2">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0 transition-all ${
                    i + 1 < step
                      ? "bg-emerald-500 text-white"
                      : i + 1 === step
                        ? "bg-primary-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  }`}
                >
                  {i + 1 < step ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium flex-shrink-0 ${i + 1 === step ? "text-primary-600" : "text-slate-400"}`}
                >
                  {s}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full ${i + 1 < step ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Campaign Name *
                </label>
                <input
                  className={`input ${errors().includes("name") ? "border-red-300 dark:border-red-700" : ""}`}
                  placeholder="e.g. Summer Sale 2026"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <input
                  className="input"
                  placeholder="Optional notes"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Campaign Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPAIGN_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => set("type", type.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${form.type === type.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            size={15}
                            className={
                              form.type === type.id
                                ? "text-primary-600"
                                : "text-slate-400"
                            }
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {type.label}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Number List *
                </label>
                <select
                  className={`input ${errors().includes("list") ? "border-red-300 dark:border-red-700" : ""}`}
                  value={form.numberListId}
                  onChange={(e) => set("numberListId", e.target.value)}
                >
                  <option value="">Select a number list…</option>
                  {numberLists?.map((l) => (
                    <option key={l._id || l.id} value={l._id || l.id}>
                      {l.name} · {l.numbers?.length || l.count || 0} contacts
                    </option>
                  ))}
                </select>
                {selectedList && (
                  <div className="mt-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        {selectedList.numbers?.length ||
                          selectedList.count ||
                          0}{" "}
                        contacts selected
                      </span>
                    </div>
                    {selectedList.variables?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <span className="text-[10px] text-slate-400 self-center mr-1">
                          Variables:
                        </span>
                        {selectedList.variables.map((v) => {
                          const isPhone = [
                            "phone",
                            "number",
                            "mobile",
                            "contact",
                            "no",
                            "num",
                            "tel",
                            "whatsapp",
                          ].some((k) => v.toLowerCase().includes(k));
                          return (
                            <span
                              key={v}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isPhone ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-600" : "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"}`}
                            >
                              {isPhone ? v : `{{${v}}}`}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Multi-Session Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  WhatsApp Sessions *
                  {form.selectedSessionIds.length > 0 && (
                    <span className="ml-2 text-primary-600 font-normal">
                      ({form.selectedSessionIds.length} selected)
                    </span>
                  )}
                </label>

                {sessions?.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle size={12} /> No connected sessions. Connect one
                    in WhatsApp Sessions.
                  </p>
                ) : (
                  <div
                    className={`space-y-2 ${errors().includes("session") ? "ring-2 ring-red-300 rounded-xl p-1" : ""}`}
                  >
                    {sessions.map((s, idx) => {
                      const sid = s._id || s.sessionId;
                      const isSelected = form.selectedSessionIds.includes(sid);
                      const isPrimary = form.selectedSessionIds[0] === sid;
                      return (
                        <button
                          key={sid}
                          type="button"
                          onClick={() => {
                            const cur = form.selectedSessionIds;
                            const next = isSelected
                              ? cur.filter((id) => id !== sid)
                              : [...cur, sid];
                            set("selectedSessionIds", next);
                            // Disable auto-switch if fewer than 2 sessions
                            if (next.length < 2)
                              set("autoSwitchSessions", false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-primary-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}
                            >
                              {isSelected ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {s.phone || s.phoneNumber || s.sessionId}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {s.name || "No session name"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isPrimary && isSelected && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full">
                                Primary
                              </span>
                            )}
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-primary-600 bg-primary-600" : "border-slate-300 dark:border-slate-600"}`}
                            >
                              {isSelected && (
                                <CheckCircle2
                                  size={11}
                                  className="text-white"
                                />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Auto Switch Toggle — visible only when 2+ sessions selected */}
                {form.selectedSessionIds.length >= 2 && (
                  <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Shuffle size={12} className="text-primary-500" />{" "}
                          Auto Switch Sessions
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Distribute messages across selected sessions
                        </p>
                      </div>
                      <div
                        className={`relative w-9 h-5 rounded-full cursor-pointer transition-colors ${form.autoSwitchSessions ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                        onClick={() =>
                          set("autoSwitchSessions", !form.autoSwitchSessions)
                        }
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoSwitchSessions ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </div>
                    </div>

                    {form.autoSwitchSessions && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                        {/* Distribution Mode */}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
                            Distribution Mode
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              {
                                id: "split",
                                label: "Equal Split",
                                desc: "Messages divided evenly across sessions",
                                example: "S1: 1-5, S2: 6-10",
                              },
                              {
                                id: "round-robin",
                                label: "Round-Robin",
                                desc: "Alternates session for each message",
                                example: "S1,S2,S1,S2…",
                              },
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => set("sessionMode", m.id)}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${form.sessionMode === m.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                              >
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {m.label}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {m.desc}
                                </p>
                                <p className="text-[9px] font-mono text-primary-500 mt-1">
                                  {m.example}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Distribution Preview */}
                        <DistributionPreview
                          sessions={sessions.filter((s) =>
                            form.selectedSessionIds.includes(
                              s._id || s.sessionId,
                            ),
                          )}
                          totalContacts={(() => {
                            const list = numberLists?.find(
                              (l) =>
                                l._id === form.numberListId ||
                                l.id === form.numberListId,
                            );
                            return list?.numbers?.length || list?.count || 0;
                          })()}
                          mode={form.sessionMode}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Message */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Message *
                </label>
                <textarea
                  id="campaign-message-input"
                  className={`input resize-none ${errors().includes("message") ? "border-red-300 dark:border-red-700" : ""}`}
                  rows={5}
                  placeholder={
                    "Type your message…\nClick variable chips below to insert {{name}}, {{city}} etc."
                  }
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-slate-400">
                    Click variable chips to insert dynamic content
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {form.message.length} chars
                  </p>
                </div>
              </div>

              {/* Variable chips panel */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="text-violet-500">
                      &#123;&#123;&#125;&#125;
                    </span>{" "}
                    Variables — click to insert
                  </p>
                  {!form.numberListId && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      Go back to step 2 to select a number list
                    </p>
                  )}
                </div>
                <div className="px-3.5 py-3 flex flex-wrap gap-2">
                  {/* Always-available system variables */}
                  {[
                    { label: "{{phone}}", desc: "Phone number" },
                    { label: "{{date}}", desc: "Today's date" },
                    { label: "{{time}}", desc: "Current time" },
                  ].map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      title={v.desc}
                      onClick={() => {
                        const ta = document.getElementById(
                          "campaign-message-input",
                        );
                        if (ta) {
                          const start = ta.selectionStart;
                          const end = ta.selectionEnd;
                          const newVal =
                            form.message.slice(0, start) +
                            v.label +
                            form.message.slice(end);
                          set("message", newVal);
                          setTimeout(() => {
                            ta.focus();
                            ta.setSelectionRange(
                              start + v.label.length,
                              start + v.label.length,
                            );
                          }, 0);
                        } else {
                          set("message", form.message + v.label);
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                  {/* CSV variables from the selected list */}
                  {selectedList?.variables?.length > 0 &&
                    (() => {
                      const phoneKeywords = [
                        "phone",
                        "number",
                        "mobile",
                        "contact",
                        "no",
                        "num",
                        "tel",
                        "whatsapp",
                      ];
                      return selectedList.variables
                        .filter(
                          (v) =>
                            !phoneKeywords.some((k) =>
                              v.toLowerCase().includes(k),
                            ),
                        )
                        .map((v) => (
                          <button
                            key={v}
                            type="button"
                            title={`CSV column: ${v}`}
                            onClick={() => {
                              const chip = `{{${v}}}`;
                              const ta = document.getElementById(
                                "campaign-message-input",
                              );
                              if (ta) {
                                const start = ta.selectionStart;
                                const end = ta.selectionEnd;
                                const newVal =
                                  form.message.slice(0, start) +
                                  chip +
                                  form.message.slice(end);
                                set("message", newVal);
                                setTimeout(() => {
                                  ta.focus();
                                  ta.setSelectionRange(
                                    start + chip.length,
                                    start + chip.length,
                                  );
                                }, 0);
                              } else {
                                set("message", form.message + chip);
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-semibold bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:border-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-colors"
                          >
                            {`{{${v}}}`}
                          </button>
                        ));
                    })()}
                  {!form.numberListId && (
                    <p className="text-[10px] text-slate-400 self-center italic">
                      No list selected yet
                    </p>
                  )}
                  {form.numberListId &&
                    selectedList &&
                    (!selectedList.variables ||
                      selectedList.variables.length === 0) && (
                      <p className="text-[10px] text-slate-400 self-center">
                        List has no CSV variables — only system variables
                        available.
                      </p>
                    )}
                </div>
                {selectedList?.variables?.length > 0 && (
                  <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 bg-violet-50/50 dark:bg-violet-900/10">
                    <p className="text-[10px] text-violet-600 dark:text-violet-400">
                      From list{" "}
                      <span className="font-semibold">
                        "{selectedList.name}"
                      </span>{" "}
                      · {selectedList.variables.length} columns:{" "}
                      {selectedList.variables.map((v) => `{{${v}}}`).join(", ")}
                    </p>
                  </div>
                )}
              </div>
              {/* Media */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Attach Media{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </p>
                  {form.selectedMedia.length > 0 && (
                    <span className="text-[10px] text-primary-600 font-semibold">
                      {form.selectedMedia.length} file
                      {form.selectedMedia.length > 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>

                {/* Selected media thumbnails */}
                {form.selectedMedia.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    {form.selectedMedia.map((m) => {
                      const Icon = TYPE_ICON[m.type] || FileIcon;
                      const preview = m.preview || resolveMediaUrl(m.fileUrl);
                      return (
                        <div
                          key={m.id}
                          className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group"
                        >
                          {m.type === "image" && preview ? (
                            <img
                              src={preview}
                              alt={m.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <Icon size={20} className="text-slate-400" />
                              <span className="text-[9px] text-slate-400 truncate px-1 text-center">
                                {m.name}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => removeMedia(m.id)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                    {/* Add more button */}
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all"
                    >
                      <Plus size={16} className="text-slate-400" />
                      <span className="text-[9px] text-slate-400">
                        Add more
                      </span>
                    </button>
                  </div>
                )}

                {/* Add buttons (shown when nothing selected yet) */}
                {form.selectedMedia.length === 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Upload file */}
                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 cursor-pointer transition-all">
                      <Upload size={18} className="text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium text-center">
                        Upload File
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Images, Videos, PDFs
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                        multiple
                        disabled={uploadingMedia}
                        onChange={handleLocalFilePick}
                      />
                    </label>
                    {/* Gallery picker */}
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all"
                    >
                      <FolderOpen size={18} className="text-primary-500" />
                      <span className="text-xs text-slate-500 font-medium">
                        Media Gallery
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Browse collections
                      </span>
                    </button>
                  </div>
                )}

                {(uploadingMedia || mediaError) && (
                  <div className="mt-2">
                    {uploadingMedia && (
                      <p className="text-[11px] text-primary-600 flex items-center gap-1.5">
                        <Loader size={11} className="animate-spin" />
                        Uploading and validating files...
                      </p>
                    )}
                    {mediaError && (
                      <p className="text-[11px] text-red-500 mt-1">
                        {mediaError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Sending Settings */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Send mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Send Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "instant",
                      icon: Zap,
                      label: "Instant",
                      desc: "Send now",
                    },
                    {
                      id: "scheduled",
                      icon: CalendarClock,
                      label: "Scheduled",
                      desc: "Set date & time",
                    },
                    {
                      id: "delayed",
                      icon: Timer,
                      label: "Delayed",
                      desc: "With gap between msgs",
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => set("mode", m.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${form.mode === m.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                      >
                        <Icon
                          size={16}
                          className={`mx-auto mb-1 ${form.mode === m.id ? "text-primary-600" : "text-slate-400"}`}
                        />
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {m.label}
                        </p>
                        <p className="text-[10px] text-slate-400">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule datetime */}
              {form.mode === "scheduled" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Schedule Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    className={`input ${errors().includes("scheduledFor") ? "border-red-300" : ""}`}
                    value={form.scheduledFor}
                    onChange={(e) => set("scheduledFor", e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Messages will be sent at the specified time
                  </p>
                </div>
              )}

              {/* Message gap */}
              {(form.mode === "delayed" || form.mode === "scheduled") && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Timer size={13} className="text-primary-500" /> Message Gap
                    Settings
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Min Delay (sec)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        className="input py-2 text-sm"
                        value={form.minDelay}
                        onChange={(e) =>
                          set("minDelay", Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Max Delay (sec)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        className="input py-2 text-sm"
                        value={form.maxDelay}
                        onChange={(e) =>
                          set("maxDelay", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                    Each message waits{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {form.minDelay}–{form.maxDelay}s
                    </span>{" "}
                    before the next is sent
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors ${form.randomizeDelay ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                      onClick={() =>
                        set("randomizeDelay", !form.randomizeDelay)
                      }
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.randomizeDelay ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Shuffle size={11} /> Randomize Delay
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Randomizes gap to appear more natural
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors ${form.retryFailed ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                      onClick={() => set("retryFailed", !form.retryFailed)}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.retryFailed ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <RefreshCw size={11} /> Auto-retry Failed
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Retry failed numbers once after campaign ends
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Repeat Schedule */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <RefreshCw size={12} className="text-primary-500" />{" "}
                      Repeat Schedule
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Auto-repeat this campaign
                    </p>
                  </div>
                  <div
                    className={`relative w-9 h-5 rounded-full cursor-pointer transition-colors ${form.repeatEnabled ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                    onClick={() => set("repeatEnabled", !form.repeatEnabled)}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.repeatEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                    />
                  </div>
                </div>
                {form.repeatEnabled && (
                  <div className="p-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
                    {/* Repeat type */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "daily", label: "Daily", desc: "Every day" },
                        { id: "weekly", label: "Weekly", desc: "Select days" },
                        {
                          id: "monthly",
                          label: "Monthly",
                          desc: "Day of month",
                        },
                      ].map((rt) => (
                        <button
                          key={rt.id}
                          type="button"
                          onClick={() => set("repeatType", rt.id)}
                          className={`p-2.5 rounded-xl border-2 text-center transition-all ${form.repeatType === rt.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                        >
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {rt.label}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {rt.desc}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Time picker */}
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Send Time
                      </label>
                      <input
                        type="time"
                        value={form.repeatTime}
                        onChange={(e) => set("repeatTime", e.target.value)}
                        className="input py-2 text-sm w-full"
                      />
                    </div>

                    {/* Day selectors for weekly */}
                    {form.repeatType === "weekly" && (
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1.5">
                          Days of Week
                        </label>
                        <div className="flex gap-1.5 flex-wrap">
                          {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ].map((d, i) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                const cur = form.repeatDays || [];
                                const next = cur.includes(i)
                                  ? cur.filter((x) => x !== i)
                                  : [...cur, i];
                                set("repeatDays", next.sort());
                              }}
                              className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${(form.repeatDays || []).includes(i) ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Day of month for monthly */}
                    {form.repeatType === "monthly" && (
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Day of Month (1–31)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={form.repeatDays?.[0] || 1}
                          onChange={(e) =>
                            set("repeatDays", [
                              Math.min(31, Math.max(1, Number(e.target.value))),
                            ])
                          }
                          className="input py-2 text-sm w-full"
                        />
                      </div>
                    )}

                    {/* Summary */}
                    <p className="text-[10px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg px-3 py-2">
                      {form.repeatType === "daily" &&
                        `Repeats every day at ${form.repeatTime}`}
                      {form.repeatType === "weekly" &&
                        `Repeats every ${(form.repeatDays || []).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ") || "—"} at ${form.repeatTime}`}
                      {form.repeatType === "monthly" &&
                        `Repeats on day ${form.repeatDays?.[0] || 1} of each month at ${form.repeatTime}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                {[
                  ["Campaign", form.name],
                  [
                    "Type",
                    CAMPAIGN_TYPES.find((t) => t.id === form.type)?.label,
                  ],
                  [
                    "Recipients",
                    `${selectedList?.numbers?.length || selectedList?.count || 0} contacts (${selectedList?.name})`,
                  ],
                  [
                    "Session",
                    form.autoSwitchSessions && selectedSessionsAll.length > 1
                      ? `${selectedSessionsAll.length} sessions (${form.sessionMode === "round-robin" ? "Round-Robin" : "Equal Split"})`
                      : selectedSession?.phone ||
                        selectedSession?.phoneNumber ||
                        selectedSession?.sessionId,
                  ],
                  [
                    "Mode",
                    form.mode === "instant"
                      ? "Send Instantly"
                      : form.mode === "scheduled"
                        ? `Scheduled: ${new Date(form.scheduledFor).toLocaleString()}`
                        : "Delayed sending",
                  ],
                  [
                    "Gap",
                    form.mode === "instant"
                      ? "None"
                      : `${form.minDelay}–${form.maxDelay}s${form.randomizeDelay ? " (randomized)" : ""}`,
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="text-[11px] text-slate-500 flex-shrink-0">
                      {k}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 text-right">
                      {v || "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* WhatsApp-style preview */}
              <div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Message Preview
                </p>
                <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-xl p-3 flex flex-col gap-2">
                  {/* Multiple media: each as its own bubble */}
                  {form.selectedMedia.length > 1 &&
                    form.selectedMedia.map((m, idx) => {
                      const preview = m.preview || resolveMediaUrl(m.fileUrl);
                      const Icon = TYPE_ICON[m.type] || File;
                      return (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[75%] bg-[#d1f7bf] dark:bg-[#005c4b] rounded-2xl rounded-tr-none shadow-sm overflow-hidden">
                            {m.type === "image" && preview ? (
                              <img
                                src={preview}
                                alt={m.name}
                                className="w-full max-h-28 object-cover"
                              />
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 bg-[#b2f0a0] dark:bg-[#004a3a]">
                                <Icon
                                  size={14}
                                  className="text-slate-600 dark:text-slate-300 flex-shrink-0"
                                />
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                                  {m.name}
                                </span>
                              </div>
                            )}
                            {idx === 0 && form.message && (
                              <div className="px-3 py-2">
                                <p className="text-xs text-slate-800 dark:text-[#e5e5e5] whitespace-pre-wrap break-words">
                                  {form.message}
                                </p>
                              </div>
                            )}
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 text-right flex items-center justify-end gap-0.5 px-2 pb-1">
                              {new Date().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              <span className="text-[#34b7f1]">✓✓</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  {/* Single media or text only */}
                  {form.selectedMedia.length <= 1 && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-[#d1f7bf] dark:bg-[#005c4b] rounded-2xl rounded-tr-none shadow-sm overflow-hidden">
                        {form.selectedMedia.length === 1 &&
                          (() => {
                            const m = form.selectedMedia[0];
                            const preview =
                              m.preview || resolveMediaUrl(m.fileUrl);
                            const Icon = TYPE_ICON[m.type] || FileIcon;
                            return m.type === "image" && preview ? (
                              <img
                                src={preview}
                                alt={m.name}
                                className="w-full max-h-40 object-cover"
                              />
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 bg-[#b2f0a0] dark:bg-[#004a3a]">
                                <Icon
                                  size={14}
                                  className="text-slate-600 dark:text-slate-300 flex-shrink-0"
                                />
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                                  {m.name}
                                </span>
                              </div>
                            );
                          })()}
                        {form.message && (
                          <div className="px-3 py-2">
                            <p className="text-xs text-slate-800 dark:text-[#e5e5e5] whitespace-pre-wrap break-words">
                              {form.message}
                            </p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 text-right flex items-center justify-end gap-0.5">
                              {new Date().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              <span className="text-[#34b7f1]">✓✓</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-4 py-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                <Zap size={14} className="text-primary-600 flex-shrink-0" />
                <p className="text-xs text-primary-700 dark:text-primary-300 font-medium">
                  Ready to launch — review settings above before creating
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="btn-ghost btn-sm text-slate-500">
            Cancel
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="btn-secondary btn-sm"
              >
                Back
              </button>
            )}
            {step < steps.length ? (
              <button
                onClick={() => canNext() && setStep((s) => s + 1)}
                disabled={!canNext() || creating}
                className="btn-primary btn-sm gap-2 disabled:opacity-50"
              >
                Next <ChevronRight size={13} />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!canNext() || creating}
                className="btn-primary btn-sm gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {creating ? (
                  <Loader size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                {creating ? "Creating..." : "Create Campaign"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onConfirm={(files) => {
          addMedia(files);
          setShowMediaPicker(false);
        }}
      />
    </div>
  );
}

// ── Edit Schedule Modal ────────────────────────────────────────────────────────
function EditScheduleModal({ campaign, onClose, onSave }) {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [form, setForm] = useState(() => ({
    mode: campaign.mode === "interval" ? "delayed" : campaign.mode || "instant",
    scheduledFor: campaign.scheduledFor
      ? new Date(campaign.scheduledFor).toISOString().slice(0, 16)
      : "",
    minDelay: campaign.minDelay ?? 10,
    maxDelay: campaign.maxDelay ?? 30,
    randomizeDelay: campaign.randomizeDelay ?? true,
    delaySeconds: campaign.delaySeconds ?? 10,
    repeatEnabled: campaign.repeat?.enabled ?? false,
    repeatType: campaign.repeat?.type || "daily",
    repeatTime: campaign.repeat?.time || "09:00",
    repeatDays: campaign.repeat?.days || [1],
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      mode: form.mode,
      scheduledFor: form.scheduledFor || undefined,
      minDelay: form.minDelay,
      maxDelay: form.maxDelay,
      randomizeDelay: form.randomizeDelay,
      delaySeconds: form.delaySeconds,
      repeat: {
        enabled: form.repeatEnabled,
        type: form.repeatType,
        time: form.repeatTime,
        days: form.repeatDays,
      },
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <CalendarClock size={15} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Schedule
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {campaign.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Send Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Send Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: "instant",
                  icon: Zap,
                  label: "Instant",
                  desc: "5–10s safety gap",
                },
                {
                  id: "scheduled",
                  icon: CalendarClock,
                  label: "Scheduled",
                  desc: "Set date & time",
                },
                {
                  id: "delayed",
                  icon: Timer,
                  label: "Delayed",
                  desc: "Gap between msgs",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => set("mode", m.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${form.mode === m.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                >
                  <m.icon
                    size={14}
                    className={`mx-auto mb-1 ${form.mode === m.id ? "text-primary-600" : "text-slate-400"}`}
                  />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {m.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled datetime */}
          {form.mode === "scheduled" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Schedule Date & Time *
              </label>
              <input
                type="datetime-local"
                className="input"
                value={form.scheduledFor}
                onChange={(e) => set("scheduledFor", e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Messages will be sent at the specified time
              </p>
            </div>
          )}

          {/* Message Gap Settings */}
          {(form.mode === "delayed" || form.mode === "scheduled") && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Timer size={12} className="text-primary-500" /> Message Gap
                Settings
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Min Delay (sec)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    className="input py-2 text-sm"
                    value={form.minDelay}
                    onChange={(e) => set("minDelay", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Max Delay (sec)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    className="input py-2 text-sm"
                    value={form.maxDelay}
                    onChange={(e) => set("maxDelay", Number(e.target.value))}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                Each message waits{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {form.minDelay}–{form.maxDelay}s
                </span>{" "}
                before the next is sent
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors ${form.randomizeDelay ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                  onClick={() => set("randomizeDelay", !form.randomizeDelay)}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.randomizeDelay ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Shuffle size={11} /> Randomize Delay
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Randomizes gap to appear more natural
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Repeat Schedule */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <RefreshCw size={12} className="text-primary-500" /> Repeat
                  Schedule
                </p>
                <p className="text-[10px] text-slate-400">
                  Auto-repeat this campaign on a schedule
                </p>
              </div>
              <div
                className={`relative w-9 h-5 rounded-full cursor-pointer transition-colors ${form.repeatEnabled ? "bg-primary-500" : "bg-slate-300 dark:bg-slate-600"}`}
                onClick={() => set("repeatEnabled", !form.repeatEnabled)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.repeatEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
            </div>

            {form.repeatEnabled && (
              <div className="p-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
                {/* Type */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "daily", label: "Daily", desc: "Every day" },
                    { id: "weekly", label: "Weekly", desc: "Select days" },
                    { id: "monthly", label: "Monthly", desc: "Day of month" },
                  ].map((rt) => (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => set("repeatType", rt.id)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all ${form.repeatType === rt.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
                    >
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {rt.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{rt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Time */}
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Send Time
                  </label>
                  <input
                    type="time"
                    value={form.repeatTime}
                    onChange={(e) => set("repeatTime", e.target.value)}
                    className="input py-2 text-sm w-full"
                  />
                </div>

                {/* Weekly day picker */}
                {form.repeatType === "weekly" && (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1.5">
                      Days of Week
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAY_LABELS.map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const cur = form.repeatDays || [];
                            const next = cur.includes(i)
                              ? cur.filter((x) => x !== i)
                              : [...cur, i];
                            set("repeatDays", next.sort());
                          }}
                          className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${(form.repeatDays || []).includes(i) ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly day picker */}
                {form.repeatType === "monthly" && (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Day of Month (1–31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.repeatDays?.[0] || 1}
                      onChange={(e) =>
                        set("repeatDays", [
                          Math.min(31, Math.max(1, Number(e.target.value))),
                        ])
                      }
                      className="input py-2 text-sm w-full"
                    />
                  </div>
                )}

                {/* Summary */}
                <p className="text-[10px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg px-3 py-2">
                  {form.repeatType === "daily" &&
                    `Repeats every day at ${form.repeatTime}`}
                  {form.repeatType === "weekly" &&
                    `Repeats every ${(form.repeatDays || []).map((d) => DAY_LABELS[d]).join(", ") || "—"} at ${form.repeatTime}`}
                  {form.repeatType === "monthly" &&
                    `Repeats on day ${form.repeatDays?.[0] || 1} of each month at ${form.repeatTime}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="btn-ghost btn-sm text-slate-500">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary btn-sm gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader size={13} className="animate-spin" />
            ) : (
              <CheckCircle2 size={13} />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [numberLists, setNumberLists] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [detailsCampaign, setDetailsCampaign] = useState(null);
  const [editScheduleCampaign, setEditScheduleCampaign] = useState(null);
  const [toast, setToast] = useState(null);
  const [limitError, setLimitError] = useState(null);
  const [updatingSessionId, setUpdatingSessionId] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = async () => {
    try {
      const [cData, lData, sData] = await Promise.all([
        authFetch(`/api/campaigns?status=${filterStatus}&search=${search}`),
        authFetch("/api/number-lists"),
        authFetch("/api/sessions"),
      ]);
      if (cData.success) setCampaigns(cData.data || []);
      if (lData.lists)
        setNumberLists(lData.lists.map((l) => ({ ...l, _id: l.id || l._id })));
      else if (lData.data)
        setNumberLists(
          (lData.data || []).map((l) => ({ ...l, _id: l._id || l.id })),
        );
      if (sData.success)
        setSessions(
          (sData.data || [])
            .filter((s) => s.status === "connected")
            .map((s) => ({ ...s, phone: s.phone || s.phoneNumber })),
        );
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchAll(), 8000);
    return () => clearInterval(interval);
  }, [filterStatus, search]);

  const uploadCampaignMedia = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const data = await authFetch("/api/campaigns/upload-media", {
      method: "POST",
      body: formData,
    });

    if (!data?.success) {
      const limitErr = parseLimitError(data);
      if (limitErr) {
        setLimitError(limitErr);
        return null;
      }
      throw new Error(data?.error || "Failed to upload media");
    }

    return data.data;
  };

  const handleCreate = async (formData) => {
    try {
      // Upload local PC files first so the campaign payload stays small.
      const mediaFiles = [];
      for (const media of formData.selectedMedia || []) {
        if (media.fileUrl && !media.file) {
          mediaFiles.push({
            url: media.fileUrl,
            type: media.type || "image",
            name: media.name || "file",
          });
          continue;
        }

        if (media.file instanceof File) {
          const uploaded = await uploadCampaignMedia(media.file);
          if (!uploaded) return;
          mediaFiles.push({
            url: uploaded.url,
            type: uploaded.type || media.type || "image",
            name: uploaded.name || media.name || "file",
          });
          continue;
        }

        if (media.preview?.startsWith("data:")) {
          throw new Error(
            "Local media must be uploaded before creating the campaign.",
          );
        }
      }

      // Map frontend form fields → backend schema
      const primarySessionId =
        formData.selectedSessionIds?.[0] || formData.sessionId;
      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        message: formData.message,
        numberListId: formData.numberListId,
        sessionId: primarySessionId,
        // Multi-session
        sessions:
          formData.selectedSessionIds?.length > 0
            ? formData.selectedSessionIds
            : [primarySessionId],
        multiSession: {
          enabled: !!(
            formData.autoSwitchSessions &&
            (formData.selectedSessionIds?.length || 0) > 1
          ),
          mode: formData.sessionMode || "split",
        },
        mode: formData.mode,
        scheduledFor: formData.scheduledFor || undefined,
        delaySeconds: formData.delaySeconds || formData.minDelay || 15,
        minDelay: formData.minDelay || 10,
        maxDelay: formData.maxDelay || 30,
        randomizeDelay: !!formData.randomizeDelay,
        autoRetry: !!(formData.autoRetry || formData.retryFailed),
        repeat: {
          enabled: !!formData.repeatEnabled,
          type: formData.repeatType || "daily",
          time: formData.repeatTime || "09:00",
          days: formData.repeatDays || [],
        },
        mediaFiles,
        // legacy single-field for backward compat
        mediaUrl: mediaFiles[0]?.url || null,
        mediaType: mediaFiles[0]?.type || null,
        mediaName: mediaFiles[0]?.name || null,
      };
      const data = await authFetch("/api/campaigns/create", {
        method: "POST",
        body: payload,
      });
      if (data.success) {
        setCampaigns((prev) => [data.data, ...prev]);
        setShowCreate(false);
        showToast("Campaign created successfully!");
      } else {
        const limitErr = parseLimitError(data);
        if (limitErr) {
          setLimitError(limitErr);
        } else {
          showToast(data.error || "Failed to create campaign", "error");
        }
      }
    } catch (err) {
      showToast(
        err?.message || "Network error — could not create campaign",
        "error",
      );
    }
  };

  const campaignAction = async (id, action) => {
    try {
      const data = await authFetch(`/api/campaigns/${id}/${action}`, {
        method: "POST",
      });
      if (data.success) {
        setCampaigns((prev) => prev.map((c) => (c._id === id ? data.data : c)));
        const labels = {
          start: "started",
          pause: "paused",
          resume: "resumed",
          retry: "retried",
          restart: "restarted",
        };
        showToast(`Campaign ${labels[action] || action + "ed"}`);
      } else {
        showToast(data.error || `Failed to ${action}`, "error");
      }
    } catch (err) {
      showToast(`Failed to ${action}`, "error");
    }
  };

  const handleUpdateSchedule = async (id, scheduleData) => {
    try {
      const data = await authFetch(`/api/campaigns/${id}/schedule`, {
        method: "PATCH",
        body: scheduleData,
      });
      if (data.success) {
        setCampaigns((prev) => prev.map((c) => (c._id === id ? data.data : c)));
        showToast("Schedule updated");
      } else {
        showToast(data.error || "Failed to update schedule", "error");
      }
    } catch (err) {
      showToast("Failed to update schedule", "error");
    }
  };

  const handleUpdateCampaignSession = async (id, sessionId) => {
    if (!sessionId) return;
    setUpdatingSessionId(id);
    try {
      const data = await authFetch(`/api/campaigns/${id}/session`, {
        method: "PATCH",
        body: { sessionId },
      });

      if (data.success) {
        setCampaigns((prev) => prev.map((c) => (c._id === id ? data.data : c)));
        if (detailsCampaign?._id === id) {
          setDetailsCampaign(data.data);
        }
        showToast("Campaign session updated");
      } else {
        showToast(data.error || "Failed to update campaign session", "error");
      }
    } catch (err) {
      showToast("Failed to update campaign session", "error");
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      const data = await authFetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (data.success) {
        setCampaigns((prev) => prev.filter((c) => c._id !== id));
        showToast("Campaign deleted");
      }
    } catch (err) {
      showToast("Failed to delete campaign", "error");
    }
  };

  const filtered = campaigns.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: campaigns.length,
    running: campaigns.filter((c) => c.status === "running").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    totalSent: campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0),
    delivered: campaigns.reduce((s, c) => s + (c.stats?.delivered || 0), 0),
  };

  const deliveryRate =
    stats.totalSent > 0
      ? ((stats.delivered / stats.totalSent) * 100).toFixed(1)
      : 0;

  if (loading) {
    return (
      <div className="page flex items-center justify-center">
        <div className="text-center">
          <Loader
            size={32}
            className="text-primary-500 animate-spin mx-auto mb-2"
          />
          <p className="text-slate-500 text-sm">Loading campaigns…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page space-y-5">
      {/* Edit Schedule Modal */}
      {editScheduleCampaign && (
        <EditScheduleModal
          campaign={editScheduleCampaign}
          onClose={() => setEditScheduleCampaign(null)}
          onSave={(data) =>
            handleUpdateSchedule(editScheduleCampaign._id, data)
          }
        />
      )}

      {/* Limit modal */}
      {limitError && (
        <LimitExceededModal
          resource={limitError.resource}
          used={limitError.used}
          limit={limitError.limit}
          onClose={() => setLimitError(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-emerald-500 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={15} />
          ) : (
            <CheckCircle2 size={15} />
          )}
          {toast.msg}
        </div>
      )}

      <PageHeader
        title="Campaigns"
        subtitle={`${stats.total} campaigns · ${stats.running} running`}
      >
        {limitError ? (
          <LockedButton
            label="New Campaign"
            onClick={() => setLimitError(limitError)}
          />
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary gap-2"
          >
            <Plus size={14} /> New Campaign
          </button>
        )}
      </PageHeader>

      {/* Stats — 4 cards in one row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Campaigns",
            value: stats.total,
            icon: Megaphone,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "Running",
            value: stats.running,
            icon: Activity,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: "Total Sent",
            value: stats.totalSent.toLocaleString(),
            icon: Send,
            color: "text-violet-600",
            bg: "bg-violet-50 dark:bg-violet-900/20",
          },
          {
            label: "Delivery Rate",
            value: `${deliveryRate}%`,
            icon: TrendingUp,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}
            >
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className={`text-2xl font-bold leading-tight ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-8 h-9 text-sm"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input h-9 text-sm w-full sm:w-40"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="running">Running</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="failed">Failed</option>
        </select>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 flex-shrink-0">
          {[
            ["grid", Grid],
            ["list", List],
          ].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`p-2 rounded-md transition-colors ${viewMode === v ? "bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first WhatsApp campaign to get started."
          action={
            limitError ? (
              <LockedButton
                label="New Campaign"
                onClick={() => setLimitError(limitError)}
              />
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary gap-2"
              >
                <Plus size={14} /> New Campaign
              </button>
            )
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
              sessions={sessions}
              onStart={() => campaignAction(c._id, "start")}
              onPause={() => campaignAction(c._id, "pause")}
              onResume={() => campaignAction(c._id, "resume")}
              onRetry={() => campaignAction(c._id, "retry")}
              onRestart={() => campaignAction(c._id, "restart")}
              onDelete={() => handleDelete(c._id)}
              onView={() => setDetailsCampaign(c)}
              onEditSchedule={() => setEditScheduleCampaign(c)}
              onChangeSession={handleUpdateCampaignSession}
              updatingSessionId={updatingSessionId}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Type</th>
                <th>Contacts</th>
                <th>Progress</th>
                <th>Status</th>
                <th className="w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {filtered.map((c) => {
                const sc = statusConfig[c.status] || statusConfig.draft;
                return (
                  <tr key={c._id} className="group">
                    <td>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {c.message}
                      </p>
                    </td>
                    <td className="text-xs text-slate-500">
                      {CAMPAIGN_TYPES.find((t) => t.id === c.type)?.label}
                    </td>
                    <td className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {c.stats?.total || 0}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 transition-all"
                            style={{ width: `${c.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {c.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge text-[10px] ${sc.badge}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDetailsCampaign(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <BarChart2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateCampaignModal
          numberLists={numberLists}
          sessions={sessions}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          onUploadMedia={uploadCampaignMedia}
        />
      )}

      <CampaignDetailsModal
        campaign={detailsCampaign}
        onClose={() => setDetailsCampaign(null)}
        onPause={() => {
          campaignAction(detailsCampaign?._id, "pause");
          setDetailsCampaign(null);
        }}
        onResume={() => {
          campaignAction(detailsCampaign?._id, "resume");
          setDetailsCampaign(null);
        }}
      />
    </div>
  );
}
