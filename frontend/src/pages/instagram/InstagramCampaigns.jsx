import { Plus, Target, BarChart3, Calendar } from "lucide-react";

export default function InstagramCampaigns() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Campaigns
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and manage Instagram marketing campaigns
          </p>
        </div>
        <button className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus size={18} />
          New Campaign
        </button>
      </div>

      {/* Create Campaign Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <Target size={32} className="text-pink-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Create Your First Campaign
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Launch targeted campaigns to grow your Instagram presence and reach
        </p>
        <button className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors">
          Create Campaign
        </button>
      </div>

      {/* Campaign Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Awareness",
            desc: "Build brand recognition and reach new audiences",
            icon: Target,
          },
          {
            title: "Engagement",
            desc: "Increase interactions with your content",
            icon: BarChart3,
          },
          {
            title: "Conversion",
            desc: "Drive traffic and conversions",
            icon: Calendar,
          },
        ].map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.title}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
            >
              <Icon size={32} className="text-pink-600 mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                {type.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {type.desc}
              </p>
              <button className="w-full px-4 py-2 border border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400 rounded-lg font-medium hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
                Get Started
              </button>
            </div>
          );
        })}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            title: "Advanced Targeting",
            desc: "Target by demographics, interests, behaviors, and more",
          },
          {
            title: "A/B Testing",
            desc: "Test different variations to optimize performance",
          },
          {
            title: "Budget Management",
            desc: "Set daily or lifetime budgets for campaigns",
          },
          {
            title: "Real-time Analytics",
            desc: "Monitor campaign performance in real-time",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 opacity-50"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {feature.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {feature.desc}
            </p>
            <div className="mt-4 px-3 py-1 inline-block bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded">
              Coming Soon
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
