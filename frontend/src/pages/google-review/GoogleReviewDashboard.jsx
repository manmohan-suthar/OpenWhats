import { useState, useEffect, useCallback } from "react";
import {
  Star,
  TrendingUp,
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
  Crown,
  Calendar,
  AlertTriangle,
  Clock,
  Zap,
  Loader2,
  BarChart3,
  Send,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import { MessageAreaChart } from "../../components/ui/ActivityChart";
import { useAuth } from "../../contexts/AuthContext";
import { authFetch } from "../../services/authFetch";

function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RatingBadge({ rating }) {
  const colors = {
    1: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    2: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    3: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    4: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    5: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors[rating] || colors[3]}`}
    >
      <Star size={12} fill="currentColor" />
      <span>{rating}</span>
    </div>
  );
}

export default function GoogleReviewDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await authFetch("/api/google-review/sessions");
      if (res.ok) {
        const json = await res.json();
        setSessions(json.sessions || []);
        if (json.sessions?.length > 0) {
          setActiveSession(json.sessions[0]._id);
        }
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  }, []);

  const fetchReviews = useCallback(async (sessionId) => {
    try {
      const res = await authFetch(
        `/api/google-review/${sessionId}/reviews?limit=5&status=new`,
      );
      if (res.ok) {
        const json = await res.json();
        setRecentReviews(json.reviews || []);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  }, []);

  const fetchAnalytics = useCallback(async (sessionId) => {
    try {
      const res = await authFetch(`/api/google-review/${sessionId}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setData(json.analytics);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(
    async (sessionId) => {
      setSyncing(true);
      try {
        const res = await authFetch(`/api/google-review/${sessionId}/sync`, {
          method: "POST",
        });
        if (res.ok) {
          await fetchAnalytics(sessionId);
          await fetchReviews(sessionId);
        }
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setSyncing(false);
      }
    },
    [fetchAnalytics, fetchReviews],
  );

  useEffect(() => {
    setLoading(true);
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (activeSession) {
      fetchAnalytics(activeSession);
      fetchReviews(activeSession);
    }
  }, [activeSession, fetchAnalytics, fetchReviews]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <PageHeader
        title="Google Reviews"
        subtitle="Monitor and manage your business reviews"
        icon={Star}
        accent="#4285F4"
        tint="rgba(66,133,244,0.08)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Business Selector */}
        {sessions.length > 0 && (
          <div className="mb-8 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-3">
              Select Business
            </label>
            <select
              value={activeSession || ""}
              onChange={(e) => setActiveSession(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.businessName} ({session.averageRating}⭐)
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
            <Star
              size={48}
              className="mx-auto text-slate-300 dark:text-slate-600 mb-4"
            />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No businesses connected
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Connect your Google Business to start managing reviews
            </p>
            <button
              onClick={() => navigate("/google-review/connect")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              <Plus size={18} />
              Connect Business
            </button>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Star}
                label="Average Rating"
                value={data.averageRating?.toFixed(1) || "0"}
                subtext={`${data.totalReviews} reviews`}
                accent="#34A853"
                tint="rgba(52,168,83,0.08)"
              />
              <StatCard
                icon={MessageCircle}
                label="Total Reviews"
                value={data.totalReviews?.toLocaleString() || "0"}
                subtext={`${data.replyRate || 0}% replied`}
                accent="#4285F4"
                tint="rgba(66,133,244,0.08)"
              />
              <StatCard
                icon={TrendingUp}
                label="Replied Reviews"
                value={data.repliedReviews?.toLocaleString() || "0"}
                subtext="In response"
                accent="#FBBC04"
                tint="rgba(251,188,4,0.08)"
              />
              <StatCard
                icon={Users}
                label="Engagement"
                value={`${data.replyRate || 0}%`}
                subtext="Reply rate"
                accent="#EA4335"
                tint="rgba(234,67,53,0.08)"
              />
            </div>

            {/* Rating Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Rating Distribution
                  </h3>
                  <button
                    onClick={() => handleSync(activeSession)}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      size={16}
                      className={syncing ? "animate-spin" : ""}
                    />
                    {syncing ? "Syncing..." : "Sync"}
                  </button>
                </div>

                <div className="space-y-4">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const ratingData = data.ratingDistribution?.find(
                      (d) => d._id === rating,
                    ) || { _id: rating, count: 0 };
                    const percentage =
                      data.totalReviews > 0
                        ? (ratingData.count / data.totalReviews) * 100
                        : 0;

                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12">
                          {[...Array(rating)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill="#34A853"
                              className="text-emerald-500"
                            />
                          ))}
                        </div>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 w-12 text-right">
                          {ratingData.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sentiment Breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                  Sentiment Analysis
                </h3>
                <div className="space-y-4">
                  {data.sentimentDistribution?.map((sentiment) => (
                    <div
                      key={sentiment._id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              sentiment._id === "positive"
                                ? "#34A853"
                                : sentiment._id === "negative"
                                  ? "#EA4335"
                                  : "#FBBC04",
                          }}
                        />
                        <span className="text-sm capitalize text-slate-600 dark:text-slate-400">
                          {sentiment._id}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {sentiment.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Recent Reviews
                </h3>
                <button
                  onClick={() => navigate("/google-review/reviews")}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  View all
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="space-y-4">
                {recentReviews.length > 0 ? (
                  recentReviews.map((review) => (
                    <div
                      key={review._id}
                      className="p-4 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-700/50 dark:to-transparent rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          {review.authorPhoto && (
                            <img
                              src={review.authorPhoto}
                              alt={review.authorName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {review.authorName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {timeAgo(review.reviewDate)}
                            </p>
                          </div>
                        </div>
                        <RatingBadge rating={review.rating} />
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                        {review.reviewText}
                      </p>

                      {review.isReplied && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-sm">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                            Your reply
                          </p>
                          <p className="text-blue-900 dark:text-blue-100">
                            {review.replyText}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No reviews yet. Sync to get the latest reviews.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
