/**
 * Full-width area chart using recharts
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = {
  primary: "#22c55e",
  secondary: "#3b82f6",
  tertiary: "#f59e0b",
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-dropdown text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </p>
      {payload.map((p, i) => (
        <p
          key={i}
          className="flex items-center gap-2"
          style={{ color: p.color }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color }}
          />
          <span className="text-slate-600 dark:text-slate-400">{p.name}:</span>
          <span className="font-semibold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export function MessageAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="gMessages" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.12} />
            <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f0"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area
          type="monotone"
          dataKey="messages"
          name="Messages"
          stroke={COLORS.primary}
          strokeWidth={2}
          fill="url(#gMessages)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="sessions"
          name="Sessions"
          stroke={COLORS.secondary}
          strokeWidth={2}
          fill="url(#gSessions)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ApiBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f0"
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="requests"
          name="Messages"
          fill={COLORS.primary}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="errors"
          name="Errors"
          fill="#f87171"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
