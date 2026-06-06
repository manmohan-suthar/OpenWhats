import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  Clock,
  Filter,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Wifi,
  ExternalLink,
  History,
  Play,
  Pause,
  Settings,
  Brain,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";
import AutoReplyService from "../../services/instagramAutoReplyService";
import { useTheme } from "../../contexts/ThemeContext";

const CATEGORY_COLORS = {
  BUYING_INTENT: "bg-amber-50 border-amber-200 text-amber-800",
  PRAISE: "bg-emerald-50 border-emerald-200 text-emerald-800",
  HATE: "bg-red-50 border-red-200 text-red-800",
  SPAM: "bg-slate-50 border-slate-200 text-slate-800",
  QUESTION: "bg-sky-50 border-sky-200 text-sky-800",
  GENERAL: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
};

const INITIAL_FORM = {
  niche: "",
  tone: "",
  language: "",
  about: "",
};

function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFull(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shorten(value, max = 100) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function getCategoryBadge(category) {
  const key = String(category || "GENERAL").toUpperCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.GENERAL;
}

function getCommentTimestampMs(item) {
  const comment = item?.comment || item || {};
  const rawTimestamp =
    comment.createdAt ||
    comment.created_at ||
    comment.created_time ||
    comment.timestamp ||
    comment.ts ||
    item?.createdAt ||
    item?.timestamp;

  if (!rawTimestamp) return null;

  if (typeof rawTimestamp === "number") {
    return rawTimestamp < 1e12 ? rawTimestamp * 1000 : rawTimestamp;
  }

  const parsed = Date.parse(rawTimestamp);
  return Number.isNaN(parsed) ? null : parsed;
}

function filterCommentsAfterCutoff(comments, cutoffValue) {
  const cutoffMs = cutoffValue ? Date.parse(cutoffValue) : null;
  if (!cutoffMs || Number.isNaN(cutoffMs)) return comments;

  return comments.filter((item) => {
    const timestampMs = getCommentTimestampMs(item);
    return timestampMs ? timestampMs >= cutoffMs : false;
  });
}

export default function InstagramAIReply() {
  const { theme } = useTheme();
  const autoReplyInProgressRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [agent, setAgent] = useState(null);
  const [session, setSession] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [pendingComments, setPendingComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingReplyId, setPostingReplyId] = useState(null);
  const [generatedReplies, setGeneratedReplies] = useState({});
  const [logs, setLogs] = useState([]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyStartedAt, setAutoReplyStartedAt] = useState(null);
  const [autoReplyInProgress, setAutoReplyInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isDark = theme === "dark";
  const stats = useMemo(
    () => [
      {
        label: "Mode",
        value: autoReplyEnabled ? "Auto" : "Paused",
        meta: autoReplyStartedAt
          ? `Since ${formatFull(autoReplyStartedAt)}`
          : "Start auto reply to open the new-comments window",
        icon: Clock,
        tone: "cyan",
      },
      {
        label: "Pending",
        value: pendingComments.length,
        meta: "Comments awaiting reply",
        icon: MessageCircle,
        tone: "amber",
      },
      {
        label: "History",
        value: agent?.replyCount || 0,
        meta: "AI replies saved total",
        icon: BarChart3,
        tone: "emerald",
      },
      {
        label: "Refreshed",
        value: lastRefreshedAt ? formatTime(lastRefreshedAt) : "Just now",
        meta: "Background polling active",
        icon: RefreshCw,
        tone: "purple",
      },
    ],
    [
      agent?.replyCount,
      autoReplyEnabled,
      autoReplyStartedAt,
      lastRefreshedAt,
      pendingComments.length,
    ],
  );

  const fetchStatus = async () => {
    try {
      const res = await authFetch("/api/instagram/ai-agent/status");
      if (res.success) {
        const nextAgent = res.data?.agent || null;
        setAgent(nextAgent);
        setSession(res.data?.session || null);
        setAutoReplyEnabled(!!nextAgent?.autoReplyEnabled);
        setAutoReplyStartedAt(nextAgent?.autoReplyStartedAt || null);
        if (nextAgent?.account) {
          setFormData((prev) => ({
            ...prev,
            niche: nextAgent.account.niche || prev.niche,
            tone: nextAgent.account.tone || prev.tone,
            language: nextAgent.account.language || prev.language,
            about: nextAgent.account.about || prev.about,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch Instagram AI reply status", error);
    }
  };

  const fetchLogs = async (agentId = agent?._id) => {
    if (!agentId) return;
    try {
      const res = await authFetch(
        `/api/instagram/ai-agent/logs?agentId=${agentId}`,
      );
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    }
  };

  const fetchPendingComments = async (options = {}) => {
    const { silent = false } = options;
    if (!agent?._id) return [];
    if (!silent) setLoadingComments(true);
    try {
      const params = autoReplyStartedAt
        ? `?since=${encodeURIComponent(autoReplyStartedAt)}`
        : "";
      console.log(`[fetchPendingComments] Fetching with params: ${params}`);
      const res = await authFetch(
        `/api/instagram/ai-agent/pending-comments${params}`,
      );
      console.log(`[fetchPendingComments] Response:`, {
        success: res.success,
        count: res.data?.count,
        pendingCount: res.data?.pendingComments?.length,
      });
      if (res.success) {
        const nextPendingComments = filterCommentsAfterCutoff(
          res.data?.pendingComments || [],
          autoReplyStartedAt,
        );
        setPendingComments(nextPendingComments);
        setLastRefreshedAt(new Date().toISOString());
        return nextPendingComments;
      } else {
        console.error("[fetchPendingComments] Error:", res.error);
      }
    } catch (error) {
      console.error("Failed to fetch pending comments", error);
    } finally {
      if (!silent) setLoadingComments(false);
    }
    return [];
  };

  const handleCreateAgent = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await authFetch("/api/instagram/ai-agent/setup", {
        method: "POST",
        body: { account: formData, name: "Instagram AI Agent" },
      });
      if (res.success) {
        setAgent(res.data.agent);
        setAutoReplyEnabled(!!res.data.agent?.autoReplyEnabled);
        setAutoReplyStartedAt(res.data.agent?.autoReplyStartedAt || null);
        setFormData(INITIAL_FORM);
        await fetchLogs(res.data.agent?._id);
        await fetchPendingComments({ silent: true });
      } else {
        alert(res.error || "Failed to create agent");
      }
    } catch (error) {
      alert("Failed to create agent. Check console.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAutoReply = async () => {
    if (!agent?._id) return;
    try {
      const endpoint = autoReplyEnabled
        ? "/api/instagram/ai-agent/stop-auto-reply"
        : "/api/instagram/ai-agent/start-auto-reply";
      const res = await authFetch(endpoint, { method: "POST" });
      if (res.success) {
        setAutoReplyEnabled(!autoReplyEnabled);
        const nextStartedAt = autoReplyEnabled
          ? null
          : res.data?.autoReplyStartedAt || new Date().toISOString();
        setAutoReplyStartedAt(nextStartedAt);
        if (!autoReplyEnabled) {
          setPendingComments([]);
          setGeneratedReplies({});
        }
        // start/stop persistent background service so replies continue when
        // user navigates away from this page
        if (!autoReplyEnabled) {
          // we just enabled auto-reply on server
          AutoReplyService.start(
            res.data?.agent?._id || agent?._id,
            nextStartedAt,
          );
        } else {
          // we just disabled auto-reply on server
          AutoReplyService.stop();
        }
      }
    } catch (error) {
      alert("Failed to toggle auto reply");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchStatus(), fetchLogs(), fetchPendingComments()]);
      setLastRefreshedAt(new Date().toISOString());
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateAndPostReply = async (comment) => {
    const id = comment?.comment?.id;
    if (!id) return;
    setPostingReplyId(id);
    try {
      const res = await authFetch("/api/instagram/ai-agent/post-reply", {
        method: "POST",
        body: {
          commentId: id,
          mediaId: comment.mediaId,
          mediaCaption: comment.mediaCaption,
          mediaType: comment.mediaType,
          mediaUrl: comment.mediaUrl,
          likeCount: comment.likeCount || 0,
          commentsCount: comment.commentsCount || 0,
          permalink: comment.permalink,
          commentText: comment.comment.text,
          username: comment.comment.username,
        },
      });

      if (res.success) {
        setGeneratedReplies((prev) => ({
          ...prev,
          [id]: res.data,
        }));
        setPendingComments((prev) =>
          prev.filter((item) => item.comment.id !== id),
        );
        await fetchLogs();
        // re-sync pending comments from server to avoid race conditions
        await fetchPendingComments({ silent: true });
      } else {
        alert(res.error || "Failed to generate and post reply");
      }
    } catch (error) {
      alert("Failed to generate and post reply");
    } finally {
      setPostingReplyId(null);
    }
  };

  const handleAutoReplyBatch = async (comments = []) => {
    const eligibleComments = filterCommentsAfterCutoff(
      comments,
      autoReplyStartedAt,
    );
    if (eligibleComments.length === 0) return 0;
    autoReplyInProgressRef.current = true;
    setAutoReplyInProgress(true);

    const repliedIds = new Set();
    let repliedCount = 0;

    try {
      for (const item of eligibleComments) {
        const delay = Math.random() * 5 + 5;
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));

        const res = await authFetch("/api/instagram/ai-agent/post-reply", {
          method: "POST",
          body: {
            commentId: item.comment.id,
            mediaId: item.mediaId,
            mediaCaption: item.mediaCaption,
            mediaType: item.mediaType,
            mediaUrl: item.mediaUrl,
            likeCount: item.likeCount || 0,
            commentsCount: item.commentsCount || 0,
            permalink: item.permalink,
            commentText: item.comment.text,
            username: item.comment.username,
          },
        });

        if (res.success) {
          repliedIds.add(item.comment.id);
          repliedCount += 1;
          setGeneratedReplies((prev) => ({
            ...prev,
            [item.comment.id]: res.data,
          }));
        }
      }

      if (repliedIds.size > 0) {
        setPendingComments((prev) =>
          prev.filter((item) => !repliedIds.has(item.comment.id)),
        );
      }

      await fetchLogs();
      // re-sync pending comments to ensure background polling doesn't re-add replied items
      await fetchPendingComments({ silent: true });
      return repliedCount;
    } finally {
      autoReplyInProgressRef.current = false;
      setAutoReplyInProgress(false);
    }
  };

  const handleAutoReplyAll = async () => {
    const eligibleComments = filterCommentsAfterCutoff(
      pendingComments,
      autoReplyStartedAt,
    );
    if (eligibleComments.length === 0) return;
    const replied = await handleAutoReplyBatch(eligibleComments);
    alert(`Auto-replied to ${replied}/${eligibleComments.length} comments`);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      await fetchStatus();
      setLoading(false);
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (cancelled) return;
    };
  }, []);

  useEffect(() => {
    if (!agent?._id) return undefined;

    let cancelled = false;

    // UI-only polling: keep the comments list in sync while user is on this page.
    // Do NOT perform automatic replying here — background service handles that.
    const pollComments = async () => {
      if (cancelled) return;
      await fetchPendingComments({ silent: true });
    };

    if (activeTab === "comments") {
      // fetch once when user opens comments tab
      pollComments();
    }

    return () => {
      cancelled = true;
    };
  }, [agent?._id, activeTab, autoReplyStartedAt]);

  useEffect(() => {
    if (agent && activeTab === "history") {
      fetchLogs();
    }
  }, [agent, activeTab]);

  useEffect(() => {
    if (agent && activeTab === "comments") {
      fetchPendingComments();
    }
  }, [agent, activeTab, autoReplyStartedAt]);

  if (loading) {
    return (
      <div
        className={
          isDark
            ? "min-h-screen bg-[#0a0c14] text-white flex items-center justify-center"
            : "min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center"
        }
      >
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          </div>
          <p
            className={
              isDark
                ? "mt-4 text-sm text-slate-300"
                : "mt-4 text-sm text-slate-600"
            }
          >
            Loading AI Reply...
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div
        className={
          isDark
            ? "min-h-screen bg-[#0a0c14] text-white"
            : "min-h-screen bg-slate-50 text-slate-900"
        }
      >
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div
            className={
              isDark
                ? "rounded-3xl border border-white/10 bg-[#111420] p-8 shadow-sm"
                : "rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
            }
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Instagram AI Reply</h1>
                <p
                  className={
                    isDark ? "text-sm text-slate-300" : "text-sm text-slate-600"
                  }
                >
                  Create your agent first, then start auto-reply for new
                  comments only.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Business Niche
                  </label>
                  <input
                    name="niche"
                    value={formData.niche}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        niche: e.target.value,
                      }))
                    }
                    className={
                      isDark
                        ? "w-full rounded-xl border border-white/10 bg-[#0b0d14] px-4 py-3 text-white outline-none focus:border-cyan-400"
                        : "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                    }
                    placeholder="Fashion, Electronics, Food"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Brand Tone
                  </label>
                  <input
                    name="tone"
                    value={formData.tone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tone: e.target.value }))
                    }
                    className={
                      isDark
                        ? "w-full rounded-xl border border-white/10 bg-[#0b0d14] px-4 py-3 text-white outline-none focus:border-cyan-400"
                        : "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                    }
                    placeholder="Friendly, Professional, Casual"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Language
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        language: e.target.value,
                      }))
                    }
                    className={
                      isDark
                        ? "w-full rounded-xl border border-white/10 bg-[#0b0d14] px-4 py-3 text-white outline-none focus:border-cyan-400"
                        : "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                    }
                    required
                  >
                    <option value="">Select language</option>
                    <option value="en">English</option>
                    <option value="hi">Hinglish (Hindi-English)</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    About Your Account
                  </label>
                  <input
                    name="about"
                    value={formData.about}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        about: e.target.value,
                      }))
                    }
                    className={
                      isDark
                        ? "w-full rounded-xl border border-white/10 bg-[#0b0d14] px-4 py-3 text-white outline-none focus:border-cyan-400"
                        : "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-500"
                    }
                    placeholder="Premium shoes from Islamabad"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Create AI Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const statusLive = autoReplyEnabled;

  return (
    <div
      className={
        isDark
          ? "min-h-screen bg-[#0a0c14] text-[#f0f2ff]"
          : "min-h-screen bg-[#f8f9fc] text-slate-900"
      }
    >
      <div className="mx-auto max-w-7xl p-6">
        {/* Stats Section */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            const toneClass =
              item.tone === "cyan"
                ? isDark
                  ? "bg-[#22d3ee18] text-cyan-300"
                  : "bg-cyan-100 text-cyan-700"
                : item.tone === "amber"
                  ? isDark
                    ? "bg-[#f59e0b15] text-amber-300"
                    : "bg-amber-100 text-amber-700"
                  : item.tone === "emerald"
                    ? isDark
                      ? "bg-[#10b98118] text-emerald-300"
                      : "bg-emerald-100 text-emerald-700"
                    : isDark
                      ? "bg-[#a78bfa15] text-purple-300"
                      : "bg-purple-100 text-purple-700";
            return (
              <div
                key={item.label}
                className={
                  isDark
                    ? "rounded-2xl border border-white/10 bg-[#111420] p-5 shadow-lg"
                    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
                }
              >
                <div className="flex items-center justify-between">
                  <div
                    className={
                      isDark
                        ? "text-xs font-medium uppercase tracking-wider text-[#8b92b8]"
                        : "text-xs font-medium uppercase tracking-wider text-slate-500"
                    }
                  >
                    {item.label}
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div
                  className={
                    isDark
                      ? "mt-2 text-2xl font-bold text-[#f0f2ff]"
                      : "mt-2 text-2xl font-bold text-slate-900"
                  }
                >
                  {item.value}
                </div>
                <div
                  className={
                    isDark
                      ? "mt-1 text-sm text-[#8b92b8]"
                      : "mt-1 text-sm text-slate-600"
                  }
                >
                  {item.meta}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Grid Section */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left Column - 8/12 on large screens */}
          <div className="md:col-span-8 space-y-6">
            {/* Comments/History Panel */}
            <div
              className={
                isDark
                  ? "rounded-2xl border border-white/10 bg-[#111420] shadow-lg"
                  : "rounded-2xl border border-slate-200 bg-white shadow-lg"
              }
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-5 pt-4">
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`rounded-t-xl px-4 py-3 text-sm font-medium transition ${activeTab === "comments" ? (isDark ? "border-b-2 border-cyan-400 text-cyan-300" : "border-b-2 border-cyan-600 text-cyan-700") : isDark ? "text-[#8b92b8] hover:text-[#f0f2ff]" : "text-slate-500 hover:text-slate-900"}`}
                >
                  New comments{" "}
                  <span
                    className={
                      isDark
                        ? "ml-1 rounded-full bg-[#1f2440] px-2 py-0.5 text-[10px]"
                        : "ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]"
                    }
                  >
                    {pendingComments.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`rounded-t-xl px-4 py-3 text-sm font-medium transition ${activeTab === "history" ? (isDark ? "border-b-2 border-cyan-400 text-cyan-300" : "border-b-2 border-cyan-600 text-cyan-700") : isDark ? "text-[#8b92b8] hover:text-[#f0f2ff]" : "text-slate-500 hover:text-slate-900"}`}
                >
                  History{" "}
                  <span
                    className={
                      isDark
                        ? "ml-1 rounded-full bg-[#1f2440] px-2 py-0.5 text-[10px]"
                        : "ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px]"
                    }
                  >
                    {logs.length}
                  </span>
                </button>
                <div className="ml-auto flex items-center gap-2 px-5 pb-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={
                      isDark
                        ? "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#181c2e] px-4 py-2 text-sm font-semibold text-[#f0f2ff] transition hover:bg-[#1f2440] disabled:opacity-50"
                        : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    }
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                  <button
                    onClick={handleAutoReplyAll}
                    disabled={
                      !autoReplyEnabled ||
                      autoReplyInProgress ||
                      pendingComments.length === 0
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {autoReplyInProgress ? "Auto-replying..." : "Reply All Now"}
                  </button>
                </div>
              </div>

              <div className="px-5 py-5">
                {activeTab === "comments" ? (
                  loadingComments ? (
                    <div className="flex min-h-[240px] items-center justify-center text-center">
                      <div>
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-300" />
                        <p
                          className={
                            isDark
                              ? "mt-4 text-sm text-[#8b92b8]"
                              : "mt-4 text-sm text-slate-600"
                          }
                        >
                          Fetching comments...
                        </p>
                      </div>
                    </div>
                  ) : pendingComments.length === 0 ? (
                    <div className="flex min-h-[240px] items-center justify-center text-center">
                      <div>
                        <MessageCircle
                          className={
                            isDark
                              ? "mx-auto mb-4 h-12 w-12 text-[#4a5070]"
                              : "mx-auto mb-4 h-12 w-12 text-slate-300"
                          }
                        />
                        <div className="mb-2 text-sm font-semibold">
                          {autoReplyEnabled
                            ? "No pending comments at this time"
                            : "No pending comments"}
                        </div>
                        <p
                          className={
                            isDark
                              ? "max-w-md text-sm text-[#8b92b8]"
                              : "max-w-md text-sm text-slate-600"
                          }
                        >
                          {autoReplyEnabled
                            ? "New comments will appear here automatically when they arrive"
                            : "Start auto reply to begin processing comments"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {pendingComments.map((item) => {
                        const replyData = generatedReplies[item.comment.id];
                        const cardTone = isDark
                          ? "bg-[#181c2e] border-white/10"
                          : "bg-slate-50 border-slate-200";
                        return (
                          <article
                            key={item.comment.id}
                            className={`rounded-2xl border p-5 transition hover:shadow-md ${cardTone}`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <a
                                href={item.permalink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                              >
                                <ExternalLink className="h-3 w-3" /> Open post
                              </a>
                              <span
                                className={
                                  isDark
                                    ? "rounded-full border border-[#22d3ee25] bg-[#22d3ee18] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-cyan-300"
                                    : "rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-cyan-700"
                                }
                              >
                                {String(
                                  item.mediaType || "media",
                                ).toUpperCase()}
                              </span>
                            </div>

                            <div
                              className={
                                isDark
                                  ? "text-sm text-[#8b92b8]"
                                  : "text-sm text-slate-600"
                              }
                            >
                              {shorten(item.mediaCaption, 100)}
                            </div>
                            <div
                              className={
                                isDark
                                  ? "mt-2 flex gap-3 text-xs text-[#4a5070]"
                                  : "mt-2 flex gap-3 text-xs text-slate-500"
                              }
                            >
                              <span className="inline-flex items-center gap-1">
                                <span>♥</span>{" "}
                                {Number(item.likeCount || 0).toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span>💬</span>{" "}
                                {Number(
                                  item.commentsCount || 0,
                                ).toLocaleString()}
                              </span>
                            </div>

                            <div
                              className={
                                isDark
                                  ? "mt-4 rounded-xl border border-white/10 bg-[#0b0d14] p-3"
                                  : "mt-4 rounded-xl border border-slate-200 bg-white p-3"
                              }
                            >
                              <div className="text-sm font-semibold">
                                @{item.comment.username}
                              </div>
                              <div
                                className={
                                  isDark
                                    ? "mt-1 text-sm text-[#8b92b8]"
                                    : "mt-1 text-sm text-slate-700"
                                }
                              >
                                {item.comment.text}
                              </div>
                            </div>

                            {replyData ? (
                              <div
                                className={`mt-4 rounded-xl border p-3 ${getCategoryBadge(
                                  replyData.category,
                                )}`}
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em]">
                                    {String(replyData.category || "GENERAL")}
                                  </div>
                                  <Check className="h-4 w-4" />
                                </div>
                                <div className="text-sm">{replyData.reply}</div>
                              </div>
                            ) : null}

                            <button
                              onClick={() => handleGenerateAndPostReply(item)}
                              disabled={
                                postingReplyId === item.comment.id ||
                                !!replyData
                              }
                              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300" : "bg-cyan-500 text-white hover:bg-cyan-600"}`}
                            >
                              {postingReplyId === item.comment.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                  Generating...
                                </>
                              ) : replyData ? (
                                <>
                                  <Check className="h-4 w-4" /> Posted
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4" /> Generate & Post
                                </>
                              )}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )
                ) : logs.length === 0 ? (
                  <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
                    No logs yet
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <div
                      className={
                        isDark
                          ? "grid grid-cols-[120px_1.2fr_1fr_120px_1.2fr] gap-0 bg-[#181c2e] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b92b8]"
                          : "grid grid-cols-[120px_1.2fr_1fr_120px_1.2fr] gap-0 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
                      }
                    >
                      <div>Date</div>
                      <div>Comment</div>
                      <div>Post</div>
                      <div>Category</div>
                      <div>Reply</div>
                    </div>
                    <div
                      className={
                        isDark
                          ? "divide-y divide-white/10"
                          : "divide-y divide-slate-200"
                      }
                    >
                      {logs.map((log) => (
                        <div
                          key={log._id}
                          className={
                            isDark
                              ? "grid grid-cols-[120px_1.2fr_1fr_120px_1.2fr] gap-0 px-4 py-4 text-sm hover:bg-white/5"
                              : "grid grid-cols-[120px_1.2fr_1fr_120px_1.2fr] gap-0 px-4 py-4 text-sm hover:bg-slate-50"
                          }
                        >
                          <div
                            className={
                              isDark ? "text-[#8b92b8]" : "text-slate-500"
                            }
                          >
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div
                            className={
                              isDark
                                ? "pr-4 text-[#f0f2ff]"
                                : "pr-4 text-slate-900"
                            }
                          >
                            {shorten(log.comment?.text, 60)}
                          </div>
                          <div
                            className={
                              isDark
                                ? "pr-4 text-[#8b92b8]"
                                : "pr-4 text-slate-600"
                            }
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-current">
                                {log.post?.type || "image"}
                              </span>
                              {log.post?.permalink ? (
                                <a
                                  href={log.post.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                                >
                                  <ExternalLink className="h-3 w-3" /> Open Post
                                </a>
                              ) : null}
                              <span
                                className={
                                  isDark
                                    ? "text-xs text-[#4a5070]"
                                    : "text-xs text-slate-500"
                                }
                              >
                                {log.post?.likeCount || 0} likes,
                                {log.post?.commentsCount || 0} comments
                              </span>
                              {log.post?.caption ? (
                                <span
                                  className={
                                    isDark
                                      ? "text-xs text-[#4a5070]"
                                      : "text-xs text-slate-400"
                                  }
                                >
                                  {shorten(log.post.caption, 60)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`rounded-md border px-2 py-1 text-xs font-semibold ${getCategoryBadge(
                                log.category,
                              )}`}
                            >
                              {String(log.category || "GENERAL")}
                            </span>
                          </div>
                          <div
                            className={
                              isDark ? "text-[#8b92b8]" : "text-slate-600"
                            }
                          >
                            {shorten(log.reply, 70)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - 4/12 on large screens */}
          <div className="md:col-span-4 space-y-6">
            {/* Control Panel */}
            <div
              className={
                isDark
                  ? "rounded-2xl border border-white/10 bg-[#111420] shadow-lg"
                  : "rounded-2xl border border-slate-200 bg-white shadow-lg"
              }
            >
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Settings className="h-4 w-4 text-cyan-300" />
                      Control Panel
                    </div>
                    <div
                      className={
                        isDark
                          ? "mt-1 text-sm text-[#8b92b8]"
                          : "mt-1 text-sm text-slate-600"
                      }
                    >
                      Auto reply runs only for comments newer than the start
                      time.
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusLive ? (isDark ? "bg-[#10b98118] text-emerald-300" : "bg-emerald-100 text-emerald-700") : isDark ? "bg-[#94a3b810] text-[#8b92b8]" : "bg-slate-100 text-slate-700"}`}
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-current mr-2 align-middle" />
                    {statusLive ? "Live" : "Paused"}
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div
                  className={
                    isDark
                      ? "rounded-xl border border-white/10 bg-[#181c2e] p-4"
                      : "rounded-xl border border-slate-200 bg-slate-50 p-4"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Auto Reply</div>
                      <div
                        className={
                          isDark
                            ? "text-xs text-[#8b92b8]"
                            : "text-xs text-slate-600"
                        }
                      >
                        {autoReplyEnabled ? "Running" : "Paused"}
                      </div>
                    </div>
                    <button
                      onClick={handleToggleAutoReply}
                      className={`inline-flex h-10 w-14 items-center rounded-full p-1 transition ${autoReplyEnabled ? (isDark ? "bg-amber-500" : "bg-amber-400") : isDark ? "bg-[#ffffff20]" : "bg-slate-300"}`}
                      aria-label="Toggle auto reply"
                    >
                      <span
                        className={`h-8 w-8 rounded-full bg-white transition ${autoReplyEnabled ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                </div>

                <div
                  className={
                    isDark
                      ? "rounded-xl border border-white/10 bg-[#181c2e] p-4"
                      : "rounded-xl border border-slate-200 bg-slate-50 p-4"
                  }
                >
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4a5070]">
                        Window Start
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {autoReplyStartedAt
                          ? formatFull(autoReplyStartedAt)
                          : "Start auto reply to open the new-comments window"}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    isDark
                      ? "rounded-xl border border-white/10 bg-[#181c2e] p-4"
                      : "rounded-xl border border-slate-200 bg-slate-50 p-4"
                  }
                >
                  <div className="flex items-start gap-3">
                    <Filter className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <div
                      className={
                        isDark
                          ? "text-sm text-[#8b92b8]"
                          : "text-sm text-slate-600"
                      }
                    >
                      New-comments-only filter active in backend
                    </div>
                  </div>
                </div>

                <div
                  className={
                    isDark
                      ? "rounded-xl border border-white/10 bg-[#181c2e] p-4"
                      : "rounded-xl border border-slate-200 bg-slate-50 p-4"
                  }
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <div
                      className={
                        isDark
                          ? "text-sm text-[#8b92b8]"
                          : "text-sm text-slate-600"
                      }
                    >
                      Replies post with 5-10s random delay
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleAutoReply}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${autoReplyEnabled ? (isDark ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "bg-amber-400 text-slate-950 hover:bg-amber-300") : isDark ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300" : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"}`}
                >
                  {autoReplyEnabled ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {autoReplyEnabled ? "Pause Auto Reply" : "Start Auto Reply"}
                </button>
              </div>
            </div>

            {/* History Panel */}
            <div
              className={
                isDark
                  ? "rounded-2xl border border-white/10 bg-[#111420] shadow-lg"
                  : "rounded-2xl border border-slate-200 bg-white shadow-lg"
              }
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <History className="h-4 w-4 text-cyan-300" />
                  Recent History
                </div>
                <span
                  className={
                    isDark ? "text-xs text-[#8b92b8]" : "text-xs text-slate-500"
                  }
                >
                  Last 8
                </span>
              </div>
              <div className="space-y-3 p-5">
                {logs.length === 0 ? (
                  <div
                    className={
                      isDark
                        ? "py-8 text-center text-sm text-[#8b92b8]"
                        : "py-8 text-center text-sm text-slate-500"
                    }
                  >
                    No history yet
                  </div>
                ) : (
                  logs.slice(0, 8).map((log) => {
                    const categoryClass = getCategoryBadge(log.category);
                    return (
                      <div
                        key={log._id}
                        className={
                          isDark
                            ? "border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
                            : "border-b border-slate-200 pb-3 last:border-b-0 last:pb-0"
                        }
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={
                              isDark
                                ? "font-mono text-[10px] text-[#4a5070]"
                                : "font-mono text-[10px] text-slate-400"
                            }
                          >
                            {formatTime(log.createdAt)}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${categoryClass}`}
                          >
                            {String(log.category || "GENERAL")}
                          </span>
                        </div>
                        <div
                          className={
                            isDark
                              ? "mb-1 text-sm font-medium text-[#f0f2ff]"
                              : "mb-1 text-sm font-medium text-slate-900"
                          }
                        >
                          {shorten(log.comment?.text, 58)}
                        </div>
                        <div
                          className={
                            isDark
                              ? "text-xs text-[#8b92b8]"
                              : "text-xs text-slate-600"
                          }
                        >
                          {shorten(log.reply, 72)}
                        </div>
                        {log.post?.permalink ? (
                          <a
                            href={log.post.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                          >
                            <ExternalLink className="h-3 w-3" /> Open post
                          </a>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Status Panel */}
            <div
              className={
                isDark
                  ? "rounded-2xl border border-white/10 bg-[#111420] p-5 shadow-lg"
                  : "rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
              }
            >
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-emerald-400" />
                <div className="text-sm font-semibold">
                  Last background refresh
                </div>
              </div>
              <div
                className={
                  isDark
                    ? "mt-2 text-sm text-[#8b92b8]"
                    : "mt-2 text-sm text-slate-600"
                }
              >
                {lastRefreshedAt ? formatFull(lastRefreshedAt) : "Just now"}
              </div>

              <div
                className={
                  isDark
                    ? "mt-4 rounded-2xl border border-white/10 bg-[#111420] p-5 shadow-lg"
                    : "mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
                }
              >
                <div className="text-sm font-semibold">Connected account</div>
                <div
                  className={
                    isDark
                      ? "mt-2 text-sm text-[#8b92b8]"
                      : "mt-2 text-sm text-slate-600"
                  }
                >
                  {session?.graph?.instagramUsername ||
                    agent?.sourceSessionId ||
                    "Instagram account connected"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
