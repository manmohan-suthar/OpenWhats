import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Code2,
  Link2,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Play,
  Rocket,
  Save,
  Settings2,
  Sparkles,
  Undo2,
  WandSparkles,
} from "lucide-react";

const TOOL_ITEMS = [
  { key: "save", icon: Save, label: "Save" },
  { key: "magic", icon: WandSparkles, label: "Magic" },
  // { key: "deploy", icon: Rocket, label: "Deploy" },
  // { key: "nodes", icon: Link2, label: "Nodes" },
  // { key: "settings", icon: Settings2, label: "Settings" },
  // { key: "chat", icon: MessageSquareText, label: "Comment" },
  // { key: "undo", icon: Undo2, label: "Undo" },
];

const ACTION_ITEMS = [
  // {
  //   key: "tools",
  //   icon: Settings2,
  //   label: "Tools",
  //   className: "from-violet-500 to-violet-600",
  // },
  // {
  //   key: "logic",
  //   icon: Code2,
  //   label: "Code",
  //   className: "from-orange-500 to-orange-600",
  // },
  // {
  //   key: "ai",
  //   icon: Bot,
  //   label: "AI",
  //   className: "from-fuchsia-500 to-purple-600",
  // },
  {
    key: "add",
    icon: Plus,
    label: "Add",
    className: "from-violet-500 to-indigo-600",
  },
];

export default function WorkflowBottomToolbar({
  onRunOnce,
  isRunning = false,
}) {
  const [activeAction, setActiveAction] = useState("run");
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [everyFifteenMinutes, setEveryFifteenMinutes] = useState(false);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-3">
      <div className="relative flex items-center gap-3 rounded-2xl border border-white/20 bg-white/70 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
        {/* Glow effect */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-indigo-500/10 blur-xl" />

        {/* 🔴 RUN BUTTON */}
        <div className="flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg">
          <button
            onClick={onRunOnce}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-80"
          >
            <Play size={16} fill="currentColor" />
            {isRunning ? "Running..." : "Run Once"}
          </button>
          <button className="border-l border-white/20 px-3 text-white hover:bg-white/10">
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* 🟡 TOOL ICONS */}
        <div className="flex items-center gap-1 rounded-xl bg-white/60 p-1 shadow-inner dark:bg-slate-800/60">
          {TOOL_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className="group flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-all hover:scale-110 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>

        {/* 🟣 ACTION BUTTONS */}
        <div className="flex items-center gap-2">
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeAction === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setActiveAction(item.key)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${item.className} text-white shadow-lg scale-105`
                    : "bg-white/70 text-slate-700 hover:bg-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* ⚪ RIGHT ACTIONS */}
        <div className="flex items-center gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 shadow hover:scale-110 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700">
            <MoreHorizontal size={18} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 shadow hover:scale-110 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700">
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
