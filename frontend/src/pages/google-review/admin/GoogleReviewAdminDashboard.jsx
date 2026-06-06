import { useState, useEffect } from "react";
import {
  Star,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { authFetch } from "../../../services/authFetch";

export default function GoogleReviewAdminDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchAllSessions = async () => {
    try {
      const res = await authFetch("/api/admin/google-review/sessions");
      if (res.ok) {
        const json = await res.json();
        setSessions(json.sessions || []);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSessions();
  }, []);

  const filteredSessions = sessions.filter((session) => {
    const matchSearch =
      session.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.userId.toString().includes(searchTerm);
    const matchStatus =
      filterStatus === "all" || session.connectionStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    totalBusinesses: sessions.length,
    totalReviews: sessions.reduce((sum, s) => sum + (s.totalReviews || 0), 0),
    avgRating:
      sessions.length > 0
        ? (
            sessions.reduce((sum, s) => sum + (s.averageRating || 0), 0) /
            sessions.length
          ).toFixed(1)
        : 0,
    connectedCount: sessions.filter((s) => s.connectionStatus === "connected")
      .length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <PageHeader
        title="Google Reviews Admin"
        subtitle="Manage all user Google Business connections"
        icon={Star}
        accent="#4285F4"
        tint="rgba(66,133,244,0.08)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Connected Businesses
              </p>
              <Users className="text-blue-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalBusinesses}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              {stats.connectedCount} active
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Total Reviews
              </p>
              <TrendingUp className="text-emerald-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalReviews.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              Across all businesses
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Average Rating
              </p>
              <Star className="text-yellow-500" size={18} fill="currentColor" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.avgRating}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Platform average
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Error Rate
              </p>
              <AlertCircle className="text-orange-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {(
                (sessions.filter((s) => s.connectionStatus === "error").length /
                  stats.totalBusinesses) *
                100
              ).toFixed(1)}
              %
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              Connection issues
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by business name or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="connected">Connected</option>
            <option value="error">Error</option>
            <option value="disconnected">Disconnected</option>
          </select>
        </div>

        {/* Businesses Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                      Business Name
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                      User
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                      Reviews
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-white">
                      Last Sync
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <tr
                        key={session._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-6 py-3 text-slate-900 dark:text-white font-semibold">
                          {session.businessName}
                        </td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                          {session.userId}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <Star
                              size={14}
                              className="text-yellow-400"
                              fill="currentColor"
                            />
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {session.averageRating?.toFixed(1) || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-900 dark:text-white font-semibold">
                          {session.totalReviews}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              session.connectionStatus === "connected"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : session.connectionStatus === "error"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                session.connectionStatus === "connected"
                                  ? "bg-emerald-700 dark:bg-emerald-400"
                                  : session.connectionStatus === "error"
                                    ? "bg-red-700 dark:bg-red-400"
                                    : "bg-slate-700 dark:bg-slate-400"
                              }`}
                            />
                            {session.connectionStatus}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                          {session.lastSyncedAt
                            ? new Date(
                                session.lastSyncedAt,
                              ).toLocaleDateString()
                            : "Never"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center">
                        <p className="text-slate-500 dark:text-slate-400">
                          No businesses found
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
