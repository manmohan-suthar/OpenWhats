import { useState, useEffect, useRef } from "react";
import {
  Brain,
  Plus,
  RefreshCw,
  Send,
  MessageCircle,
  BarChart3,
  Settings,
  ToggleRight,
  Check,
  AlertCircle,
  TrendingUp,
  Filter,
  Clock,
  Sparkles,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";
import { useTheme } from "../../contexts/ThemeContext";

const CATEGORY_COLORS = {
  BUYING_INTENT: "bg-amber-50 border-amber-200 text-amber-800",
  PRAISE: "bg-green-50 border-green-200 text-green-800",
  HATE: "bg-red-50 border-red-200 text-red-800",
  SPAM: "bg-gray-50 border-gray-200 text-gray-800",
  QUESTION: "bg-blue-50 border-blue-200 text-blue-800",
  GENERAL: "bg-purple-50 border-purple-200 text-purple-800",
};

const CATEGORY_EXAMPLES = {
  BUYING_INTENT: {
    example: "bro price kya hai?",
    reply: "Hey! Price details DM kar diye 😊 check karo!",
  },
  PRAISE: { example: "nice post ❤️", reply: "Thank you so much ❤️" },
  HATE: { example: "ye bakwas hai", reply: "Appreciate your feedback 🙏" },
  SPAM: { example: "random spam text", reply: "IGNORE" },
  QUESTION: {
    example: "ye product kaisa hai?",
    reply: "Great question! It's amazing...",
  },
};

export default function InstagramAiAgent() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [testComment, setTestComment] = useState("");
  const [testReply, setTestReply] = useState("");
  const [testing, setTesting] = useState(false);
  const [pendingComments, setPendingComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingReplyId, setPostingReplyId] = useState(null);
  const [generatedReplies, setGeneratedReplies] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [autoReplyInProgress, setAutoReplyInProgress] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyStartedAt, setAutoReplyStartedAt] = useState(null);
  const autoReplyInProgressRef = useRef(false);
  const [settingsData, setSettingsData] = useState({
    niche: "",
    tone: "",
    language: "",
    about: "",
  });
  const [formData, setFormData] = useState({
    niche: "",
    tone: "",
    language: "",
    about: "",
  });

  const fetchAgentStatus = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/instagram/ai-agent/status");
      if (res.success && res.data?.agent) {
        setAgent(res.data.agent);
        setSettingsData({
          niche: res.data.agent.account?.niche || "",
          tone: res.data.agent.account?.tone || "",
          language: res.data.agent.account?.language || "",
          about: res.data.agent.account?.about || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch agent status", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!agent?._id) return;
    try {
      const res = await authFetch("/api/instagram/ai-agent/analytics");
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  useEffect(() => {
    if (agent && activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [agent, activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await authFetch("/api/instagram/ai-agent/setup", {
        method: "POST",
        body: { account: formData },
      });
      if (res.success) {
        setAgent(res.data.agent);
        setFormData({ niche: "", tone: "", language: "", about: "" });
      } else {
        alert("Failed to create agent: " + res.error);
      }
    } catch (err) {
      alert("Failed to create agent. Check console.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!agent?._id) return;
    try {
      const res = await authFetch("/api/instagram/ai-agent/toggle-status", {
        method: "POST",
      });
      if (res.success) {
        setAgent(res.data.agent);
      }
    } catch (err) {
      alert("Failed to toggle status");
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch("/api/instagram/ai-agent/update-settings", {
        method: "POST",
        body: settingsData,
      });
      if (res.success) {
        setAgent(res.data.agent);
        alert("Settings updated!");
      }
    } catch (err) {
      alert("Failed to update settings");
    }
  };

  const fetchLogs = async () => {
    if (!agent?._id) return;
    try {
      const res = await authFetch(
        `/api/instagram/ai-agent/logs?agentId=${agent._id}`,
      );
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const fetchPendingComments = async (options = {}) => {
    const { silent = false } = options;
    if (!agent?._id) return;
    if (!silent) {
      setLoadingComments(true);
    }
    try {
      const res = await authFetch(`/api/instagram/ai-agent/pending-comments`);
      if (res.success) {
        const nextPendingComments = res.data?.pendingComments || [];
        setPendingComments(nextPendingComments);
        return nextPendingComments;
      }
    } catch (err) {
      console.error("Failed to fetch pending comments", err);
    } finally {
      if (!silent) {
        setLoadingComments(false);
      }
    }

    return [];
  };

  const handleTestReply = async () => {
    if (!agent?._id || !testComment.trim()) return;
    setTesting(true);
    try {
      const res = await authFetch("/api/instagram/ai-agent/test-reply", {
        method: "POST",
        body: { comment: { text: testComment, username: "test_user" } },
      });
      if (res.success) {
        setTestReply(res.data);
      } else {
        alert("Failed to generate reply: " + res.error);
      }
    } catch (err) {
      alert("Failed to test reply");
    } finally {
      setTesting(false);
    }
  };

  const handleGenerateAndPostReply = async (comment) => {
    setPostingReplyId(comment.comment.id);
    try {
      const res = await authFetch("/api/instagram/ai-agent/post-reply", {
        method: "POST",
        body: {
          commentId: comment.comment.id,
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
          [comment.comment.id]: res.data,
        }));
        setPendingComments((prev) =>
          prev.filter((c) => c.comment.id !== comment.comment.id),
        );
        fetchLogs();
      }
    } catch (err) {
      alert("Failed to generate and post reply");
    } finally {
      setPostingReplyId(null);
    }
  };

  const handleAutoReplyBatch = async (comments = []) => {
    if (comments.length === 0) {
      return 0;
    }

    autoReplyInProgressRef.current = true;
    setAutoReplyInProgress(true);

    const repliedIds = new Set();
    let repliedCount = 0;

    try {
      for (let i = 0; i < comments.length; i++) {
        const item = comments[i];
        const delay = Math.random() * (10 - 5) + 5;
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

      fetchLogs();
      return repliedCount;
    } finally {
      autoReplyInProgressRef.current = false;
      setAutoReplyInProgress(false);
    }
  };

  const handleAutoReplyAll = async () => {
    if (pendingComments.length === 0) {
      alert("No pending comments");
      return;
    }

    const replied = await handleAutoReplyBatch(pendingComments);
    alert(`Auto-replied to ${replied}/${pendingComments.length} comments`);
  };

  const handleToggleAutoReply = () => {
    setAutoReplyEnabled((prev) => {
      const nextEnabled = !prev;
      if (nextEnabled) {
        const startedAt = new Date().toISOString();
        setAutoReplyStartedAt(startedAt);
        setPendingComments([]);
        setGeneratedReplies({});
      } else {
        setAutoReplyStartedAt(null);
      }
      return nextEnabled;
    });
  };

  useEffect(() => {
    if (!agent?._id) {
      return undefined;
    }

    let cancelled = false;

    const pollComments = async () => {
      if (cancelled || autoReplyInProgressRef.current) {
        return;
      }

      const freshPending = await fetchPendingComments({ silent: true });
      if (
        cancelled ||
        autoReplyInProgressRef.current ||
        !autoReplyEnabled ||
        freshPending.length === 0
      ) {
        return;
      }

      await handleAutoReplyBatch(freshPending);
    };

    if (activeTab === "pending-comments" || autoReplyEnabled) {
      pollComments();
    }

    const intervalId =
      activeTab === "pending-comments" || autoReplyEnabled
        ? setInterval(pollComments, 15000)
        : null;

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [agent?._id, activeTab, autoReplyEnabled]);

  useEffect(() => {
    if (agent && activeTab === "logs") {
      fetchLogs();
    }
  }, [agent, activeTab]);

  useEffect(() => {
    if (agent && activeTab === "pending-comments") {
      fetchPendingComments();
    }
  }, [agent, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading AI Agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        theme === "dark"
          ? "min-h-screen bg-[#0a0c14] text-white"
          : "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-gray-900"
      }
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row (dark/light aware) */}
        <div
          className={
            theme === "dark"
              ? "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
              : "grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
          }
        >
          <div
            className={
              theme === "dark"
                ? "bg-[#111420] border border-white/6 rounded-xl p-4"
                : "bg-white rounded-xl shadow-sm border border-slate-200 p-4"
            }
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300 uppercase">Mode</div>
              <div className="w-8 h-8 rounded-md bg-[#0b1220] flex items-center justify-center text-cyan-300">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-bold text-lg">
              {autoReplyEnabled ? "Auto" : "Idle"}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {autoReplyStartedAt
                ? new Date(autoReplyStartedAt).toLocaleString()
                : "No active window"}
            </div>
          </div>

          <div
            className={
              theme === "dark"
                ? "bg-[#111420] border border-white/6 rounded-xl p-4"
                : "bg-white rounded-xl shadow-sm border border-slate-200 p-4"
            }
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300 uppercase">Pending</div>
              <div className="w-8 h-8 rounded-md bg-[#2a1a05] flex items-center justify-center text-amber-300">
                <MessageCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-bold text-2xl">
              {pendingComments.length}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Comments awaiting reply
            </div>
          </div>

          <div
            className={
              theme === "dark"
                ? "bg-[#111420] border border-white/6 rounded-xl p-4"
                : "bg-white rounded-xl shadow-sm border border-slate-200 p-4"
            }
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300 uppercase">History</div>
              <div className="w-8 h-8 rounded-md bg-[#05221a] flex items-center justify-center text-emerald-300">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-bold text-2xl">
              {agent?.replyCount || 0}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              AI replies saved total
            </div>
          </div>

          <div
            className={
              theme === "dark"
                ? "bg-[#111420] border border-white/6 rounded-xl p-4"
                : "bg-white rounded-xl shadow-sm border border-slate-200 p-4"
            }
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300 uppercase">Refreshed</div>
              <div className="w-8 h-8 rounded-md bg-[#3a2460] flex items-center justify-center text-purple-300">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-bold text-lg">Just now</div>
            <div className="text-sm text-slate-400 mt-1">
              Background polling active
            </div>
          </div>
        </div>
        {/* Create Agent Section */}
        {!agent ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-blue-100 rounded-lg mb-4">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create Your AI Agent
              </h2>
              <p className="text-gray-600">
                Set up an intelligent assistant to automatically reply to
                Instagram comments
              </p>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Niche
                  </label>
                  <input
                    type="text"
                    name="niche"
                    value={formData.niche}
                    onChange={handleInputChange}
                    placeholder="e.g., Fashion, Electronics, Food"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Brand Tone
                  </label>
                  <input
                    type="text"
                    name="tone"
                    value={formData.tone}
                    onChange={handleInputChange}
                    placeholder="e.g., Friendly, Professional, Casual"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  >
                    <option value="">Select language</option>
                    <option value="en">English</option>
                    <option value="hi">Hinglish (Hindi-English)</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    About Your Account
                  </label>
                  <input
                    type="text"
                    name="about"
                    value={formData.about}
                    onChange={handleInputChange}
                    placeholder="e.g., Premium shoes from Islamabad"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Agent...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create AI Agent
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-slate-200 bg-white rounded-t-xl px-6 overflow-x-auto">
              {[
                "dashboard",
                "pending-comments",
                "test",
                "analytics",
                "logs",
                "settings",
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition whitespace-nowrap ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab === "pending-comments"
                    ? "Comments"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-600 font-medium">
                        Total Replies
                      </h3>
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {agent.replyCount || 0}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-600 font-medium">Status</h3>
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${agent.isActive ? "bg-green-500" : "bg-gray-400"}`}
                      ></div>
                      <p className="text-lg font-semibold">
                        {agent.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-600 font-medium">
                        Last Activity
                      </h3>
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                      {agent.lastGeneratedAt
                        ? new Date(agent.lastGeneratedAt).toLocaleDateString()
                        : "No activity yet"}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Agent Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Niche</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {agent.account?.niche}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Brand Tone</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {agent.account?.tone}
                      </p>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Language</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {agent.account?.language}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">About</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {agent.account?.about?.substring(0, 30)}...
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
                  <h3 className="text-lg font-bold mb-2">
                    AI Reply Categories
                  </h3>
                  <p className="text-sm mb-4 opacity-90">
                    Your AI agent can handle 5 different comment types
                  </p>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    {Object.keys(CATEGORY_EXAMPLES).map((cat) => (
                      <div
                        key={cat}
                        className="bg-white/20 rounded p-2 text-center"
                      >
                        <p className="font-semibold">{cat}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pending Comments Tab */}
            {activeTab === "pending-comments" && (
              <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Pending Comments ({pendingComments.length})
                      </h2>
                      <p className="text-sm text-gray-500">
                        Only comments newer than the auto-reply start time are
                        shown.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAutoReplyAll}
                        disabled={
                          autoReplyInProgress || pendingComments.length === 0
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {autoReplyInProgress
                          ? "Auto-replying..."
                          : "Reply All Now"}
                      </button>
                      <button
                        onClick={fetchPendingComments}
                        disabled={loadingComments}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {loadingComments ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600">Fetching comments...</p>
                    </div>
                  ) : pendingComments.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        {autoReplyEnabled
                          ? "No pending comments at this time"
                          : "No pending comments"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {autoReplyEnabled
                          ? "New comments will appear here automatically when they arrive"
                          : "Start auto reply to begin processing comments"}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={
                        theme === "dark"
                          ? "comments-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                          : "comments-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                      }
                    >
                      {pendingComments.map((item, idx) => (
                        <article
                          key={idx}
                          className={
                            theme === "dark"
                              ? "rounded-xl p-4 border border-white/6 hover:border-white/10 transition bg-[#0f1220]"
                              : "border border-gray-200 rounded-xl p-4 hover:shadow-md transition bg-white"
                          }
                        >
                          <div className="mb-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <a
                                href={item.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={
                                  theme === "dark"
                                    ? "text-sm text-cyan-300 hover:text-cyan-200 font-medium underline underline-offset-2"
                                    : "text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                                }
                              >
                                Open Post
                              </a>
                              <span
                                className={
                                  theme === "dark"
                                    ? "text-xs px-2 py-1 rounded-full bg-white/6 text-slate-200 font-semibold"
                                    : "text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold"
                                }
                              >
                                {item.mediaType?.toUpperCase() || "MEDIA"}
                              </span>
                            </div>
                            <p
                              className={
                                theme === "dark"
                                  ? "text-sm text-slate-300 mt-1"
                                  : "text-sm text-gray-600 mt-1"
                              }
                            >
                              {item.mediaCaption?.substring(0, 100)}
                              {item.mediaCaption?.length > 100 ? "..." : ""}
                            </p>
                            <p
                              className={
                                theme === "dark"
                                  ? "text-xs text-slate-400 mt-2"
                                  : "text-xs text-gray-500 mt-2"
                              }
                            >
                              {item.likeCount || 0} likes ·{" "}
                              {item.commentsCount || 0} comments
                            </p>
                          </div>

                          <div
                            className={
                              theme === "dark"
                                ? "bg-[#0b0d14] p-3 rounded-lg mb-3 border border-white/6"
                                : "bg-gray-50 p-3 rounded-lg mb-3 border border-gray-100"
                            }
                          >
                            <p
                              className={
                                theme === "dark"
                                  ? "text-sm font-medium text-white"
                                  : "text-sm font-medium text-gray-900"
                              }
                            >
                              @{item.comment.username}
                            </p>
                            <p
                              className={
                                theme === "dark"
                                  ? "text-sm text-slate-300 mt-1"
                                  : "text-sm text-gray-700 mt-1"
                              }
                            >
                              {item.comment.text}
                            </p>
                          </div>

                          {generatedReplies[item.comment.id] && (
                            <div
                              className={`p-3 rounded-lg mb-3 border ${CATEGORY_COLORS[generatedReplies[item.comment.id].category]}`}
                            >
                              <p className="text-sm font-semibold mb-2">
                                {generatedReplies[item.comment.id].category}
                              </p>
                              <p className="text-sm">
                                {generatedReplies[item.comment.id].reply}
                              </p>
                            </div>
                          )}

                          <button
                            onClick={() => handleGenerateAndPostReply(item)}
                            disabled={
                              postingReplyId === item.comment.id ||
                              !!generatedReplies[item.comment.id]
                            }
                            className={
                              theme === "dark"
                                ? "w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                                : "w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                            }
                          >
                            {postingReplyId === item.comment.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Generating...
                              </>
                            ) : generatedReplies[item.comment.id] ? (
                              <>
                                <Check className="h-4 w-4" />
                                Posted
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                Generate & Post
                              </>
                            )}
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter className="h-4 w-4 text-cyan-300" />
                      <h3 className="font-semibold">New Comments Only</h3>
                    </div>
                    <p className="text-sm text-slate-300">
                      Auto reply starts from the moment you enable it. Older
                      comments stay hidden.
                    </p>
                    <div className="mt-4 rounded-xl bg-white/10 p-4 border border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-300">
                            Mode
                          </p>
                          <p className="font-semibold">
                            {autoReplyEnabled ? "Active" : "Paused"}
                          </p>
                        </div>
                        <Sparkles className="h-5 w-5 text-cyan-300" />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-200">
                        <Clock className="h-4 w-4" />
                        <span>
                          {autoReplyStartedAt
                            ? `Since ${new Date(autoReplyStartedAt).toLocaleString()}`
                            : "Start auto reply to open the new-comments window"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleAutoReply}
                      className={`mt-4 w-full font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition ${autoReplyEnabled ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : "bg-cyan-400 hover:bg-cyan-300 text-slate-950"}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      {autoReplyEnabled
                        ? "Pause Auto Reply"
                        : "Start Auto Reply"}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      Live Summary
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Visible comments</span>
                        <span className="font-semibold text-gray-900">
                          {pendingComments.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Auto reply</span>
                        <span
                          className={`font-semibold ${autoReplyEnabled ? "text-green-600" : "text-gray-700"}`}
                        >
                          {autoReplyEnabled ? "Running" : "Paused"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">New-only filter</span>
                        <span className="font-semibold text-gray-900">
                          Enabled
                        </span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* Test Tab */}
            {activeTab === "test" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Test Reply Generation
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Test Comment
                    </label>
                    <textarea
                      value={testComment}
                      onChange={(e) => setTestComment(e.target.value)}
                      rows="3"
                      placeholder="Enter a sample comment to test AI response"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    onClick={handleTestReply}
                    disabled={testing || !testComment.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 transition"
                  >
                    {testing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Reply
                      </>
                    )}
                  </button>

                  {testReply && (
                    <div
                      className={`p-4 rounded-lg border ${CATEGORY_COLORS[testReply.category]}`}
                    >
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600 uppercase">
                            Category
                          </p>
                          <p className="font-semibold">{testReply.category}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase">
                            Sentiment
                          </p>
                          <p className="font-semibold">{testReply.sentiment}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase mb-1">
                          AI Reply
                        </p>
                        <p className="text-sm">{testReply.reply}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Category Examples
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(CATEGORY_EXAMPLES).map(([cat, data]) => (
                        <div
                          key={cat}
                          className={`p-4 rounded-lg border ${CATEGORY_COLORS[cat]}`}
                        >
                          <p className="font-semibold mb-2">{cat}</p>
                          <p className="text-sm mb-2">
                            <strong>Example:</strong> "{data.example}"
                          </p>
                          <p className="text-sm">
                            <strong>Reply:</strong> "{data.reply}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {analytics ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          By Category
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(analytics.categoryCounts).map(
                            ([cat, count]) => (
                              <div
                                key={cat}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm font-medium text-gray-600">
                                  {cat}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-600 rounded-full"
                                      style={{
                                        width: `${
                                          analytics.totalReplies > 0
                                            ? (count / analytics.totalReplies) *
                                              100
                                            : 0
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                                    {count}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          By Sentiment
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(analytics.sentimentCounts).map(
                            ([sent, count]) => (
                              <div
                                key={sent}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm font-medium text-gray-600">
                                  {sent}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        sent === "POSITIVE"
                                          ? "bg-green-600"
                                          : sent === "NEGATIVE"
                                            ? "bg-red-600"
                                            : "bg-yellow-600"
                                      }`}
                                      style={{
                                        width: `${
                                          analytics.totalReplies > 0
                                            ? (count / analytics.totalReplies) *
                                              100
                                            : 0
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                                    {count}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Daily Activity (Last 7 Days)
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(analytics.last7Days)
                          .reverse()
                          .map(([date, count]) => (
                            <div key={date} className="flex items-center gap-4">
                              <span className="text-sm text-gray-600 w-24">
                                {date}
                              </span>
                              <div className="flex-1 h-8 bg-gray-200 rounded-lg overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                  style={{
                                    width: `${
                                      Math.max(
                                        ...Object.values(analytics.last7Days),
                                      ) > 0
                                        ? (count /
                                            Math.max(
                                              ...Object.values(
                                                analytics.last7Days,
                                              ),
                                            )) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                                {count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Loading analytics...</p>
                  </div>
                )}
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === "logs" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    Activity Log
                  </h2>
                </div>
                {logs.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No logs yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Comment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Post
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                            Reply
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {logs.map((log) => (
                          <tr key={log._id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-600">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-900">
                              {log.comment?.text?.substring(0, 50)}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-gray-900">
                                  {log.post?.type || "image"}
                                </span>
                                {log.post?.permalink ? (
                                  <a
                                    href={log.post.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium underline underline-offset-2"
                                  >
                                    Open Post
                                  </a>
                                ) : null}
                                <span className="text-xs text-gray-500">
                                  {log.post?.likeCount || 0} likes,{" "}
                                  {log.post?.commentsCount || 0} comments
                                </span>
                                {log.post?.caption ? (
                                  <span className="text-xs text-gray-400">
                                    {log.post.caption.substring(0, 60)}
                                    {log.post.caption.length > 60 ? "..." : ""}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${CATEGORY_COLORS[log.category] || "bg-gray-100 text-gray-800"}`}
                              >
                                {log.category}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">
                              {log.reply?.substring(0, 50)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Agent Settings
                </h2>

                <div className="mb-8 pb-8 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Agent Status
                      </h3>
                      <p className="text-sm text-gray-600">
                        {agent.isActive
                          ? "Active - Replying to comments"
                          : "Inactive - Not replying to comments"}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleStatus}
                      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${
                        agent.isActive ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                          agent.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Business Niche
                      </label>
                      <input
                        type="text"
                        name="niche"
                        value={settingsData.niche}
                        onChange={handleSettingsChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Brand Tone
                      </label>
                      <input
                        type="text"
                        name="tone"
                        value={settingsData.tone}
                        onChange={handleSettingsChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        name="language"
                        value={settingsData.language}
                        onChange={handleSettingsChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hinglish</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        About Your Account
                      </label>
                      <input
                        type="text"
                        name="about"
                        value={settingsData.about}
                        onChange={handleSettingsChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
