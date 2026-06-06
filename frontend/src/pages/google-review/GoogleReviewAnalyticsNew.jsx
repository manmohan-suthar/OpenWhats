import { useState, useEffect } from "react";
import {
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
} from "lucide-react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { authFetch } from "../../services/authFetch";

export default function GoogleReviewAnalytics() {
  const { sessionId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("month");

  const fetchAnalytics = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/google-review/${sessionId}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setAnalytics(json.analytics);
      setError(null);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
      <PageHeader
        title="Performance Insights"
        subtitle="Real-time analytics and customer sentiment trends"
        icon={BarChart3}
        accent="#4285F4"
        tint="rgba(66,133,244,0.08)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Controls */}
        <div className="mb-8 flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex gap-2">
            {["week", "month", "year"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-sm capitalize ${
                  dateRange === range
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm">
            <Download size={16} />
            Export
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 flex items-center gap-2">
            ⚠️ {error}
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Reviews */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Total Reviews
                  </p>
                  <BarChart3 className="text-blue-500" size={18} />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {analytics.totalReviews}
                  </p>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                  <ArrowUpRight size={12} />
                  +12% from last month
                </p>
              </div>

              {/* Average Rating */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Average Rating
                  </p>
                  <Star
                    className="text-yellow-500"
                    size={18}
                    fill="currentColor"
                  />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <p className="text-3xl font-bold text-yellow-500">
                    {analytics.avgRating?.toFixed(1) || "0"}
                  </p>
                  <span className="text-lg text-slate-600 dark:text-slate-400 font-normal">
                    / 5
                  </span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                  <ArrowUpRight size={12} />
                  +0.3 this month
                </p>
              </div>

              {/* Replies */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Replies Sent
                  </p>
                  <TrendingUp className="text-emerald-500" size={18} />
                </div>
                <div className="mt-3">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {analytics.repliedReviews || 0}
                  </p>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                  <ArrowUpRight size={12} />
                  {analytics.replyRate || 0}% response rate
                </p>
              </div>

              {/* Pending */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Pending Replies
                  </p>
                  <Activity className="text-orange-500" size={18} />
                </div>
                <div className="mt-3">
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {analytics.unrepliedReviews || 0}
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <Activity size={12} />
                  Respond within 24h
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Rating Distribution */}
              <div className="lg:col-span-1 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-500" />
                    Rating Dist.
                  </h3>
                  <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded">
                    Chart
                  </span>
                </div>

                <div className="space-y-4">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = analytics.ratingDistribution?.[rating] || 0;
                    const percentage = Math.round(
                      (count / analytics.totalReviews) * 100 || 0,
                    );
                    return (
                      <div key={rating} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            {[...Array(rating)].map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                fill="currentColor"
                                className="text-yellow-500"
                              />
                            ))}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sentiment Analysis */}
              <div className="lg:col-span-1 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart size={20} className="text-purple-500" />
                    Sentiment
                  </h3>
                  <span className="text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded">
                    Breakdown
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Positive", emoji: "😊", color: "emerald" },
                    { label: "Neutral", emoji: "😐", color: "slate" },
                    { label: "Negative", emoji: "😞", color: "red" },
                  ].map((sentiment) => {
                    const count =
                      analytics.sentimentCounts?.[
                        sentiment.label.toLowerCase()
                      ] || 0;
                    const percentage = Math.round(
                      (count / analytics.totalReviews) * 100 || 0,
                    );
                    const colorClasses = {
                      emerald:
                        "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800",
                      slate:
                        "bg-slate-50 dark:bg-slate-700/20 border-slate-200 dark:border-slate-700",
                      red: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800",
                    };
                    const textClasses = {
                      emerald: "text-emerald-900 dark:text-emerald-100",
                      slate: "text-slate-900 dark:text-slate-100",
                      red: "text-red-900 dark:text-red-100",
                    };
                    return (
                      <div
                        key={sentiment.label}
                        className={`${colorClasses[sentiment.color]} rounded-lg border p-3`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`font-bold text-sm flex items-center gap-2 ${textClasses[sentiment.color]}`}
                          >
                            {sentiment.emoji} {sentiment.label}
                          </span>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">
                            {percentage}%
                          </span>
                        </div>
                        <div
                          className={`h-2 bg-${sentiment.color}-100 dark:bg-${sentiment.color}-900/20 rounded-full overflow-hidden`}
                        >
                          <div
                            className={`h-full bg-gradient-to-r from-${sentiment.color}-400 to-${sentiment.color}-500 rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p
                          className={`text-xs mt-1`}
                          style={{
                            color:
                              sentiment.color === "emerald"
                                ? "#059669"
                                : sentiment.color === "red"
                                  ? "#dc2626"
                                  : "#6b7280",
                          }}
                        >
                          {count} reviews
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Response Rate */}
              <div className="lg:col-span-1 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity size={20} className="text-blue-500" />
                    Response Rate
                  </h3>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                    Live
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                      <svg
                        className="transform -rotate-90"
                        width="96"
                        height="96"
                      >
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-slate-200 dark:text-slate-700"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          strokeDasharray={`${((analytics.replyRate || 0) / 100) * 251} 251`}
                          className="transition-all duration-500"
                        />
                        <defs>
                          <linearGradient
                            id="gradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="absolute text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {analytics.replyRate || 0}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                        {analytics.repliedReviews || 0}
                      </p>
                      <p className="text-emerald-600 dark:text-emerald-500 text-xs font-semibold">
                        Replied
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-orange-700 dark:text-orange-400 font-bold text-lg">
                        {analytics.unrepliedReviews || 0}
                      </p>
                      <p className="text-orange-600 dark:text-orange-500 text-xs font-semibold">
                        Pending
                      </p>
                    </div>
                  </div>

                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${analytics.replyRate || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Insights Section */}
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                💡 Insights & Recommendations
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <span className="font-bold">Strong Performance:</span> Your
                    average rating of {analytics.avgRating?.toFixed(1)} is
                    excellent! Keep up the great work responding to reviews.
                  </p>
                </div>
                {analytics.unrepliedReviews > 5 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-900 dark:text-orange-100">
                      <span className="font-bold">Action Needed:</span> You have{" "}
                      {analytics.unrepliedReviews} pending reviews. Respond
                      within 24 hours for better engagement.
                    </p>
                  </div>
                )}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-900 dark:text-emerald-100">
                    <span className="font-bold">Response Rate:</span> You're
                    maintaining a {analytics.replyRate || 0}% response rate. Aim
                    for 100% for best results.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-600 dark:text-slate-400">
              No analytics data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
