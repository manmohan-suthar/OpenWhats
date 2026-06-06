import { Handle, Position } from "reactflow";
import { GitBranch, MessageSquare } from "lucide-react";
import {
  NODE_MAP,
  BUBBLE_STATUS_META,
  getLabelFromType,
  nodeSummary,
} from "./nodeConfig";
import NodeActionBar from "./NodeActionBar";
import { ConditionFlowNode } from "./ConditionNode";
import { RouterFlowNode } from "./RouterNode";
import { UserInputFlowNode } from "./UserInputNode";
import { ApiFlowNode } from "./ApiNode";
import { GoogleSheetsFlowNode } from "./GoogleSheetsNode";

function FlowNode({ id, type, data, selected }) {
  const meta = NODE_MAP[type];
  const Icon = meta?.icon || GitBranch;
  const summary = nodeSummary(type, data);
  const bubbleStatus =
    BUBBLE_STATUS_META[data.bubbleStatus] || BUBBLE_STATUS_META.sent;
  const bubbleMessage =
    data.bubbleMessage || data.message || "Thanks for your message!";
  const bubbleTimestamp = data.bubbleTimestamp || "Now";
  const showBubble = type === "message" && !!data.showBubble;
  const executionState = data.executionState;
  const isExecuting = ["active", "waiting", "loading", "evaluating"].includes(
    executionState,
  );

  const executionTone =
    executionState === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
      : executionState === "success" || executionState === "true"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
        : executionState === "false"
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
          : executionState === "waiting"
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
            : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300";

  return (
    <div
      className={`group relative min-w-[240px] max-w-[270px] rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.1)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        isExecuting
          ? "ring-2 ring-violet-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-[1.02] animate-pulse"
          : selected
            ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
            : "hover:shadow-[0_18px_38px_rgba(2,6,23,0.16)]"
      }`}
      style={{ borderColor: `${data.accent}66`, ringColor: data.accent }}
    >
      <NodeActionBar nodeId={id} />

      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white dark:!border-slate-900"
      />

      <div className="p-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: data.accent }}
          >
            <Icon size={15} />
          </div>
          <div className="min-w-0 flex-1 pr-[120px]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {getLabelFromType(type)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              #{id.slice(-6)}
            </p>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-2.5 py-2">
          {summary || "Configure from right panel"}
        </div>

        {data.executionTitle && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 shadow-sm ${executionTone}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">
                {data.executionTitle}
              </p>
              {executionState && (
                <span className="rounded-full bg-white/60 dark:bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {executionState}
                </span>
              )}
            </div>
            {data.executionMessage && (
              <p className="mt-1 text-sm font-medium break-words">
                {data.executionMessage}
              </p>
            )}
            {data.executionDetail && (
              <p className="mt-1 text-[11px] opacity-80 break-words">
                {data.executionDetail}
              </p>
            )}
          </div>
        )}

        {showBubble && (
          <div className="mt-3 flex justify-end">
            <div
              className={`w-full max-w-[78%] rounded-2xl rounded-br-md border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-100 via-lime-50 to-emerald-50 dark:from-emerald-900/35 dark:via-emerald-900/25 dark:to-slate-800/75 px-3 py-2 shadow-sm transition-all duration-300 ease-out ${
                data.bubbleStatus === "running"
                  ? "opacity-80 translate-y-1"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  <MessageSquare size={11} /> WhatsApp
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${bubbleStatus.className}`}
                >
                  {bubbleStatus.label}
                </span>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-800 dark:text-slate-100 break-words">
                {bubbleMessage}
              </p>
              <div className="mt-2 flex justify-end text-[10px] text-slate-500 dark:text-slate-400">
                {bubbleTimestamp}
              </div>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}

export const nodeTypes = {
  trigger: FlowNode,
  message: FlowNode,
  condition: ConditionFlowNode,
  router: RouterFlowNode,
  input: UserInputFlowNode,
  api: ApiFlowNode,
  googlesheets: GoogleSheetsFlowNode,
  delay: FlowNode,
  ai: FlowNode,
};

export default FlowNode;
