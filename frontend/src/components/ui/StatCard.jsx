import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, iconColor = 'text-primary-600', iconBg = 'bg-primary-50 dark:bg-primary-900/20', trend, trendValue, loading = false }) {
  if (loading) {
    return (
      <div className="stat-card">
        <div className="flex items-start justify-between mb-3">
          <div className="skeleton h-9 w-9 rounded-lg" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="skeleton h-7 w-24 rounded mb-1.5" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
    );
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up'
    ? 'text-emerald-600 dark:text-emerald-400'
    : trend === 'down'
    ? 'text-red-500 dark:text-red-400'
    : 'text-slate-500';

  return (
    <div className="stat-card group cursor-default">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
          <Icon size={20} className={iconColor} strokeWidth={1.8} />
        </div>
        {trendValue !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={13} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{title}</p>
      {subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
