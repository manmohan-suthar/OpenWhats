/**
 * Lightweight sparkline / bar chart using SVG — no extra dependency.
 */

export function Sparkline({ data = [], color = '#22c55e', height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(' L ')}`;
  const fillD = `M ${pts[0]} L ${pts.join(' L ')} L ${(data.length - 1) / (data.length - 1) * w},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MiniBarChart({ data = [], color = '#22c55e', height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const barW = 100 / data.length;
  const gap = barW * 0.2;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((v, i) => {
        const bh = (v / max) * height;
        return (
          <rect
            key={i}
            x={i * barW + gap / 2}
            y={height - bh}
            width={barW - gap}
            height={bh}
            rx="2"
            fill={color}
            fillOpacity="0.75"
          />
        );
      })}
    </svg>
  );
}

export function DonutChart({ segments = [], size = 80 }) {
  // segments: [{ value, color, label }]
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 30;
  const cx = 40;
  const cy = 40;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = segments.map(seg => {
    const pct = seg.value / total;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = offset * 360 - 90;
    offset += pct;
    return { ...seg, dashArray, rotation };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="10"
          strokeDasharray={s.dashArray}
          strokeDashoffset="0"
          transform={`rotate(${s.rotation} ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      {/* Center hole */}
      <circle cx={cx} cy={cy} r="22" className="fill-white dark:fill-slate-900" />
    </svg>
  );
}
