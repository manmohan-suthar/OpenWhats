import { Handle, Position } from "reactflow";
import { Type, Variable, Scissors } from "lucide-react";
import NodeActionBar from "./NodeActionBar";

export const UserInputNodeConfig = {
  label: "User Input",
  icon: Type,
  accent: "#22c55e",
  defaults: {
    prompt: "Please type your response",
    variableKey: "user_input",
    inputType: "text",
    enableSplit: false,
    splitVariables: "",
  },
};

const INPUT_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
];

const panelCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all";

// ─── Canvas node ──────────────────────────────────────────────────────────────

export function UserInputFlowNode({ id, data, selected }) {
  const varKey = data.variableKey || "variable";
  const splitVars =
    data.enableSplit && data.splitVariables
      ? data.splitVariables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const executionState = data.executionState;
  const isExecuting = ["active", "waiting", "success"].includes(executionState);
  const statusTone =
    executionState === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
      : executionState === "waiting"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300";

  return (
    <div
      className={`group relative min-w-[240px] max-w-[270px] rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.1)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        isExecuting
          ? "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-[1.02] animate-pulse"
          : selected
            ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
            : "hover:shadow-[0_18px_38px_rgba(2,6,23,0.16)]"
      }`}
      style={{ borderColor: "#22c55e66" }}
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
            style={{ backgroundColor: "#22c55e" }}
          >
            <Type size={15} />
          </div>
          <div className="min-w-0 flex-1 pr-[120px]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              User Input
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              #{id.slice(-6)}
            </p>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-2.5 py-2 truncate">
          {data.prompt?.slice(0, 44) || "No prompt set"}
        </div>

        {/* Variable badges — split or single */}
        {splitVars.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {splitVars.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/60 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-700 dark:text-emerald-300"
              >
                <Variable size={7} />
                {`{{${varKey}.${v}}}`}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Saves to:
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
              <Variable size={9} />
              {`{{${varKey}}}`}
            </span>
          </div>
        )}

        {data.executionTitle && (
          <div className={`mt-3 rounded-xl border px-3 py-2 shadow-sm ${statusTone}`}>
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
              <p className="mt-1 text-sm font-medium break-words">{data.executionMessage}</p>
            )}
            {data.executionDetail && (
              <p className="mt-1 text-[11px] opacity-80 break-words">{data.executionDetail}</p>
            )}
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

// ─── Right panel editor ───────────────────────────────────────────────────────

export function UserInputNodeEditor({ data, onUpdate, flowVariables = [] }) {
  const varKey = data.variableKey || "user_input";
  const splitVars =
    data.enableSplit && data.splitVariables
      ? data.splitVariables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const insertVariable = (key) => {
    if (!key) return;
    const token = `{{${key}}}`;
    const current = data.prompt || "";
    const separator = current && !current.endsWith(" ") ? " " : "";
    onUpdate({ prompt: `${current}${separator}${token}` });
  };

  const staticVariables = [
    { key: "incoming_message", source: "system" },
    { key: "user_message", source: "system" },
  ];

  const allVariables = [...staticVariables, ...flowVariables].filter(
    (item, index, arr) =>
      item?.key && arr.findIndex((v) => v.key === item.key) === index,
  );

  return (
    <div className="space-y-4">
      {/* ── Prompt ── */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Prompt Message
        </label>
        <textarea
          rows={3}
          value={data.prompt || ""}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder="e.g. Please type your name, age and city separated by comma"
          className={`${panelCls} resize-none`}
        />
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Sent to the user to ask for their input.
        </p>

        {allVariables.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              Available Variables (click to insert)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allVariables.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  title={`Insert {{${variable.key}}}`}
                >
                  {`{{${variable.key}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Variable Name ── */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Variable Name
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
            {"{{"}
          </span>
          <input
            type="text"
            value={varKey}
            onChange={(e) =>
              onUpdate({
                variableKey: e.target.value
                  .replace(/[^a-z0-9_]/gi, "_")
                  .toLowerCase(),
              })
            }
            placeholder="user_input"
            className={`${panelCls} pl-8 pr-8 font-mono`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
            {"}}"}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          Full reply stored in{" "}
          <code className="font-mono bg-slate-100 dark:bg-slate-700/60 px-1 rounded text-emerald-600 dark:text-emerald-400">
            {`{{${varKey}}}`}
          </code>
          . Use in messages, conditions, etc.
        </p>
      </div>

      {/* ── Input Type ── */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Input Type
        </label>
        <select
          value={data.inputType || "text"}
          onChange={(e) => onUpdate({ inputType: e.target.value })}
          className={panelCls}
        >
          {INPUT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Validates the format of the user's response.
        </p>
      </div>

      {/* ── Split by comma → named variables (optional) ── */}
      <div className="rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        {/* Toggle header */}
        <button
          type="button"
          onClick={() => onUpdate({ enableSplit: !data.enableSplit })}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-700/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Scissors size={13} className="text-emerald-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Split by comma → named variables
              </span>
              <span className="ml-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                optional
              </span>
            </div>
          </div>
          {/* Toggle pill */}
          <div
            className={`relative flex-shrink-0 ml-2 w-9 h-5 rounded-full transition-colors duration-200 ${
              data.enableSplit ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                data.enableSplit ? "left-[18px]" : "left-0.5"
              }`}
            />
          </div>
        </button>

        {/* Expanded body */}
        {data.enableSplit && (
          <div className="p-3.5 space-y-3 border-t border-slate-200/40 dark:border-slate-700/40">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Variable names (comma-separated)
              </label>
              <input
                type="text"
                value={data.splitVariables || ""}
                onChange={(e) => onUpdate({ splitVariables: e.target.value })}
                placeholder="name,age,address"
                className={`${panelCls} font-mono text-xs`}
              />
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                User types{" "}
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  "manmohan,20,ellenabad"
                </span>{" "}
                → each comma-separated part maps to a named variable below.
              </p>
            </div>

            {/* Live variable preview */}
            {splitVars.length > 0 && (
              <div className="rounded-lg border border-emerald-200/60 dark:border-emerald-700/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-2.5 space-y-1.5">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">
                  Variables created
                </p>
                {splitVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400 dark:text-slate-500 font-mono w-12 flex-shrink-0 text-right">
                      Part {i + 1}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">→</span>
                    <code className="font-mono font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded select-all">
                      {`{{${varKey}.${v}}}`}
                    </code>
                  </div>
                ))}
                <p className="pt-1.5 text-[11px] text-slate-400 dark:text-slate-500 border-t border-emerald-200/50 dark:border-emerald-700/30 mt-1.5">
                  Use these in Google Sheets values, messages, conditions, etc.
                </p>
              </div>
            )}

            {/* Example */}
            <div className="rounded-lg border border-slate-200/50 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30 px-2.5 py-2">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Example
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Input: <span className="text-slate-700 dark:text-slate-200">manmohan,20,ellenabad</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                varKey: <span className="text-emerald-600 dark:text-emerald-400">input</span>
                {" · "}names: <span className="text-emerald-600 dark:text-emerald-400">name,age,city</span>
              </p>
              <div className="mt-1 space-y-0.5">
                {["name→manmohan", "age→20", "city→ellenabad"].map((ex) => {
                  const [k, v] = ex.split("→");
                  return (
                    <p key={k} className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      <span className="text-emerald-600 dark:text-emerald-300">{`{{input.${k}}}`}</span>
                      {" = "}
                      <span className="text-slate-600 dark:text-slate-300">{v}</span>
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
