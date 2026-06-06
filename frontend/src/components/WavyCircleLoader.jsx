/**
 * Google-style indeterminate wavy circle loader
 * Used for all loading states across the app
 */

export default function WavyCircleLoader({ size = 40, color = "emerald" }) {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 56,
    xl: 64,
  };

  const dimension = typeof size === "string" ? sizeMap[size] : size;
  const colorClass =
    {
      emerald: "text-emerald-500",
      blue: "text-blue-500",
      violet: "text-violet-500",
      white: "text-white",
      slate: "text-slate-500",
    }[color] || "text-emerald-500";

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 50 50"
      className={`wavy-circle-loader ${colorClass}`}
      role="status"
      aria-label="Loading"
    >
      <style>{`
        @keyframes wavyCircleSpin {
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes wavyCircleDash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }
        
        .wavy-circle-loader {
          animation: wavyCircleSpin 2s linear infinite;
        }
        
        .wavy-circle-loader circle {
          animation: wavyCircleDash 1.5s ease-in-out infinite;
          stroke-linecap: round;
        }
      `}</style>

      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

// Wrapper for inline loading indicators (icon size)
export function InlineWavyLoader({ size = 16, color = "emerald" }) {
  const colorClass =
    {
      emerald: "text-emerald-500",
      blue: "text-blue-500",
      violet: "text-violet-500",
      white: "text-white",
      slate: "text-slate-400",
    }[color] || "text-emerald-500";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      className={`inline-wavy-loader ${colorClass}`}
      role="status"
      aria-label="Loading"
    >
      <style>{`
        @keyframes inlineWavySpin {
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes inlineWavyDash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }
        
        .inline-wavy-loader {
          animation: inlineWavySpin 2s linear infinite;
          display: inline-block;
        }
        
        .inline-wavy-loader circle {
          animation: inlineWavyDash 1.5s ease-in-out infinite;
          stroke-linecap: round;
        }
      `}</style>

      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}
