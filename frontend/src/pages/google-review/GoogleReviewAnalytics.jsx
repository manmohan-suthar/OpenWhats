import { useState, useEffect } from "react";
import {
  Star,
  BarChart3,
  Loader2,
  Download,
  ArrowUpRight,
  Activity,
  PieChart,
} from "lucide-react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { authFetch } from "../../services/authFetch";

function MetricCard({ label, value, icon: Icon, trend, tone = "blue" }) {
  const tones = {
    blue: "text-blue-600 dark:text-blue-400",
    yellow: "text-yellow-500",
    emerald: "text-emerald-600 dark:text-emerald-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <Icon size={18} className={tones[tone]} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          {value}
        </span>
      </div>
      {trend && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
          <ArrowUpRight size={12} />
          {trend}
        </p>
      )}
    </div>
  );
}

function normalizeRatingDistribution(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.map((entry) => [entry._id, entry.count]);
  return Object.entries(data);
}

function normalizeSentimentDistribution(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.map((entry) => [entry._id, entry.count]);
  return Object.entries(data);
}

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

  const totalReviews = analytics?.totalReviews || 0;
  const averageRating = analytics?.averageRating || analytics?.avgRating || 0;
  const repliedReviews = analytics?.repliedReviews || 0;
  const unrepliedReviews = analytics?.unrepliedReviews || 0;
  const replyRate =
    analytics?.replyRate ||
    (totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0);

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
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex gap-2 flex-wrap">
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

          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                label="Total Reviews"
                value={totalReviews}
                icon={BarChart3}
                trend="+12% from last month"
                tone="blue"
              />
              <MetricCard
                label="Average Rating"
                value={Number(averageRating).toFixed(1)}
                icon={Star}
                trend="+0.3 this month"
                tone="yellow"
              />
              <MetricCard
                label="Replies Sent"
                value={repliedReviews}
                icon={Activity}
                trend={`${replyRate}% response rate`}
                tone="emerald"
              />
              <MetricCard
                label="Pending Replies"
                value={unrepliedReviews}
                icon={PieChart}
                trend="Respond within 24h"
                tone="orange"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all lg:col-span-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-500" />
                    Rating Distribution
                  </h3>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                    Chart
                  </span>
                </div>

                <div className="space-y-4">
                  {normalizeRatingDistribution(analytics.ratingDistribution)
                    .length > 0
                    ? normalizeRatingDistribution(analytics.ratingDistribution)
                        .sort((a, b) => Number(b[0]) - Number(a[0]))
                        .map(([ratingKey, count]) => {
                          const rating = Number(ratingKey);
                          const percentage =
                            totalReviews > 0
                              ? Math.round((Number(count) / totalReviews) * 100)
                              : 0;
                          return (
                            <div key={rating} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-yellow-500">
                                  {[...Array(rating)].map((_, index) => (
                                    <Star
                                      key={index}
                                      size={12}
                                      fill="currentColor"
                                    />
                                  ))}
                                </div>
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
                        })
                    : [5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-yellow-500">
                              {[...Array(rating)].map((_, index) => (
                                <Star
                                  key={index}
                                  size={12}
                                  fill="currentColor"
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              0 (0%)
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 rounded-full w-0" />
                          </div>
                        </div>
                      ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all lg:col-span-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart size={20} className="text-purple-500" />
                    Sentiment Breakdown
                  </h3>
                  <span className="text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded">
                    Breakdown
                  </span>
                </div>

                <div className="space-y-4">
                  {normalizeSentimentDistribution(
                    analytics.sentimentDistribution,
                  ).length > 0
                    ? normalizeSentimentDistribution(
                        analytics.sentimentDistribution,
                      ).map(([key, count]) => {
                        const percentage =
                          totalReviews > 0
                            ? Math.round((Number(count) / totalReviews) * 100)
                            : 0;
                        const tone =
                          key === "positive"
                            ? "emerald"
                            : key === "negative"
                              ? "red"
                              : "slate";
                        const toneClass =
                          tone === "emerald"
                            ? "from-emerald-400 to-emerald-500"
                            : tone === "red"
                              ? "from-red-400 to-red-500"
                              : "from-slate-400 to-slate-500";
                        return (
                          <div
                            key={key}
                            className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700/30 dark:to-slate-700/10 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100 capitalize">
                                {key === "positive"
                                  ? "😊"
                                  : key === "negative"
                                    ? "😞"
                                    : "😐"}
                                {key}
                              </span>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">
                                {percentage}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${toneClass} rounded-full transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {count} reviews
                            </p>
                          </div>
                        );
                      })
                    : ["positive", "neutral", "negative"].map((key) => (
                        <div
                          key={key}
                          className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700/30 dark:to-slate-700/10 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100 capitalize">
                              {key === "positive"
                                ? "😊"
                                : key === "negative"
                                  ? "😞"
                                  : "😐"}
                              {key}
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                              0%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full w-0" />
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            0 reviews
                          </p>
                        </div>
                      ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all lg:col-span-1">
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
                        viewBox="0 0 96 96"
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
                          stroke="#4285F4"
                          strokeWidth="8"
                          strokeDasharray={`${(replyRate / 100) * 251.2} 251.2`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <span className="absolute text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {replyRate}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                        {repliedReviews}
                      </p>
                      <p className="text-emerald-600 dark:text-emerald-500 text-xs font-semibold">
                        Replied
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-orange-700 dark:text-orange-400 font-bold text-lg">
                        {unrepliedReviews}
                      </p>
                      <p className="text-orange-600 dark:text-orange-500 text-xs font-semibold">
                        Pending
                      </p>
                    </div>
                  </div>

                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${replyRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                💡 Insights & Recommendations
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <span className="font-bold">Strong Performance:</span> Your
                    average rating of {Number(averageRating).toFixed(1)} is
                    excellent.
                  </p>
                </div>
                {unrepliedReviews > 5 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-900 dark:text-orange-100">
                      <span className="font-bold">Action Needed:</span> You have{" "}
                      {unrepliedReviews} pending reviews. Respond within 24
                      hours for better engagement.
                    </p>
                  </div>
                )}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-900 dark:text-emerald-100">
                    <span className="font-bold">Response Rate:</span> You're
                    maintaining a {replyRate}% response rate. Aim for 100% for
                    best results.
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
