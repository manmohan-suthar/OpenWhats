import { BarChart2, TrendingUp, Users, Heart, Eye, Share2 } from "lucide-react";

export default function InstagramAnalytics() {
  const metrics = [
    {
      label: "Total Impressions",
      value: "0",
      change: "0%",
      icon: Eye,
      color: "text-blue-600",
    },
    {
      label: "Engagement Rate",
      value: "0%",
      change: "0%",
      icon: Heart,
      color: "text-pink-600",
    },
    {
      label: "Follower Growth",
      value: "0",
      change: "0%",
      icon: Users,
      color: "text-purple-600",
    },
    {
      label: "Shares",
      value: "0",
      change: "0%",
      icon: Share2,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          View detailed insights about your Instagram account performance
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {metric.label}
                </h3>
                <Icon size={20} className={metric.color} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metric.value}
                </p>
                <span
                  className={`text-sm font-semibold ${metric.change.startsWith("-") ? "text-red-600" : "text-green-600"}`}
                >
                  {metric.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Performance Over Time
        </h2>
        <div className="h-80 bg-slate-50 dark:bg-slate-700 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart2 size={48} className="mx-auto mb-3 text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400">
              Connect your account to view analytics
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performing Posts */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Top Performing Posts
          </h3>
          <div className="space-y-3 opacity-50">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
              >
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Post {i}
                  </p>
                  <p className="text-xs text-slate-500">0 engagements</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Demographics */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Audience Demographics
          </h3>
          <div className="space-y-3 opacity-50">
            {[
              { label: "Age 18-24", value: "0%" },
              { label: "Age 25-34", value: "0%" },
              { label: "Age 35-44", value: "0%" },
              { label: "Age 45+", value: "0%" },
            ].map((demo) => (
              <div
                key={demo.label}
                className="flex items-center justify-between"
              >
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {demo.label}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {demo.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Date Range:
        </label>
        <select className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>Last 365 days</option>
        </select>
      </div>
    </div>
  );
}
