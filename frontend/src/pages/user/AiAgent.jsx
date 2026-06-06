import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle,
  Database,
  Brain,
  Send,
  Bot,
  Zap,
  Check,
  X,
  CheckCircle,
  AlertCircle,
  Upload,
  FileText,
  AlignLeft,
  Globe,
  Smartphone,
  Settings,
  Play,
  Pause,
  Power,
  RefreshCw,
  Copy,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Clock,
  Activity,
  BarChart2,
  MessageSquare,
  ChevronRight,
  Plus,
  Minus,
  Maximize2,
  GitBranch,
  Eye,
  EyeOff,
  Layers,
  Server,
  Shield,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Cpu,
  Save,
  Trash2,
  Lock,
  Link,
  ChevronDown,
} from "lucide-react";
import { authFetch } from "../../services/authFetch";
import whatsappIcon from "../../assets/icons/whatsapp.gif";
import consulationIcon from "../../assets/icons/consultation.gif";
import knowledgeIcon from "../../assets/icons/knowledge.gif";
import processingIcon from "../../assets/icons/processing.gif";

// ── Canvas node definitions ─────────────────────────────────────────────────
const NODES = [
  {
    id: "trigger",
    title: "WhatsApp Trigger",
    desc: "When message received",
    icon: MessageCircle,
    color: "#f59e0b",
    colorDark: "rgba(245,158,11,0.18)",
    badge: "TRIGGER",
    x: 44,
    y: 88,
    w: 192,
    h: 116,
    step: 1,
    outputs: ["knowledge"],
  },
  {
    id: "knowledge",
    title: "Knowledge Base",
    desc: "Search company docs",
    icon: Database,
    color: "#6366f1",
    colorDark: "rgba(99,102,241,0.18)",
    badge: "ACTION",
    x: 296,
    y: 42,
    w: 192,
    h: 116,
    step: 2,
    outputs: ["ai"],
  },
  {
    id: "ai",
    title: "AI Processor",
    desc: "Generate smart reply",
    icon: Brain,
    color: "#a855f7",
    colorDark: "rgba(168,85,247,0.18)",
    badge: "AI MODEL",
    x: 548,
    y: 100,
    w: 192,
    h: 116,
    step: 3,
    outputs: ["reply"],
  },
  {
    id: "reply",
    title: "Send Reply",
    desc: "Auto-respond to user",
    icon: Send,
    color: "#10b981",
    colorDark: "rgba(16,185,129,0.18)",
    badge: "OUTPUT",
    x: 800,
    y: 58,
    w: 192,
    h: 116,
    step: 4,
    outputs: [],
  },
];

// port positions
const portRight = (n) => ({ x: n.x + n.w, y: n.y + n.h / 2 });
const portLeft = (n) => ({ x: n.x, y: n.y + n.h / 2 });

// build connection list from NODES outputs
const CONNECTIONS = NODES.flatMap((n) =>
  n.outputs.map((tid) => {
    const target = NODES.find((x) => x.id === tid);
    return { from: n, to: target };
  }),
);

// ── Animated SVG bezier connection ──────────────────────────────────────────
function Connection({ from, to, configured, active, index }) {
  const p1 = portRight(from);
  const p2 = portLeft(to);
  const cx1 = p1.x + 70;
  const cx2 = p2.x - 70;
  const d = `M ${p1.x},${p1.y} C ${cx1},${p1.y} ${cx2},${p2.y} ${p2.x},${p2.y}`;
  const delay = `${index * 0.15}s`;

  return (
    <g>
      <path d={d} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="2" />
      {configured && (
        <path
          d={d}
          fill="none"
          stroke={from.color}
          strokeWidth="2"
          strokeOpacity="0.5"
          strokeDasharray="8 5"
          style={{
            animation: active
              ? `flowDash 1.2s linear infinite ${delay}`
              : "none",
          }}
        />
      )}
      <circle
        cx={p1.x}
        cy={p1.y}
        r="5"
        fill={configured ? from.color : "#2a2a45"}
        stroke={configured ? from.color : "rgba(148,163,184,0.28)"}
        strokeWidth="1.5"
        style={active ? { filter: `drop-shadow(0 0 6px ${from.color})` } : {}}
      />
      <circle
        cx={p2.x}
        cy={p2.y}
        r="5"
        fill={configured ? from.color : "#2a2a45"}
        stroke={configured ? from.color : "rgba(148,163,184,0.28)"}
        strokeWidth="1.5"
        style={active ? { filter: `drop-shadow(0 0 6px ${from.color})` } : {}}
      />
    </g>
  );
}

// ── Node card on canvas ──────────────────────────────────────────────────────
function CanvasNode({ node, selected, configured, running, done, onSelect }) {
  const Icon = node.icon;
  const isSelected = selected?.id === node.id;

  return (
    <g onClick={() => onSelect(node)} style={{ cursor: "pointer" }}>
      {isSelected && (
        <rect
          x={node.x - 3}
          y={node.y - 3}
          width={node.w + 6}
          height={node.h + 6}
          rx="15"
          ry="15"
          fill="none"
          stroke={node.color}
          strokeWidth="2"
          opacity="0.6"
          style={{ filter: `drop-shadow(0 0 12px ${node.color})` }}
        />
      )}
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx="12"
        ry="12"
        className="fill-white dark:fill-slate-950"
        stroke={isSelected ? node.color : "rgba(148,163,184,0.24)"}
        strokeWidth={isSelected ? "1.5" : "1"}
        style={
          isSelected
            ? { filter: `drop-shadow(0 14px 28px rgba(79,70,229,0.14))` }
            : { filter: `drop-shadow(0 10px 20px rgba(15,23,42,0.08))` }
        }
      />
      <rect
        x={node.x}
        y={node.y + 12}
        width="4"
        height={node.h - 24}
        rx="2"
        fill={node.color}
        opacity={configured ? "1" : "0.4"}
      />
      <circle
        cx={node.x + 34}
        cy={node.y + node.h / 2}
        r="18"
        fill={node.colorDark}
        stroke={node.color}
        strokeWidth="1"
        strokeOpacity={configured ? "0.5" : "0.2"}
      />
      <foreignObject
        x={node.x + 27}
        y={node.y + node.h / 2 - 7}
        width="14"
        height="14"
      >
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            color: node.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <Icon size={14} />
        </div>
      </foreignObject>
      {running && (
        <circle
          cx={node.x + 34}
          cy={node.y + node.h / 2}
          r="22"
          fill="none"
          stroke={node.color}
          strokeWidth="1.5"
          strokeDasharray="25 45"
          style={{
            animation: "spinNode 1s linear infinite",
            transformOrigin: `${node.x + 34}px ${node.y + node.h / 2}px`,
          }}
        />
      )}
      <rect
        x={node.x + node.w - 72}
        y={node.y + 10}
        width="62"
        height="16"
        rx="8"
        fill={node.colorDark}
      />
      <text
        x={node.x + node.w - 41}
        y={node.y + 21}
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill={node.color}
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.5"
      >
        {node.badge}
      </text>
      {done && (
        <g>
          <circle
            cx={node.x + node.w - 10}
            cy={node.y + node.h - 10}
            r="9"
            fill="#10b981"
          />
          <text
            x={node.x + node.w - 10}
            y={node.y + node.h - 7}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontFamily="system-ui"
          >
            ✓
          </text>
        </g>
      )}
      <text
        x={node.x + 62}
        y={node.y + node.h / 2 - 6}
        fontSize="12"
        fontWeight="700"
        className="fill-slate-900 dark:fill-white"
        fontFamily="system-ui, sans-serif"
      >
        {node.title}
      </text>
      <text
        x={node.x + 62}
        y={node.y + node.h / 2 + 9}
        fontSize="10"
        className="fill-slate-500 dark:fill-slate-300"
        fontFamily="system-ui, sans-serif"
      >
        {configured ? "● Configured" : "○ Click to configure"}
      </text>
      <circle
        cx={node.x + 18}
        cy={node.y + 18}
        r="8"
        fill={configured ? node.color : "#e2e8f0"}
      />
      <text
        x={node.x + 18}
        y={node.y + 22}
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        className="fill-slate-600 dark:fill-white"
        fontFamily="system-ui, sans-serif"
      >
        {node.step}
      </text>
    </g>
  );
}

// ── Training modal overlay ───────────────────────────────────────────────────
const TRAIN_STEPS = [
  { label: "Parsing knowledge documents", ms: 1100 },
  { label: "Building vector embeddings", ms: 1300 },
  { label: "Training response patterns", ms: 1400 },
  { label: "Calibrating AI personality", ms: 1000 },
  { label: "Deploying agent to session", ms: 900 },
];

function TrainingModal({ onDone }) {
  const [cur, setCur] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const total = TRAIN_STEPS.reduce((s, t) => s + t.ms, 0);
    let start = null;
    const raf = (ts) => {
      if (!start) start = ts;
      const dt = ts - start;
      setPct(Math.min((dt / total) * 100, 100));
      let cum = 0;
      for (let i = 0; i < TRAIN_STEPS.length; i++) {
        cum += TRAIN_STEPS[i].ms;
        if (dt < cum) {
          setCur(i);
          break;
        }
        if (i === TRAIN_STEPS.length - 1) setCur(i);
      }
      if (dt < total) requestAnimationFrame(raf);
      else {
        setPct(100);
        setCur(TRAIN_STEPS.length);
        setTimeout(onDone, 700);
      }
    };
    const h = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(h);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-[#161628] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="relative flex items-center justify-center mb-8 h-28">
          {[80, 60, 44].map((r, i) => (
            <div
              key={r}
              className="absolute rounded-full border border-violet-500/20"
              style={{
                width: r,
                height: r,
                animation: `${i % 2 ? "spinNode" : "spinNodeR"} ${3 + i}s linear infinite`,
              }}
            />
          ))}
          <div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-700/40"
            style={{ animation: "pulseOrb 2s ease-in-out infinite" }}
          >
            <Brain size={26} className="text-white" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-violet-400"
              style={{
                top: `${15 + i * 14}%`,
                left: `${8 + i * 18}%`,
                animation: `floatDot ${1.4 + i * 0.2}s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>

        <p className="text-center text-base font-bold text-white mb-1">
          {cur >= TRAIN_STEPS.length ? "Agent Deployed!" : "Training AI Agent"}
        </p>
        <p className="text-center text-xs text-white/40 mb-6">
          {cur < TRAIN_STEPS.length
            ? TRAIN_STEPS[cur].label
            : "All systems ready"}
        </p>

        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="space-y-2">
          {TRAIN_STEPS.map((s, i) => {
            const done = i < cur || cur >= TRAIN_STEPS.length;
            const act = i === cur && cur < TRAIN_STEPS.length;
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 transition-opacity duration-300 ${done ? "opacity-60" : act ? "opacity-100" : "opacity-25"}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500" : act ? "bg-violet-500" : "bg-white/10"}`}
                >
                  {done ? (
                    <Check size={8} className="text-white" />
                  ) : act ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  ) : null}
                </div>
                <p
                  className={`text-xs ${act ? "text-white font-semibold" : "text-white/50"}`}
                >
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KnowledgeProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-3xl border border-violet-300/30 bg-white/95 dark:bg-slate-900/95 shadow-[0_30px_90px_rgba(79,70,229,0.30)] p-7">
        <div className="relative flex items-center justify-center h-32 mb-4 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.22),transparent_58%)]">
          {[0, 1, 2].map((ring) => (
            <div
              key={ring}
              className="absolute rounded-full border border-violet-400/35"
              style={{
                width: 64 + ring * 28,
                height: 64 + ring * 28,
                animation: `spinNode ${2.4 + ring * 0.8}s linear infinite`,
              }}
            />
          ))}
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_40px_rgba(99,102,241,0.65)]"
            style={{ animation: "pulseOrb 1.8s ease-in-out infinite" }}
          >
            <Sparkles size={24} />
          </div>
        </div>
        <p className="text-center text-base font-bold text-slate-800 dark:text-slate-100">
          Summarizing Knowledge Base
        </p>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Sending context to OpenRouter and generating a compact AI summary...
        </p>
      </div>
    </div>
  );
}

// ── Right config panel ───────────────────────────────────────────────────────
function ConfigPanel({
  node,
  config,
  onSave,
  sessions,
  sessionsLoading,
  adminModel,
}) {
  const [local, setLocal] = useState(config || {});
  useEffect(() => {
    setLocal(config || {});
  }, [node?.id, config]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center dark:bg-white/5 dark:border-slate-700">
          <GitBranch size={22} className="text-slate-400 dark:text-white/20" />
        </div>
        <p className="text-sm font-semibold text-slate-500 dark:text-white/30">
          Select a node to configure
        </p>
        <p className="text-[11px] text-slate-400 dark:text-white/15">
          Click any node in the canvas to open its settings
        </p>
      </div>
    );
  }

  const Icon = node.icon;
  const isDone = !!(config && Object.keys(config).length > 0);

  const Field = ({ label, children }) => (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-white/40">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div
        className="flex-shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800"
        style={{
          background: `linear-gradient(135deg, ${node.colorDark} 0%, transparent 100%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: node.colorDark,
              border: `1px solid ${node.color}40`,
            }}
          >
            <Icon size={16} style={{ color: node.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate dark:text-white">
              {node.title}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-white/40">
              {node.desc}
            </p>
          </div>
          {isDone && (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check size={9} className="text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-slate-950">
        {/* TRIGGER config */}
        {node.id === "trigger" && (
          <>
            <Field label="WhatsApp Session">
              {sessionsLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-2 dark:text-white/40">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                  Loading sessions…
                </div>
              ) : sessions.length === 0 ? (
                <div className="px-3 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300">
                  No connected sessions.{" "}
                  <a href="/dashboard/sessions" className="underline">
                    Connect one first →
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => {
                    const isDisconnected = s.status && s.status !== "connected";
                    return (
                      <button
                        key={s.sessionId}
                        onClick={() =>
                          !isDisconnected &&
                          setLocal((l) => ({
                            ...l,
                            sessionId: s.sessionId,
                            sessionPhone: s.phoneNumber,
                          }))
                        }
                        disabled={isDisconnected}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${local.sessionId === s.sessionId ? "border-amber-500/50 bg-amber-50 dark:bg-amber-500/10" : isDisconnected ? "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed dark:border-slate-700 dark:bg-white/3" : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-white/5 dark:hover:bg-white/8"}`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                          <Smartphone size={13} style={{ color: "#f59e0b" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate dark:text-white/80">
                            {s.phoneNumber || s.sessionId}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate dark:text-white/30">
                            {isDisconnected
                              ? `Disconnected — reconnect in Sessions`
                              : s.sessionId}
                          </p>
                        </div>
                        {local.sessionId === s.sessionId && (
                          <Check
                            size={12}
                            className="text-amber-400 flex-shrink-0"
                          />
                        )}
                        {isDisconnected && (
                          <AlertCircle
                            size={12}
                            className="text-amber-400 flex-shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>

            <Field label="Trigger Condition">
              <select
                value={local.condition || "all"}
                onChange={(e) =>
                  setLocal((l) => ({ ...l, condition: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-amber-500/40 transition-all dark:bg-white/5 dark:border-slate-700 dark:text-white/80"
                style={{ colorScheme: "light" }}
              >
                <option value="all">All incoming messages</option>
                <option value="new">New contacts only</option>
                <option value="keywords">Keyword triggered</option>
              </select>
            </Field>

            {local.condition === "keywords" && (
              <Field label="Keywords (comma separated)">
                <input
                  value={local.keywords || ""}
                  onChange={(e) =>
                    setLocal((l) => ({ ...l, keywords: e.target.value }))
                  }
                  placeholder="help, support, price…"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500/40 transition-all dark:bg-white/5 dark:border-slate-700 dark:text-white/80 dark:placeholder-white/20"
                />
              </Field>
            )}
          </>
        )}

        {/* KNOWLEDGE config */}
        {node.id === "knowledge" && (
          <>
            <Field label="Knowledge Source">
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl dark:bg-white/5">
                {[
                  ["text", "Paste Text"],
                  ["file", "Upload File"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setLocal((x) => ({ ...x, sourceType: v }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${(local.sourceType || "text") === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white/70"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            {(!local.sourceType || local.sourceType === "text") && (
              <Field label="Company Information">
                <textarea
                  value={local.text || ""}
                  onChange={(e) =>
                    setLocal((l) => ({ ...l, text: e.target.value }))
                  }
                  rows={7}
                  placeholder={
                    "Company: Suthar Tech\nServices: WhatsApp automation\nPricing: ₹999/mo\nSupport: 9 AM–6 PM\n\nAdd FAQs, policies, product details…"
                  }
                  className="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 resize-none transition-all dark:bg-white/5 dark:border-slate-700 dark:text-white/80 dark:placeholder-white/20"
                />
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 dark:text-white/25">
                  <AlertCircle size={9} /> The more detail you provide, the
                  better the AI performs.
                </p>
              </Field>
            )}

            {local.sourceType === "file" && (
              <Field label="Upload Document">
                {local.file ? (
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/25">
                    <FileText
                      size={15}
                      className="text-indigo-400 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate dark:text-white/80">
                        {local.file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-white/30">
                        {(local.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setLocal((l) => ({ ...l, file: null }))}
                      className="text-slate-400 hover:text-red-400 transition-colors dark:text-white/30"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-500/40 hover:bg-indigo-50 cursor-pointer transition-all dark:border-slate-700 dark:hover:bg-white/5">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setLocal((l) => ({ ...l, file: f }));
                      }}
                    />
                    <Upload
                      size={20}
                      className="text-slate-400 dark:text-white/25"
                    />
                    <p className="text-xs text-slate-500 dark:text-white/40">
                      Drop PDF, DOC or TXT
                    </p>
                  </label>
                )}
              </Field>
            )}

            {(local.summary || config?.summary) && (
              <Field label="AI Summary Preview">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 dark:border-indigo-800 dark:bg-indigo-900/25">
                  <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-5">
                    {local.summary || config?.summary}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                    Model:{" "}
                    {local.summaryModel ||
                      config?.summaryModel ||
                      "openai/gpt-4o-mini"}{" "}
                    · Lines used:{" "}
                    {local.contextLineCount || config?.contextLineCount || 0}
                  </p>
                </div>
              </Field>
            )}
          </>
        )}

        {/* AI PROCESSOR config — no model selector, no temperature */}
        {node.id === "ai" && (
          <>
            {/* Admin-controlled model display */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <Lock size={13} className="text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white/80">
                  Using admin-configured model
                </p>
                <p className="text-[10px] text-slate-500 dark:text-white/40 mt-0.5">
                  {adminModel || "openai/gpt-4o-mini"} · Set by admin in AI
                  Settings
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-white/40">
                System Prompt (Agent Personality)
              </label>
              <textarea
                value={local.prompt || ""}
                onChange={(e) =>
                  setLocal((l) => ({ ...l, prompt: e.target.value }))
                }
                rows={5}
                placeholder={
                  "You are a helpful support agent. Be friendly, concise, and professional. Always offer to connect users with a human agent if they ask."
                }
                className="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 resize-none transition-all dark:bg-white/5 dark:border-slate-700 dark:text-white/80 dark:placeholder-white/20"
              />
              <p className="text-[10px] text-slate-400 dark:text-white/25">
                Optional — custom personality/instructions for the AI.
              </p>
            </div>
          </>
        )}

        {/* REPLY config */}
        {node.id === "reply" && (
          <>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-white/40">
                Response Delay
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["instant", "Instant", "0s"],
                  ["natural", "Natural", "1–3s"],
                  ["slow", "Slow", "4–8s"],
                ].map(([v, l, s]) => (
                  <button
                    key={v}
                    onClick={() => setLocal((x) => ({ ...x, delay: v }))}
                    className={`py-2.5 rounded-xl text-center transition-all border ${(local.delay || "natural") === v ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-white/5 dark:hover:bg-white/8"}`}
                  >
                    <p
                      className={`text-[11px] font-bold ${(local.delay || "natural") === v ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-white/50"}`}
                    >
                      {l}
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-white/25">
                      {s}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-white/40">
                Escalation Keyword
              </label>
              <input
                value={local.escalate || ""}
                onChange={(e) =>
                  setLocal((l) => ({ ...l, escalate: e.target.value }))
                }
                placeholder="e.g. AGENT, HUMAN, TALK"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500/40 transition-all dark:bg-white/5 dark:border-slate-700 dark:text-white/80 dark:placeholder-white/20"
              />
              <p className="text-[10px] text-slate-400 mt-1 dark:text-white/25">
                User sends this word → route to human agent
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-white/40">
                After-Hours Message
              </label>
              <textarea
                value={local.afterHours || ""}
                onChange={(e) =>
                  setLocal((l) => ({ ...l, afterHours: e.target.value }))
                }
                rows={3}
                placeholder={
                  "Thanks for reaching out! Our team is currently offline. We'll respond within 24 hours."
                }
                className="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 resize-none transition-all dark:bg-white/5 dark:border-slate-700 dark:text-white/80 dark:placeholder-white/20"
              />
            </div>
          </>
        )}
      </div>

      {/* Save button */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onSave(node.id, local)}
          disabled={
            (node.id === "trigger" && !local.sessionId) ||
            (node.id === "knowledge" && !(local.text?.trim() || local.file))
          }
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${node.color}, ${node.color}cc)`,
            boxShadow: `0 4px 16px ${node.color}30`,
          }}
        >
          <Check size={14} className="text-white" />
          <span className="text-white">Save Node Config</span>
        </button>
      </div>
    </div>
  );
}

// ── Live agent dashboard ────────────────────────────────────────────────────
function AgentDashboard({ agentConfig, agentId, summaryId, onDeactivate }) {
  const [active, setActive] = useState(true);
  const [testMsg, setTestMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendTest = async () => {
    if (!testMsg.trim() || typing) return;
    const q = testMsg.trim();
    setTestMsg("");
    setChat((c) => [...c, { role: "user", text: q }]);
    setTyping(true);
    try {
      const resp = await authFetch("/api/ai-agent/test-chat", {
        method: "POST",
        body: {
          message: q,
          ...(summaryId ? { summaryId } : {}),
          ...(agentId ? { agentId } : {}),
        },
      });
      const reply = resp?.data?.reply || "Sorry, I couldn't get a response.";
      setChat((c) => [...c, { role: "ai", text: reply }]);
    } catch {
      setChat((c) => [
        ...c,
        { role: "ai", text: "Error connecting to AI. Please try again." },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const stats = [
    {
      label: "Messages Handled",
      value: "0",
      icon: MessageCircle,
      color: "#6366f1",
    },
    { label: "Avg Response Time", value: "<1s", icon: Clock, color: "#10b981" },
    { label: "Success Rate", value: "—", icon: TrendingUp, color: "#a855f7" },
    { label: "Uptime", value: "100%", icon: Activity, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-5">
      {/* Status card */}
      <div
        className={`rounded-2xl border p-5 transition-all ${active ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/45 dark:border-emerald-700/45" : "bg-white border-slate-200 dark:bg-slate-900/85 dark:border-slate-700"}`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all ${active ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            <Bot
              size={26}
              className={active ? "text-white" : "text-white/25"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {agentConfig?.trigger?.sessionPhone || "AI Auto-Reply Agent"}
              </p>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${active ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-200 text-slate-500 dark:bg-white/8 dark:text-white/30"}`}
              >
                {active ? "● LIVE" : "● PAUSED"}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-white/35">
              Session ·{" "}
              {agentConfig?.trigger?.condition === "keywords"
                ? `Keywords: ${agentConfig?.trigger?.keywords || "any"}`
                : "All messages"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActive((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${active ? "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"}`}
            >
              {active ? (
                <>
                  <Pause size={11} /> Pause
                </>
              ) : (
                <>
                  <Play size={11} /> Resume
                </>
              )}
            </button>
            <button
              onClick={onDeactivate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 size={11} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl p-4 dark:bg-slate-900/85 dark:border-slate-700"
          >
            <div
              className="w-7 h-7 rounded-lg mb-2.5 flex items-center justify-center"
              style={{ background: s.color + "18" }}
            >
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-white">
              {s.value}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-white/30 mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Test chat + Config summary */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Test chat — real API */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col dark:bg-slate-900/85 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 dark:border-white/8">
            <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <MessageSquare size={11} className="text-violet-400" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-white/70">
              Test Agent
            </p>
            <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-bold">
              LIVE API
            </span>
          </div>
          <div className="flex-1 min-h-[120px] max-h-[180px] overflow-y-auto p-3 space-y-2">
            {chat.length === 0 && !typing && (
              <p className="text-[11px] text-slate-400 dark:text-white/20 text-center py-6">
                Send a message to test the AI response
              </p>
            )}
            {chat.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start gap-2"}`}
              >
                {m.role === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={10} className="text-white" />
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[75%] ${m.role === "user" ? "bg-blue-500 text-white rounded-tr-sm" : "bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-white/70 rounded-tl-sm"}`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={10} className="text-white" />
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-white/8 px-3 py-2.5 rounded-2xl rounded-tl-sm">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-white/30 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-slate-100 dark:border-white/8 flex gap-2">
            <input
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTest()}
              placeholder="Type a test message…"
              className="flex-1 h-9 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-violet-400 transition-all dark:bg-white/5 dark:border-white/8 dark:text-white/70 dark:placeholder-white/20"
            />
            <button
              onClick={sendTest}
              disabled={!testMsg.trim() || typing}
              className="w-9 h-9 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-30 flex items-center justify-center text-white transition-all flex-shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>

        {/* Config summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 dark:bg-slate-900/85 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest dark:text-white/50">
            Agent Configuration
          </p>
          {[
            {
              label: "Session",
              value:
                agentConfig?.trigger?.sessionPhone ||
                agentConfig?.trigger?.sessionId ||
                "—",
              color: "#f59e0b",
            },
            {
              label: "Knowledge",
              value:
                agentConfig?.knowledge?.file?.name ||
                (agentConfig?.knowledge?.text
                  ? `${agentConfig.knowledge.text.slice(0, 30)}…`
                  : "—"),
              color: "#6366f1",
            },
            {
              label: "AI Model",
              value: "Admin-configured",
              color: "#a855f7",
            },
            {
              label: "Response Delay",
              value: agentConfig?.reply?.delay || "natural",
              color: "#10b981",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: item.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 dark:text-white/30">
                  {item.label}
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-white/70 truncate">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Existing agent card ──────────────────────────────────────────────────────
function AgentCard({
  agent,
  sessions,
  onView,
  onEdit,
  onDelete,
  onToggle,
  onChangeSession,
}) {
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [changingSession, setChangingSession] = useState(false);
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showSessionPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target))
        setShowSessionPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSessionPicker]);

  const availableSessions = (sessions || []).filter(
    (s) => s.sessionId !== agent.sessionId,
  );

  const handleSessionSelect = async (sessionId) => {
    setShowSessionPicker(false);
    setChangingSession(true);
    await onChangeSession(agent, sessionId);
    setChangingSession(false);
  };

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-slate-900/85 dark:border-slate-700">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 flex items-center justify-center flex-shrink-0">
          <Bot size={18} className="text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate dark:text-white">
            {agent.agentName || "AI Auto-Reply Agent"}
          </p>
          {/* Session info with change session picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowSessionPicker((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/40 mt-0.5 hover:text-violet-500 dark:hover:text-violet-400 transition-colors group"
              title="Change linked session"
            >
              <span className="truncate max-w-[130px]">
                {agent.session?.phoneNumber || agent.sessionId}
              </span>
              {changingSession ? (
                <RefreshCw size={9} className="animate-spin flex-shrink-0" />
              ) : (
                <ChevronDown
                  size={9}
                  className="flex-shrink-0 opacity-60 group-hover:opacity-100"
                />
              )}
            </button>

            {showSessionPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wide flex items-center gap-1">
                    <Link size={9} /> Change Session
                  </p>
                </div>
                {availableSessions.length === 0 ? (
                  <p className="px-3 py-2.5 text-[11px] text-slate-400 dark:text-white/30">
                    No other connected sessions
                  </p>
                ) : (
                  availableSessions.map((s) => (
                    <button
                      key={s.sessionId}
                      onClick={() => handleSessionSelect(s.sessionId)}
                      className="w-full text-left px-3 py-2.5 text-[11px] hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-white/70 truncate">
                        {s.phoneNumber || s.name || s.sessionId}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <span
          className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${agent.isActive ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700/10 dark:text-white/80"}`}
        >
          {agent.isActive ? "● ACTIVE" : "○ PAUSED"}
        </span>
      </div>

      {/* Reply count mini stat */}
      <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/85 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <MessageCircle size={11} className="text-indigo-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-white/70">
            {agent.replyCount ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-white/30">
            auto replies
          </span>
        </div>
        <div className="w-px h-3 bg-slate-200 dark:bg-white/10" />
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-emerald-400" />
          <span className="text-[10px] text-slate-400 dark:text-white/30">
            {agent.lastRepliedAt
              ? new Date(agent.lastRepliedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "No replies yet"}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {[
          { label: "Trigger", color: "#f59e0b" },
          { label: "Knowledge", color: "#6366f1" },
          { label: "AI", color: "#a855f7" },
          { label: "Reply", color: "#10b981" },
        ].map((n) => (
          <div
            key={n.label}
            className="flex-1 py-1 rounded-lg text-center"
            style={{ background: n.color + "18" }}
          >
            <p className="text-[9px] font-bold" style={{ color: n.color }}>
              {n.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* View analytics — primary action */}
        <button
          onClick={() => onView(agent)}
          className="flex-1 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <Eye size={12} /> View
        </button>
        <button
          onClick={() => onToggle(agent)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${agent.isActive ? "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"}`}
        >
          {agent.isActive ? "Pause" : "Resume"}
        </button>
        <button
          onClick={() => onDelete(agent)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:hover:bg-red-500/10"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Agent detail / analytics page ────────────────────────────────────────────
function AgentDetailPage({ agentId, onBack, onToggle, onDelete }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyLogs, setReplyLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [testMsg, setTestMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const fetchAgent = useCallback(() => {
    setLoading(true);
    authFetch(`/api/ai-agent/agents/${agentId}`)
      .then((d) => setAgent(d.data || null))
      .catch(() => setAgent(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  const fetchLogs = useCallback(() => {
    setLogsLoading(true);
    authFetch(`/api/ai-agent/agents/${agentId}/replies`)
      .then((d) => setReplyLogs(d.data || []))
      .catch(() => setReplyLogs([]))
      .finally(() => setLogsLoading(false));
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
    fetchLogs();
    // Auto-refresh stats every 15 seconds
    const t = setInterval(() => {
      fetchAgent();
      fetchLogs();
    }, 15000);
    return () => clearInterval(t);
  }, [fetchAgent, fetchLogs]);

  const handleToggle = async () => {
    await onToggle(agent);
    fetchAgent();
  };

  const handleDelete = async () => {
    await onDelete(agent);
    onBack();
  };

  const sendTest = async () => {
    if (!testMsg.trim() || typing) return;
    const q = testMsg.trim();
    setTestMsg("");
    setChat((c) => [...c, { role: "user", text: q }]);
    setTyping(true);
    try {
      const resp = await authFetch("/api/ai-agent/test-chat", {
        method: "POST",
        body: {
          message: q,
          agentId,
          ...(agent?.knowledgeSummaryId?._id
            ? { summaryId: agent.knowledgeSummaryId._id }
            : {}),
        },
      });
      setChat((c) => [
        ...c,
        { role: "ai", text: resp?.data?.reply || "No response." },
      ]);
    } catch {
      setChat((c) => [...c, { role: "ai", text: "Error connecting to AI." }]);
    } finally {
      setTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <AlertCircle size={32} className="text-slate-300 dark:text-white/20" />
        <p className="text-sm text-slate-500 dark:text-white/40">
          Agent not found
        </p>
        <button
          onClick={onBack}
          className="text-xs text-violet-500 underline dark:text-violet-400"
        >
          ← Back
        </button>
      </div>
    );
  }

  const summaryText = agent.knowledgeSummaryId?.summary || "";
  const configTrigger = agent.config?.trigger || {};
  const configReply = agent.config?.reply || {};

  const stats = [
    {
      label: "Total Auto Replies",
      value: agent.replyCount ?? 0,
      icon: MessageCircle,
      color: "#6366f1",
      big: true,
    },
    {
      label: "Last Reply",
      value: agent.lastRepliedAt
        ? new Date(agent.lastRepliedAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      icon: Clock,
      color: "#10b981",
    },
    {
      label: "Status",
      value: agent.isActive ? "Active" : "Paused",
      icon: Activity,
      color: agent.isActive ? "#10b981" : "#f59e0b",
    },
    {
      label: "Trigger Mode",
      value:
        configTrigger.condition === "keywords"
          ? "Keywords"
          : configTrigger.condition === "new"
            ? "New contacts"
            : "All messages",
      icon: Zap,
      color: "#a855f7",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowRight size={13} className="rotate-180" /> Back to agents
          </button>
        </div>

        {/* Hero card */}
        <div
          className={`rounded-[24px] border p-6 transition-all ${agent.isActive ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-950/45 dark:to-teal-950/35 dark:border-emerald-700/45" : "bg-white border-slate-200 dark:bg-slate-900/85 dark:border-slate-700"}`}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className={`w-16 h-16 rounded-[20px] flex items-center justify-center flex-shrink-0 shadow-lg ${agent.isActive ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-400/30" : "bg-slate-100 dark:bg-slate-800"}`}
            >
              <Bot
                size={28}
                className={agent.isActive ? "text-white" : "text-slate-400"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-black text-slate-900 dark:text-white">
                  {agent.agentName || "AI Auto-Reply Agent"}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${agent.isActive ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"}`}
                >
                  {agent.isActive ? "● LIVE" : "○ PAUSED"}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-white/40">
                Session: {agent.session?.phoneNumber || agent.sessionId}
                {agent.session?.status &&
                  agent.session.status !== "connected" && (
                    <span className="ml-2 text-amber-500 text-[10px] font-bold">
                      ⚠ Disconnected
                    </span>
                  )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggle}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${agent.isActive ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400"}`}
              >
                {agent.isActive ? (
                  <>
                    <Pause size={12} /> Pause
                  </>
                ) : (
                  <>
                    <Play size={12} /> Resume
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border border-red-200 dark:border-red-500/20"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white border border-slate-200 rounded-2xl p-4 dark:bg-slate-900/85 dark:border-slate-700"
            >
              <div
                className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center"
                style={{ background: s.color + "18" }}
              >
                <s.icon size={15} style={{ color: s.color }} />
              </div>
              <p
                className={`font-black text-slate-900 dark:text-white ${s.big ? "text-3xl" : "text-base"}`}
              >
                {s.value}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Test chat + Config */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Live test chat */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col dark:bg-slate-900/85 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/8 flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <MessageSquare size={13} className="text-violet-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white/80">
                  Test Agent Chat
                </p>
                <p className="text-[10px] text-slate-400 dark:text-white/30">
                  Uses real OpenRouter + knowledge summary
                </p>
              </div>
              <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-violet-500/12 text-violet-500 font-bold border border-violet-500/20">
                LIVE API
              </span>
            </div>

            <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto p-4 space-y-3">
              {chat.length === 0 && !typing && (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                    <Bot size={20} className="text-violet-400" />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-white/25 text-center">
                    Send a message to test how the agent responds
                  </p>
                </div>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start gap-2"}`}
                >
                  {m.role === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={10} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs max-w-[80%] leading-5 ${m.role === "user" ? "bg-violet-600 text-white rounded-tr-sm" : "bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-white/70 rounded-tl-sm"}`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={10} className="text-white" />
                  </div>
                  <div className="flex gap-1 bg-slate-100 dark:bg-white/8 px-3 py-2.5 rounded-2xl rounded-tl-sm">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-white/30 animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-white/8 flex gap-2">
              <input
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendTest()}
                placeholder="Ask the agent something…"
                className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-violet-400 transition-all dark:bg-white/5 dark:border-white/8 dark:text-white/70 dark:placeholder-white/20"
              />
              <button
                onClick={sendTest}
                disabled={!testMsg.trim() || typing}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-30 flex items-center justify-center text-white transition-all"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Config details */}
          <div className="space-y-4">
            {/* Knowledge summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 dark:bg-slate-900/85 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <Database size={12} className="text-indigo-500" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-white/70">
                  Knowledge Summary
                </p>
              </div>
              {summaryText ? (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-5 line-clamp-5">
                  {summaryText}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-white/25 italic">
                  No knowledge base attached
                </p>
              )}
            </div>

            {/* Flow config */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 dark:bg-slate-900/85 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-white/70 mb-3">
                Flow Configuration
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    label: "Trigger",
                    value:
                      configTrigger.condition === "keywords"
                        ? `Keywords: ${configTrigger.keywords || "—"}`
                        : configTrigger.condition === "new"
                          ? "New contacts only"
                          : "All incoming messages",
                    color: "#f59e0b",
                  },
                  {
                    label: "Response Delay",
                    value:
                      configReply.delay === "instant"
                        ? "Instant (0s)"
                        : configReply.delay === "slow"
                          ? "Slow (4–8s)"
                          : "Natural (1–3s)",
                    color: "#10b981",
                  },
                  {
                    label: "Escalation",
                    value: configReply.escalate || "Not set",
                    color: "#a855f7",
                  },
                  {
                    label: "AI Model",
                    value: "Admin-configured",
                    color: "#6366f1",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: item.color }}
                    />
                    <div>
                      <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-wider">
                        {item.label}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* end test-chat + config grid */}

        {/* ── Reply history ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden dark:bg-slate-900/85 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/8 flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <MessageCircle size={13} className="text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-white/80">
                Auto-Reply History
              </p>
              <p className="text-[10px] text-slate-400 dark:text-white/30">
                Real WhatsApp conversations handled by this agent
              </p>
            </div>
            <button
              onClick={fetchLogs}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
              {replyLogs.length} replies
            </span>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400 dark:text-white/25">
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
              <span className="text-xs">Loading history…</span>
            </div>
          ) : replyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <MessageCircle
                  size={20}
                  className="text-slate-300 dark:text-white/15"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-white/25">
                No auto-replies yet
              </p>
              <p className="text-[10px] text-slate-300 dark:text-white/15">
                Replies will appear here once users message this session
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/6 max-h-[400px] overflow-y-auto">
              {replyLogs.map((log) => (
                <div
                  key={log._id}
                  className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* User message */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
                          USER
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-white/25">
                          {log.senderJid?.replace(/@.*/, "") || "unknown"}
                        </span>
                        <span className="ml-auto text-[9px] text-slate-300 dark:text-white/20">
                          {new Date(log.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-white/60 bg-blue-50 dark:bg-blue-500/8 px-2.5 py-1.5 rounded-xl rounded-tl-sm leading-5">
                        {log.inboundText}
                      </p>

                      {/* AI reply */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-500">
                          AI
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 rounded-xl rounded-tl-sm leading-5">
                        {log.replyText}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AiAgent() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeConfigs, setNodeConfigs] = useState({});
  const [isTraining, setIsTraining] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [flowStarted, setFlowStarted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [isKnowledgeProcessing, setIsKnowledgeProcessing] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState("");

  const [existingAgents, setExistingAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [adminModel, setAdminModel] = useState("openai/gpt-4o-mini");
  const [viewingAgentId, setViewingAgentId] = useState(null);

  // deployed agent id / summaryId for test chat
  const [deployedAgentId, setDeployedAgentId] = useState(null);
  const [deployedSummaryId, setDeployedSummaryId] = useState(null);

  useEffect(() => {
    authFetch("/api/sessions")
      .then((d) =>
        setSessions((d.data || []).filter((s) => s.status === "connected")),
      )
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));

    authFetch("/api/ai-agent/agents")
      .then((d) => setExistingAgents(d.data || []))
      .catch(() => setExistingAgents([]))
      .finally(() => setAgentsLoading(false));

    authFetch("/api/ai-agent/status")
      .then((d) => {
        if (d?.data?.model) setAdminModel(d.data.model);
      })
      .catch(() => {});
  }, []);

  const handleSaveNode = async (nodeId, config) => {
    setFlowStarted(true);
    setKnowledgeError("");

    let configToSave = config;

    if (nodeId === "knowledge") {
      try {
        setIsKnowledgeProcessing(true);

        let sourceText = "";
        const sourceType = config?.sourceType === "file" ? "file" : "text";

        if (sourceType === "file") {
          if (!config?.file) throw new Error("Please upload a document first");
          sourceText = await config.file.text();
        } else {
          sourceText = String(config?.text || "");
        }

        const limitedContext = sourceText
          .split(/\r?\n/)
          .slice(0, 100)
          .join("\n")
          .trim();
        if (!limitedContext) throw new Error("Knowledge content is empty.");

        const resp = await authFetch("/api/ai-agent/knowledge/summarize", {
          method: "POST",
          body: { sourceType, context: limitedContext },
        });

        if (!resp?.success)
          throw new Error(resp?.error || "Failed to summarize knowledge");

        configToSave = {
          ...config,
          text: sourceType === "text" ? limitedContext : config.text,
          fileExtractedText: sourceType === "file" ? limitedContext : undefined,
          summary: resp.data?.summary || "",
          summaryId: resp.data?.summaryId || "",
          summaryModel: resp.data?.model || "",
          contextLineCount: resp.data?.contextLineCount || 0,
        };
      } catch (err) {
        setKnowledgeError(err.message || "Failed to process knowledge base");
        return;
      } finally {
        setIsKnowledgeProcessing(false);
      }
    }

    setNodeConfigs((c) => {
      const updated = { ...c, [nodeId]: configToSave };
      const nextNode = NODES.find((n) => !updated[n.id]);
      if (nextNode) setSelectedNode(nextNode);
      return updated;
    });
  };

  const handleDeploy = async () => {
    setFlowStarted(true);
    setIsTraining(true);
    setSelectedNode(null);

    // Save agent to backend
    try {
      const triggerCfg = nodeConfigs.trigger || {};
      const knowledgeCfg = nodeConfigs.knowledge || {};
      const replyCfg = nodeConfigs.reply || {};
      const aiCfg = nodeConfigs.ai || {};

      const payload = {
        sessionId: triggerCfg.sessionId,
        agentName: "AI Auto-Reply Agent",
        knowledgeSummaryId: knowledgeCfg.summaryId || undefined,
        config: {
          trigger: {
            condition: triggerCfg.condition || "all",
            keywords: triggerCfg.keywords || "",
          },
          reply: {
            delay: replyCfg.delay || "natural",
            escalate: replyCfg.escalate || "",
            afterHours: replyCfg.afterHours || "",
          },
        },
      };

      const resp = await authFetch("/api/ai-agent/agents", {
        method: "POST",
        body: payload,
      });
      if (resp?.data?._id) setDeployedAgentId(resp.data._id);
      if (knowledgeCfg.summaryId) setDeployedSummaryId(knowledgeCfg.summaryId);
    } catch {
      // non-critical — training animation still plays
    }
  };

  const handleTrainDone = useCallback(() => {
    setIsTraining(false);
    setIsLive(true);
  }, []);

  const handleReset = () => {
    setIsLive(false);
    setFlowStarted(false);
    setNodeConfigs({});
    setSelectedNode(null);
    setZoom(1);
    setCanvasPan({ x: 0, y: 0 });
    setDeployedAgentId(null);
    setDeployedSummaryId(null);
    // Refresh agent list
    authFetch("/api/ai-agent/agents")
      .then((d) => setExistingAgents(d.data || []))
      .catch(() => {});
  };

  const handleDeleteAgent = async (agent) => {
    if (
      !confirm(
        `Delete agent for session ${agent.session?.phoneNumber || agent.sessionId}?`,
      )
    )
      return;
    await authFetch(`/api/ai-agent/agents/${agent._id}`, {
      method: "DELETE",
    }).catch(() => {});
    setExistingAgents((a) => a.filter((x) => x._id !== agent._id));
  };

  const handleToggleAgent = async (agent) => {
    const resp = await authFetch(`/api/ai-agent/agents/${agent._id}/toggle`, {
      method: "PATCH",
    }).catch(() => null);
    if (resp?.data) {
      setExistingAgents((a) =>
        a.map((x) =>
          x._id === agent._id ? { ...x, isActive: resp.data.isActive } : x,
        ),
      );
    }
  };

  const handleChangeSession = async (agent, newSessionId) => {
    const resp = await authFetch(`/api/ai-agent/agents/${agent._id}/session`, {
      method: "PATCH",
      body: { newSessionId },
    }).catch(() => null);
    if (resp?.success) {
      // Re-fetch agents to get updated session details populated
      authFetch("/api/ai-agent/agents")
        .then((d) => setExistingAgents(d.data || []))
        .catch(() => {});
    } else {
      alert(resp?.error || "Failed to change session");
    }
  };

  const handleViewAgent = (agent) => {
    setViewingAgentId(agent._id);
  };

  const handleEditAgent = (agent) => {
    setFlowStarted(true);
    setSelectedNode(NODES[0]);
    if (agent.config) {
      setNodeConfigs({
        trigger: {
          sessionId: agent.sessionId,
          sessionPhone: agent.session?.phoneNumber,
          condition: agent.config.trigger?.condition || "all",
          keywords: agent.config.trigger?.keywords || "",
        },
        reply: {
          delay: agent.config.reply?.delay || "natural",
          escalate: agent.config.reply?.escalate || "",
          afterHours: agent.config.reply?.afterHours || "",
        },
      });
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    const interactive = e.target.closest(
      "button, input, textarea, select, a, [data-no-pan]",
    );
    if (interactive) return;
    setIsCanvasPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: canvasPan.x,
      panY: canvasPan.y,
    };
  };

  const handleCanvasMouseMove = (e) => {
    if (!isCanvasPanning) return;
    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setCanvasPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isCanvasPanning) return;
    setIsCanvasPanning(false);
  };

  const handleCanvasWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => Math.min(1.8, Math.max(0.5, z * zoomFactor)));
  };

  const allConfigured = NODES.every((n) => nodeConfigs[n.id]);
  const configuredCount = NODES.filter((n) => nodeConfigs[n.id]).length;
  const hasFlow = flowStarted || isLive || isTraining || configuredCount > 0;

  const CANVAS_W = 1060;
  const CANVAS_H = 290;

  // ── Agent detail page view ────────────────────────────────────────────────
  if (viewingAgentId) {
    return (
      <div className="-mx-6 -mt-6 min-h-[calc(100vh-60px)] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] dark:bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] flex flex-col">
        <AgentDetailPage
          agentId={viewingAgentId}
          onBack={() => setViewingAgentId(null)}
          onToggle={handleToggleAgent}
          onDelete={async (agent) => {
            if (
              !confirm(
                `Delete agent for session ${agent.session?.phoneNumber || agent.sessionId}?`,
              )
            )
              return;
            await authFetch(`/api/ai-agent/agents/${agent._id}`, {
              method: "DELETE",
            }).catch(() => {});
            setExistingAgents((a) => a.filter((x) => x._id !== agent._id));
            setViewingAgentId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="-mx-6 -mt-6 min-h-[calc(100vh-60px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] flex flex-col">
      <style>{`
        @keyframes flowDash   { to { stroke-dashoffset: -26; } }
        @keyframes spinNode   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinNodeR  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes pulseOrb   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes floatDot   { 0%,100% { transform: translateY(0) scale(1); opacity: 0.7; } 50% { transform: translateY(-14px) scale(1.3); opacity: 0.2; } }
        @keyframes nodeAppear { from { opacity:0; transform: scale(0.94) translateY(8px); } to { opacity:1; transform: scale(1) translateY(0); } }
        @keyframes panelSlide { from { opacity:0; transform: translateX(16px); } to { opacity:1; transform: translateX(0); } }
        @keyframes softFloat  { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        .node-appear  { animation: nodeAppear 0.4s ease-out both; }
        .panel-slide  { animation: panelSlide 0.3s ease-out both; }
        .soft-float   { animation: softFloat 4s ease-in-out infinite; }
      `}</style>

      {!hasFlow && !isTraining && !isLive ? (
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-white/45">
              <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-sm dark:bg-slate-900/70 dark:border-white/10 dark:text-white/70">
                AI Flow Builder
              </span>
              <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-sm dark:bg-slate-900/70 dark:border-white/10 dark:text-white/70">
                Session-aware automation
              </span>
              <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-sm dark:bg-slate-900/70 dark:border-white/10 dark:text-white/70">
                n8n canvas
              </span>
            </div>

            {/* Existing agents section */}
            {(agentsLoading || existingAgents.length > 0) && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Your AI Agents
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                      Manage your deployed auto-reply agents
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFlowStarted(true);
                      setSelectedNode(NODES[0]);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                  >
                    <Plus size={13} /> New Agent
                  </button>
                </div>
                {agentsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-[20px] border border-slate-200 bg-white p-5 h-40 animate-pulse dark:bg-white/3 dark:border-white/10"
                      >
                        <div className="h-3 bg-slate-200 rounded dark:bg-white/8 w-2/3 mb-2" />
                        <div className="h-2 bg-slate-100 rounded dark:bg-white/5 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {existingAgents.map((agent) => (
                      <AgentCard
                        key={agent._id}
                        agent={agent}
                        sessions={sessions}
                        onView={handleViewAgent}
                        onEdit={handleEditAgent}
                        onDelete={handleDeleteAgent}
                        onToggle={handleToggleAgent}
                        onChangeSession={handleChangeSession}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.08),transparent_35%,rgba(16,185,129,0.08))]" />
                <div className="relative z-10 max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm dark:bg-slate-900/80 dark:border-white/12 dark:text-white/70">
                    <Sparkles
                      size={11}
                      className="text-violet-500 dark:text-violet-400 animate-soft-float"
                    />
                    {existingAgents.length > 0
                      ? "Create another AI flow"
                      : "Create your first AI flow"}
                  </div>
                  <h1 className="max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    Build a WhatsApp AI flow with a clean visual canvas.
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px] dark:text-white/60">
                    Pick a connected session, create the flow, then configure
                    trigger, knowledge, AI and reply nodes in a workspace that
                    feels closer to n8n than a regular admin page.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      ["Trigger", "Start from a WhatsApp session"],
                      ["Knowledge", "Attach docs or text context"],
                      ["Reply", "Deploy a smart auto-response"],
                    ].map(([title, desc]) => (
                      <div
                        key={title}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                      >
                        <p className="text-sm font-bold text-slate-900 dark:text-white/90">
                          {title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50">
                          {desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        setFlowStarted(true);
                        setSelectedNode(NODES[0]);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(79,70,229,0.22)] transition-transform hover:scale-[1.01]"
                    >
                      <Plus size={16} />
                      Create flow
                    </button>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-xs text-slate-500 dark:text-white/50">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Session-linked, secure, and ready for WhatsApp automation.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">
                        Session
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                        Choose a connected WhatsApp line
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-600">
                      {sessionsLoading
                        ? "Loading"
                        : `${sessions.length} connected`}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {sessionsLoading ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-white/12 dark:bg-white/5 dark:text-white/50">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin dark:border-white/25 dark:border-t-white/75" />
                        Loading sessions...
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300">
                        No connected sessions yet. Connect one first, then
                        return here to build your flow.
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <button
                          key={session.sessionId}
                          onClick={() => setSelectedNode(NODES[0])}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8 dark:hover:border-violet-400/40"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 text-violet-600">
                            <Smartphone size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white/90">
                              {session.phoneNumber ||
                                session.name ||
                                session.sessionId}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-white/45">
                              {session.sessionId}
                            </p>
                          </div>
                          <div className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">
                            Ready
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setFlowStarted(true);
                      setSelectedNode(NODES[0]);
                    }}
                    disabled={sessionsLoading || sessions.length === 0}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/12 dark:border dark:border-white/12 dark:hover:bg-white/20"
                  >
                    <Zap size={16} />
                    Start building flow
                  </button>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-white/35">
                    Workflow preview
                  </p>
                  <div className="mt-4 space-y-3">
                    {NODES.map((node, index) => {
                      const Icon = node.icon;
                      return (
                        <div
                          key={node.id}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                        >
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl"
                            style={{
                              background: node.colorDark,
                              color: node.color,
                            }}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white/90">
                              {node.title}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-white/45">
                              Step {index + 1} · {node.desc}
                            </p>
                          </div>
                          <ArrowRight
                            size={14}
                            className="text-slate-300 dark:text-white/20"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {hasFlow && (
        <>
          {/* Top toolbar */}
          <div className="flex-shrink-0 flex items-center gap-3 px-6 h-14 bg-white/92 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.45)] dark:shadow-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-none dark:text-white">
                  AI Auto-Reply Agent
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isLive
                    ? "Workflow active"
                    : `${configuredCount} / ${NODES.length} nodes configured`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-4">
              {NODES.map((n, i) => (
                <div key={n.id} className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${nodeConfigs[n.id] ? "scale-125" : "scale-100"}`}
                    style={{
                      background: nodeConfigs[n.id] ? n.color : "#334155",
                    }}
                  />
                  {i < NODES.length - 1 && (
                    <div className="w-3 h-px bg-slate-300 dark:bg-white/10" />
                  )}
                </div>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  handleReset();
                }}
                className="text-xs text-slate-500 dark:text-white/40 hover:text-slate-700 px-2 py-1"
              >
                ← Back
              </button>
              {/* Zoom */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                  className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Minus size={10} />
                </button>
                <span className="text-[10px] font-bold text-slate-500 w-8 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                  className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Plus size={10} />
                </button>
              </div>

              {isLive ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/12 border border-emerald-500/25 text-emerald-500 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </div>
              ) : (
                <button
                  onClick={handleDeploy}
                  disabled={!allConfigured}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 text-white"
                  style={{
                    background: allConfigured
                      ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                      : "#334155",
                    boxShadow: allConfigured
                      ? "0 4px 16px rgba(124,58,237,0.4)"
                      : "none",
                  }}
                >
                  <Zap size={12} />
                  Deploy Agent
                </button>
              )}
            </div>
          </div>

          {isLive ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <AgentDashboard
                agentConfig={nodeConfigs}
                agentId={deployedAgentId}
                summaryId={deployedSummaryId}
                onDeactivate={handleReset}
              />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Canvas */}
              <div
                className={`flex-1 overflow-auto relative bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,_#0b1220_0%,_#111827_100%)] ${isCanvasPanning ? "cursor-grabbing" : "cursor-grab"}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleCanvasWheel}
              >
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(99,102,241,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.09)_1px,transparent_1px)] bg-[size:28px_28px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] dark:bg-[size:28px_28px]" />
                {knowledgeError && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-2 rounded-xl border border-red-300 bg-red-50 text-red-700 text-xs shadow-sm dark:border-red-800 dark:bg-red-900/40 dark:text-red-200">
                    {knowledgeError}
                  </div>
                )}
                <div className="absolute top-8 left-48 w-64 h-64 rounded-full bg-violet-400/10 dark:bg-violet-500/10 blur-[80px] pointer-events-none" />
                <div className="absolute bottom-8 right-64 w-48 h-48 rounded-full bg-indigo-400/10 dark:bg-indigo-500/10 blur-[60px] pointer-events-none" />

                <div className="min-w-[900px] flex items-start justify-center p-10 pt-14">
                  <div
                    style={{
                      transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${zoom})`,
                      transformOrigin: "top center",
                      transition: "transform 0.2s",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-6 justify-center">
                      <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[3px]">
                        Workflow Canvas
                      </p>
                      <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600" />
                    </div>

                    <div
                      className="relative"
                      style={{ width: CANVAS_W, height: CANVAS_H }}
                    >
                      <svg
                        width={CANVAS_W}
                        height={CANVAS_H}
                        className="absolute inset-0 pointer-events-none"
                        style={{ overflow: "visible" }}
                      >
                        {CONNECTIONS.map((conn, i) => (
                          <Connection
                            key={i}
                            index={i}
                            from={conn.from}
                            to={conn.to}
                            configured={
                              !!(
                                nodeConfigs[conn.from.id] &&
                                nodeConfigs[conn.to.id]
                              )
                            }
                            active={false}
                          />
                        ))}
                        {NODES.map((node) => (
                          <CanvasNode
                            key={node.id}
                            node={node}
                            selected={selectedNode}
                            configured={!!nodeConfigs[node.id]}
                            running={false}
                            done={!!nodeConfigs[node.id]}
                            onSelect={setSelectedNode}
                          />
                        ))}
                      </svg>
                    </div>

                    <div className="flex items-center justify-center mt-8 gap-6">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        ● Click a node to configure it
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        ● Configure all {NODES.length} nodes to deploy
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        ● Press Deploy to activate your agent
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right config panel */}
              <div
                className={`flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col transition-all duration-300 ${selectedNode ? "w-[340px]" : "w-[68px]"}`}
              >
                {selectedNode ? (
                  <div className="h-full panel-slide" key={selectedNode.id}>
                    <ConfigPanel
                      node={selectedNode}
                      config={nodeConfigs[selectedNode.id]}
                      onSave={handleSaveNode}
                      sessions={sessions}
                      sessionsLoading={sessionsLoading}
                      adminModel={adminModel}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 gap-3">
                    {NODES.map((n) => {
                      const Icon = n.icon;
                      const done = !!nodeConfigs[n.id];
                      return (
                        <button
                          key={n.id}
                          onClick={() => setSelectedNode(n)}
                          title={n.title}
                          className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                          style={{
                            background: done
                              ? n.colorDark
                              : "rgba(255,255,255,0.04)",
                            border: `1px solid ${done ? n.color + "40" : "rgba(255,255,255,0.06)"}`,
                          }}
                        >
                          <Icon
                            size={16}
                            style={{
                              color: done ? n.color : "rgba(255,255,255,0.2)",
                            }}
                          />
                          {done && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check size={7} className="text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isTraining && <TrainingModal onDone={handleTrainDone} />}
      {isKnowledgeProcessing && <KnowledgeProcessingOverlay />}
    </div>
  );
}
