import {
  Activity,
  BarChart3,
  Camera,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

const adminCards = [
  {
    title: "Connected creators",
    value: "142",
    delta: "+18 this week",
    icon: Users,
  },
  {
    title: "Approved posts",
    value: "89",
    delta: "+11 scheduled",
    icon: Camera,
  },
  {
    title: "Brand-safe actions",
    value: "99.2%",
    delta: "No policy flags",
    icon: Shield,
  },
];

const queue = [
  { name: "Creator onboarding", status: "Review", tone: "pink" },
  { name: "DM automation rules", status: "Live", tone: "orange" },
  { name: "Story campaign brief", status: "Draft", tone: "violet" },
];

export default function InstagramAdminDashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-[#1f0931] via-[#5b1c7d] to-[#e1306c] p-6 text-white shadow-[0_20px_60px_rgba(80,20,110,0.28)] dark:border-pink-900/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur-sm">
              <Sparkles size={12} /> Instagram Admin
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Operate Instagram like a premium SaaS control room.
            </h1>
            <p className="max-w-xl text-sm text-white/82 sm:text-base">
              Monitor creators, approvals, automation rules, and performance
              from a single admin view with a matching Instagram color system.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
              Live guardrail status
            </p>
            <div className="mt-2 flex items-center gap-2 font-semibold">
              <Activity size={16} /> 3 active rule sets
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-md shadow-pink-500/20">
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {card.delta}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {card.title}
              </p>
              <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
                {card.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Admin queue
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Pending approvals and automation
              </h2>
            </div>
            <BarChart3 size={20} className="text-pink-500" />
          </div>

          <div className="mt-5 space-y-3">
            {queue.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Needs attention from the Instagram ops team
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    item.tone === "pink"
                      ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                      : item.tone === "orange"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Operations notes
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            Instagram theme rules
          </h2>
          <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              Use gradient brand accents for CTA actions and selector badges.
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              Keep the content cards airy and high-contrast for creator work.
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              Reuse this shell for inbox, campaigns, analytics, and settings
              views.
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
