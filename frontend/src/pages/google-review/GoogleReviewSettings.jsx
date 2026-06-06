import { useState, useEffect } from "react";
import { Star, Settings, Loader2, Trash2, Link, Unlink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { authFetch } from "../../services/authFetch";

export default function GoogleReviewSettings() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchSessions = async () => {
    try {
      const res = await authFetch("/api/google-review/sessions");
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

  const handleDelete = async (sessionId) => {
    if (!confirm("Are you sure you want to disconnect this business?")) return;

    setDeleting(sessionId);
    try {
      // Assuming DELETE endpoint exists
      const res = await authFetch(`/api/google-review/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <PageHeader
        title="Settings"
        subtitle="Manage your Google Business connections"
        icon={Settings}
        accent="#4285F4"
        tint="rgba(66,133,244,0.08)"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Connected Businesses
            </h2>
            <button
              onClick={() => navigate("/google-review/connect")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              <Link size={16} />
              Add Business
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <Star
                size={48}
                className="mx-auto text-slate-300 dark:text-slate-600 mb-4"
              />
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No businesses connected yet
              </p>
              <button
                onClick={() => navigate("/google-review/connect")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
              >
                Connect Your First Business
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="p-6 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-700/50 dark:to-transparent rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {session.businessName}
                      </h3>

                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {session.businessAddress && (
                          <p>📍 {session.businessAddress}</p>
                        )}
                        {session.businessPhone && (
                          <p>📞 {session.businessPhone}</p>
                        )}
                        {session.businessWebsite && (
                          <p>🌐 {session.businessWebsite}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className="text-sm">
                          <p className="text-slate-500 dark:text-slate-400">
                            Rating
                          </p>
                          <p className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                            <Star size={16} className="text-yellow-400" />
                            {session.averageRating?.toFixed(1) || "N/A"}
                          </p>
                        </div>

                        <div className="text-sm">
                          <p className="text-slate-500 dark:text-slate-400">
                            Reviews
                          </p>
                          <p className="text-lg font-semibold text-slate-900 dark:text-white">
                            {session.totalReviews}
                          </p>
                        </div>

                        <div className="text-sm">
                          <p className="text-slate-500 dark:text-slate-400">
                            Last Sync
                          </p>
                          <p className="text-lg font-semibold text-slate-900 dark:text-white">
                            {session.lastSyncedAt
                              ? new Date(
                                  session.lastSyncedAt,
                                ).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>

                        <div className="text-sm">
                          <p className="text-slate-500 dark:text-slate-400">
                            Status
                          </p>
                          <p
                            className={`text-lg font-semibold inline-flex items-center gap-1 ${
                              session.connectionStatus === "connected"
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                session.connectionStatus === "connected"
                                  ? "bg-emerald-600"
                                  : "bg-red-600"
                              }`}
                            />
                            {session.connectionStatus}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(session._id)}
                      disabled={deleting === session._id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {deleting === session._id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Unlink size={16} />
                      )}
                      {deleting === session._id
                        ? "Disconnecting..."
                        : "Disconnect"}
                    </button>
                  </div>

                  {session.connectionError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                        Connection Error
                      </p>
                      <p className="text-sm text-red-900 dark:text-red-100">
                        {session.connectionError}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            Notifications
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 accent-blue-500 rounded"
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  New Review Notifications
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get notified when you receive a new review
                </p>
              </div>
            </label>

            <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 accent-blue-500 rounded"
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Low Rating Alerts
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Alert me about 1-2 star reviews
                </p>
              </div>
            </label>

            <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                defaultChecked={false}
                className="w-4 h-4 accent-blue-500 rounded"
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Weekly Summary
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get a weekly summary of your reviews
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
