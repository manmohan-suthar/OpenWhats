import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Heart,
  MessageCircle,
  Share2,
  User,
  Trash2,
  Archive,
  Mail,
  Search,
  Filter,
  MoreHorizontal,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";

const InstagramNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [actionInProgress, setActionInProgress] = useState(null);

  const normalizeNotifications = (items = []) =>
    items.map((n) => ({
      id: n.id || n._id || n.instagramNotificationId || JSON.stringify(n),
      actor: n.actor || n.userName || n.user || "Instagram",
      type: n.type || n.notificationType || "other",
      text: n.text || n.message || "",
      mediaCaption: n.mediaCaption || n.relatedContent || "",
      timestamp: n.timestamp || n.createdAt || n.time || n.receivedAt || null,
      thumbnail: n.thumbnail || n.userProfilePic || null,
      postId:
        n.postId ||
        n.instagramPostId ||
        (n.metadata && n.metadata.shortcode) ||
        null,
      isRead: !!n.isRead,
      isArchived: !!n.isArchived,
    }));

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dbPromise = authFetch("/api/instagram/db-notifications");
      const livePromise = authFetch("/api/instagram/notifications?limit=100");

      try {
        const db = await dbPromise;
        if (db && db.notifications) {
          setNotifications(normalizeNotifications(db.notifications));
        }
      } catch (dbErr) {
        console.warn("DB notifications fetch failed:", dbErr);
      }

      try {
        const live = await livePromise;
        if (live && live.success) {
          const items = Array.isArray(live.data) ? live.data : live.data || [];
          setNotifications(normalizeNotifications(items));
        }
      } catch (liveErr) {
        console.warn("Live notifications fetch failed:", liveErr);
      }
    } catch (err) {
      setError(err.message || "Failed to load notifications");
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    let filtered = notifications;

    if (filter === "unread") {
      filtered = notifications.filter((n) => !n.isRead && !n.isArchived);
    } else if (filter === "archived") {
      filtered = notifications.filter((n) => n.isArchived);
    } else {
      filtered = notifications.filter((n) => !n.isArchived);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          (n.text || "").toLowerCase().includes(q) ||
          (n.actor || "").toLowerCase().includes(q) ||
          (n.postId || "").toString().toLowerCase().includes(q),
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter, searchTerm]);

  const selectedNotification = useMemo(() => {
    return (
      filteredNotifications.find((n) => n.id === selectedNotificationId) ||
      filteredNotifications[0] ||
      notifications[0] ||
      null
    );
  }, [filteredNotifications, selectedNotificationId, notifications]);

  useEffect(() => {
    if (!filteredNotifications.length) {
      setSelectedNotificationId(null);
      return;
    }

    const stillExists = filteredNotifications.some(
      (n) => n.id === selectedNotificationId,
    );
    if (!selectedNotificationId || !stillExists) {
      setSelectedNotificationId(filteredNotifications[0].id);
    }
  }, [filteredNotifications, selectedNotificationId]);

  const markAsRead = async (notificationId) => {
    try {
      setActionInProgress(notificationId);
      await authFetch(
        `/api/instagram/db-notifications/${notificationId}/read`,
        {
          method: "PUT",
        },
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const markAsUnread = async (notificationId) => {
    try {
      setActionInProgress(notificationId);
      await authFetch(
        `/api/instagram/db-notifications/${notificationId}/unread`,
        {
          method: "PUT",
        },
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: false } : n,
        ),
      );
    } catch (err) {
      console.error("Error marking notification as unread:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const archiveNotification = async (notificationId) => {
    try {
      setActionInProgress(notificationId);
      await authFetch(
        `/api/instagram/db-notifications/${notificationId}/archive`,
        {
          method: "PUT",
        },
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isArchived: true } : n,
        ),
      );
      if (selectedNotificationId === notificationId) {
        setSelectedNotificationId(null);
      }
    } catch (err) {
      console.error("Error archiving notification:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setActionInProgress(notificationId);
      await authFetch(`/api/instagram/db-notifications/${notificationId}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (selectedNotificationId === notificationId) {
        setSelectedNotificationId(null);
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      setActionInProgress("all");
      await authFetch("/api/instagram/db-notifications/mark-all-as-read", {
        method: "PUT",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleSelect = (notificationId) => {
    const next = new Set(selectedNotifications);
    if (next.has(notificationId)) next.delete(notificationId);
    else next.add(notificationId);
    setSelectedNotifications(next);
  };

  const selectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
      return;
    }
    setSelectedNotifications(new Set(filteredNotifications.map((n) => n.id)));
  };

  const getNotificationIcon = (type) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case "like":
        return <Heart className={`${iconClass} text-red-400`} />;
      case "comment":
        return <MessageCircle className={`${iconClass} text-cyan-400`} />;
      case "share":
        return <Share2 className={`${iconClass} text-emerald-400`} />;
      case "follow":
        return <User className={`${iconClass} text-violet-400`} />;
      case "mention":
        return <AlertCircle className={`${iconClass} text-amber-400`} />;
      default:
        return <Bell className={`${iconClass} text-slate-300`} />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Recently";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Recently";
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const unreadCount = notifications.filter(
    (n) => !n.isRead && !n.isArchived,
  ).length;
  const archivedCount = notifications.filter((n) => n.isArchived).length;

  const filterTabs = [
    { value: "all", label: "All", icon: Mail },
    { value: "unread", label: `Unread (${unreadCount})`, icon: Bell },
    { value: "archived", label: `Archived (${archivedCount})`, icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-pink-500/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-4 shadow-lg shadow-pink-500/20">
                <Bell className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Instagram Notifications
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Notification Center
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                  Review engagement, manage read state, archive items, and jump
                  to the post context from one dashboard.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchNotifications}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={actionInProgress === "all"}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {actionInProgress === "all" ? "Updating..." : "Mark all read"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total",
                value: notifications.length,
                icon: Mail,
                tone: "from-cyan-500/20 to-blue-500/10",
              },
              {
                label: "Unread",
                value: unreadCount,
                icon: Bell,
                tone: "from-pink-500/20 to-rose-500/10",
              },
              {
                label: "Archived",
                value: archivedCount,
                icon: Archive,
                tone: "from-violet-500/20 to-fuchsia-500/10",
              },
              {
                label: "Selected",
                value: selectedNotifications.size,
                icon: Filter,
                tone: "from-emerald-500/20 to-teal-500/10",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/10"
                >
                  <div
                    className={`rounded-2xl bg-gradient-to-br ${stat.tone} p-3`}
                  >
                    <Icon className="h-5 w-5 text-white/90" />
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-white">
                    {stat.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Activity Feed
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {filteredNotifications.length} items match your current
                    filter.
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative w-full lg:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search by actor, message, or post id"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {filterTabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = filter === tab.value;
                      return (
                        <button
                          key={tab.value}
                          onClick={() => setFilter(tab.value)}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                            active
                              ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                              : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {selectedNotifications.size > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm">
                  <div className="flex items-center gap-3 text-cyan-100">
                    <CheckCircle className="h-4 w-4" />
                    {selectedNotifications.size} selected
                  </div>
                  <button
                    onClick={() => setSelectedNotifications(new Set())}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-cyan-100 transition hover:bg-cyan-500/10"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-[calc(100vh-24rem)] overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
                  <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-pink-400" />
                  </div>
                  <p className="mt-4 text-sm text-slate-400">
                    Loading notifications...
                  </p>
                </div>
              ) : error ? (
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-rose-500/20 p-3">
                      <AlertCircle className="h-5 w-5 text-rose-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        Error
                      </h3>
                      <p className="mt-1 text-sm text-rose-100/80">{error}</p>
                      <button
                        onClick={fetchNotifications}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-300">
                    <Check className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {filter === "archived"
                      ? "No archived notifications"
                      : "All caught up"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {filter === "archived"
                      ? "Archived items will appear here."
                      : "Your feed is quiet right now."}
                  </p>
                  {filter !== "all" && (
                    <button
                      onClick={() => setFilter("all")}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                      View all notifications
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const isActive = selectedNotificationId === notification.id;
                    const postLink = notification.postId
                      ? `https://instagram.com/p/${notification.postId}`
                      : null;

                    return (
                      <div
                        key={notification.id}
                        className={`group rounded-3xl border p-4 transition ${
                          isActive
                            ? "border-pink-500/40 bg-pink-500/10 shadow-lg shadow-pink-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedNotifications.has(notification.id)}
                            onChange={() => toggleSelect(notification.id)}
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950/70"
                            aria-label="Select notification"
                          />

                          <button
                            onClick={() =>
                              setSelectedNotificationId(notification.id)
                            }
                            className="flex min-w-0 flex-1 items-start gap-4 text-left"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white ring-1 ring-white/10">
                              {getNotificationIcon(notification.type)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-white">
                                  {notification.actor || "Instagram"}
                                </p>
                                {!notification.isRead && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/15 px-2.5 py-1 text-[11px] font-semibold text-pink-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                                    Unread
                                  </span>
                                )}
                                {notification.postId && (
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                                    Post #{notification.postId}
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm leading-6 text-slate-300">
                                {notification.text || "New Instagram activity"}
                              </p>

                              {notification.mediaCaption && (
                                <p className="mt-2 line-clamp-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                                  {notification.mediaCaption}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>
                                  {formatTime(notification.timestamp)}
                                </span>
                                {postLink && (
                                  <a
                                    href={postLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-cyan-300 transition hover:bg-white/10"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Open post
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              {notification.thumbnail && (
                                <img
                                  src={notification.thumbnail}
                                  alt={
                                    notification.postId
                                      ? `Post ${notification.postId}`
                                      : "notification"
                                  }
                                  loading="lazy"
                                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
                                />
                              )}
                              <MoreHorizontal className="mt-1 h-5 w-5 text-slate-500 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100" />
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/20 backdrop-blur-xl">
            {selectedNotification ? (
              <div className="flex h-full flex-col">
                <div className="border-b border-white/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        <Filter className="h-3.5 w-3.5" />
                        Detail View
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-white">
                        {selectedNotification.actor || "Instagram"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatTime(selectedNotification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedNotificationId(null)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-5 p-5">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-white/10">
                        {getNotificationIcon(selectedNotification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {selectedNotification.actor || "Instagram"}
                          </span>
                          {!selectedNotification.isRead && (
                            <span className="rounded-full bg-pink-500/15 px-2.5 py-1 text-[11px] font-semibold text-pink-300">
                              Unread
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {selectedNotification.text ||
                            "New Instagram activity"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedNotification.thumbnail && (
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                      <img
                        src={selectedNotification.thumbnail}
                        alt={
                          selectedNotification.postId
                            ? `Post ${selectedNotification.postId}`
                            : "notification"
                        }
                        className="h-64 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Type
                      </div>
                      <div className="mt-1 text-sm font-medium text-white capitalize">
                        {selectedNotification.type || "other"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Status
                      </div>
                      <div className="mt-1 text-sm font-medium text-white">
                        {selectedNotification.isArchived
                          ? "Archived"
                          : selectedNotification.isRead
                            ? "Read"
                            : "Unread"}
                      </div>
                    </div>
                  </div>

                  {selectedNotification.postId && (
                    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Post ID
                      </div>
                      <a
                        href={`https://instagram.com/p/${selectedNotification.postId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/15"
                      >
                        <Heart className="h-4 w-4" />
                        {selectedNotification.postId}
                      </a>
                    </div>
                  )}

                  {selectedNotification.mediaCaption && (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Caption / Context
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {selectedNotification.mediaCaption}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {!selectedNotification.isRead ? (
                      <button
                        onClick={() => markAsRead(selectedNotification.id)}
                        disabled={actionInProgress === selectedNotification.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark read
                      </button>
                    ) : (
                      <button
                        onClick={() => markAsUnread(selectedNotification.id)}
                        disabled={actionInProgress === selectedNotification.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        <Bell className="h-4 w-4" />
                        Mark unread
                      </button>
                    )}

                    <button
                      onClick={() =>
                        archiveNotification(selectedNotification.id)
                      }
                      disabled={actionInProgress === selectedNotification.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  </div>

                  <button
                    onClick={() => deleteNotification(selectedNotification.id)}
                    disabled={actionInProgress === selectedNotification.id}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete notification
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 text-pink-300 ring-1 ring-white/10">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    Select a notification
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    The detail pane shows the post preview, post id, and quick
                    moderation actions.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default InstagramNotifications;
