import { Camera, Settings, Users, BarChart2 } from "lucide-react";

export default function InstagramOverview() {
  const stats = [
    {
      label: "Connected Accounts",
      value: "0",
      icon: Users,
      color: "text-pink-600",
    },
    {
      label: "Total Followers",
      value: "0",
      icon: Users,
      color: "text-purple-600",
    },
    { label: "Posts", value: "0", icon: Camera, color: "text-orange-600" },
    {
      label: "Engagement Rate",
      value: "0%",
      icon: BarChart2,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Instagram Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your Instagram business accounts and campaigns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.label}
                </h3>
                <Icon size={20} className={stat.color} />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Getting Started Card */}
      <div className="bg-gradient-to-r from-pink-50 to-orange-50 dark:from-pink-900/20 dark:to-orange-900/20 rounded-lg p-6 border border-pink-200 dark:border-pink-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded-lg flex-shrink-0">
            <Camera size={24} className="text-pink-600 dark:text-pink-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Get Started with Instagram
            </h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Connect your Instagram business account to start managing posts,
              messages, and campaigns.
            </p>
            <a
              href="/instagram/connect"
              className="inline-block px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors"
            >
              Connect Account
            </a>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            label: "Manage Posts",
            desc: "Create and schedule posts",
            icon: Camera,
            href: "/instagram/posts",
          },
          {
            label: "Messages",
            desc: "View and respond to DMs",
            icon: "MessageSquare",
            href: "/instagram/dm",
          },
          {
            label: "Analytics",
            desc: "View performance metrics",
            icon: BarChart2,
            href: "/instagram/analytics",
          },
          {
            label: "Settings",
            desc: "Configure your account",
            icon: Settings,
            href: "/instagram/settings",
          },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700 transition-colors cursor-pointer group"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              {link.label}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {link.desc}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
