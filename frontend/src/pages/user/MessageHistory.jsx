import { useState, useEffect } from "react";
import {
  Phone,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import api from "../../services/api";

const MessageHistory = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
  });

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadSessions();
  }, [isAuthenticated, navigate]);

  // Load messages when session changes
  useEffect(() => {
    if (selectedSession) {
      loadMessages();
    }
  }, [selectedSession]);

  // Filter messages on search/status change
  useEffect(() => {
    filterMessages();
  }, [searchTerm, statusFilter, messages]);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      const connectedSessions = (Array.isArray(data.data) ? data.data : []).filter(
        (s) => s.status === "connected",
      );
      setSessions(connectedSessions);
      if (connectedSessions.length > 0) {
        setSelectedSession(connectedSessions[0].sessionId);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await api.getSessionMessages(selectedSession, 50, 0);
      setMessages(data.messages || []);
      setPagination({
        limit: data.limit,
        offset: data.offset,
        total: data.total,
      });
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = messages;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    // Filter by search term (phone or contact name)
    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.phoneNumber.includes(searchTerm) ||
          (m.contactName &&
            m.contactName.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    setFilteredMessages(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return (
          <span className="text-slate-500 font-bold text-lg flex items-center gap-0.5">
            ✓
          </span>
        );
      case "delivered":
        return (
          <span className="text-slate-500 font-bold text-lg flex items-center gap-0">
            ✓✓
          </span>
        );
      case "read":
        return (
          <span className="text-blue-500 font-bold text-lg flex items-center gap-0">
            ✓✓
          </span>
        );
      case "pending":
        return <Clock size={16} className="text-amber-500 animate-spin" />;
      case "failed":
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
      },
      delivered: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-300",
      },
      read: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-300",
      },
      pending: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-300",
      },
      failed: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-300",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="page space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <PageHeader
            title="Message History"
            subtitle="View all your sent messages with delivery status"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Session Selector */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">
              <Phone size={12} className="inline mr-1" />
              WhatsApp Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full input text-sm"
            >
              <option value="">Select session...</option>
              {sessions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.name} — {s.phoneNumber || "Connecting..."}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase flex items-center gap-2">
              <Filter size={12} />
              Filter by Status
            </label>
            <div className="space-y-2">
              {[
                { value: "all", label: "All Messages" },
                { value: "pending", label: "Pending" },
                { value: "sent", label: "Sent ✓" },
                { value: "delivered", label: "Delivered ✓✓" },
                { value: "read", label: "Read ✓✓" },
                { value: "failed", label: "Failed" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === filter.value
                      ? "bg-primary-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
              Stats
            </p>
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {filteredMessages.length}
            </div>
            <p className="text-xs text-slate-500">
              {statusFilter === "all"
                ? "Total messages"
                : `${statusFilter} messages`}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search Bar */}
          <div className="card p-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by phone or contact name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full input pl-10"
              />
            </div>
          </div>

          {/* Messages Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader
                  size={24}
                  className="animate-spin text-primary-500 mr-2"
                />
                <span className="text-slate-600 dark:text-slate-400">
                  Loading messages...
                </span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Eye size={24} className="text-slate-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  No messages found
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Select a session to view messages"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Recipient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Sent At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Delivered
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Read
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMessages.map((msg, idx) => (
                      <tr
                        key={msg.messageId || idx}
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Recipient */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <p className="font-medium text-slate-900 dark:text-white text-sm">
                              {msg.contactName || "Unknown"}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {msg.phoneNumber}
                            </p>
                          </div>
                        </td>

                        {/* Message */}
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 max-w-xs">
                            {msg.message}
                          </p>
                        </td>

                        {/* Status with tick marks */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(msg.status)}
                            {getStatusBadge(msg.status)}
                          </div>
                        </td>

                        {/* Sent At */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-xs">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {formatDate(msg.sentAt || msg.createdAt)}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {formatTime(msg.sentAt || msg.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* Delivered At */}
                        <td className="px-4 py-3">
                          {msg.deliveredAt ? (
                            <div className="flex flex-col text-xs">
                              <span className="text-slate-900 dark:text-white">
                                {formatTime(msg.deliveredAt)}
                              </span>
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                ✓ Delivered
                              </span>
                            </div>
                          ) : msg.status !== "sent" &&
                            msg.status !== "pending" &&
                            msg.status !== "failed" ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Read At */}
                        <td className="px-4 py-3">
                          {msg.readAt ? (
                            <div className="flex flex-col text-xs">
                              <span className="text-slate-900 dark:text-white">
                                {formatTime(msg.readAt)}
                              </span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                ✓✓ Read
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Info */}
          {messages.length > 0 && (
            <div className="card p-4 flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredMessages.length} of {pagination.total} messages
              </p>
              <button
                onClick={() => {
                  setPagination({
                    ...pagination,
                    offset: pagination.offset + pagination.limit,
                  });
                  loadMessages();
                }}
                disabled={
                  pagination.offset + pagination.limit >= pagination.total
                }
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageHistory;
