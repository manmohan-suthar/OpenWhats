import { useCallback } from "react";
import { Handle, Position } from "reactflow";
import { Plus, Split, Trash2, Variable } from "lucide-react";
import NodeActionBar from "./NodeActionBar";

const SYSTEM_FIELDS = [
  { key: "user.message", label: "User's message" },
  { key: "user.reply", label: "User's reply" },
  { key: "user.phone", label: "User's phone" },
  { key: "user.name", label: "User's name" },
  { key: "user.email", label: "User's email" },
];

const ROUTER_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "expression", label: "expression" },
];

const panelCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all";

function makeCaseId() {
  return `case_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

export function makeRouterCase() {
  return {
    id: makeCaseId(),
    operator: "equals",
    value: "yes",
  };
}

function buildCaseLabel(routerCase, index) {
  const operator = routerCase.operator || "equals";
  const value = routerCase.value || "...";
  if (operator === "expression") return `expr → ${value}`;
  return `${operator} "${value}"`;
}

function CaseRow({ routerCase, index, onChange, onRemove, canRemove }) {
  return (
    <div className="relative rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/35 p-3 pr-10">
      <Handle
        type="source"
        position={Position.Right}
        id={routerCase.id}
        className="!w-3.5 !h-3.5 !bg-violet-500 !border-2 !border-white dark:!border-slate-900"
        style={{ right: -8 }}
      />

      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Case {index + 1}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
            {buildCaseLabel(routerCase, index)}
          </p>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
        <select
          value={routerCase.operator || "equals"}
          onChange={(event) => onChange({ operator: event.target.value })}
          className={panelCls}
        >
          {ROUTER_OPERATORS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div>
          <input
            type="text"
            value={routerCase.value || ""}
            onChange={(event) => onChange({ value: event.target.value })}
            placeholder={
              routerCase.operator === "expression"
                ? '{{user_input === "both" || user_input === "yes"}}'
                : "e.g. yes, no, both"
            }
            className={panelCls}
          />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Use comma-separated values for multi-match equals.
          </p>
        </div>
      </div>
    </div>
  );
}

export function RouterFlowNode({ id, data, selected }) {
  const cases = data.cases?.length ? data.cases : [makeRouterCase()];
  const executionState = data.executionState;
  const isExecuting = [
    "active",
    "matching",
    "matched",
    "default",
    "error",
  ].includes(executionState);
  const resultTone =
    executionState === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
      : executionState === "default"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        : executionState === "matched"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300";

  return (
    <div
      className={`group relative min-w-[360px] max-w-[460px] rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.1)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        isExecuting
          ? "ring-2 ring-violet-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-[1.02] animate-pulse"
          : selected
            ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
            : "hover:shadow-[0_18px_38px_rgba(2,6,23,0.16)]"
      }`}
      style={{ borderColor: "#8b5cf666" }}
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
            style={{ backgroundColor: "#8b5cf6" }}
          >
            <Split size={15} />
          </div>
          <div className="min-w-0 flex-1 pr-[120px]">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Router / Switch
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              #{id.slice(-6)}
            </p>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-2.5 py-2">
          Route on {data.field || "user_input"}
        </div>

        <div className="mt-3 space-y-2">
          {cases.map((routerCase, index) => (
            <div
              key={routerCase.id}
              className="relative rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-white/70 dark:bg-slate-900/30 px-3 py-2 pr-10"
            >
              <Handle
                type="source"
                position={Position.Right}
                id={routerCase.id}
                className="!w-3 !h-3 !bg-violet-500 !border-2 !border-white dark:!border-slate-900"
                style={{ right: -8 }}
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Case {index + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100 break-words">
                {buildCaseLabel(routerCase, index)}
              </p>
            </div>
          ))}

          <div className="relative rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 px-3 py-2 pr-10">
            <Handle
              type="source"
              position={Position.Right}
              id="default"
              className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-slate-900"
              style={{ right: -8 }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Default
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
              Fallback route when nothing matches
            </p>
          </div>
        </div>

        {data.executionTitle && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 shadow-sm ${resultTone}`}
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
              <p className="mt-1 text-sm font-semibold break-words">
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
      </div>
    </div>
  );
}

export function RouterNodeEditor({ data, onUpdate, flowVariables = [] }) {
  const cases = data.cases?.length ? data.cases : [makeRouterCase()];

  const updateCase = useCallback(
    (caseId, changes) => {
      onUpdate({
        cases: cases.map((routerCase) =>
          routerCase.id === caseId ? { ...routerCase, ...changes } : routerCase,
        ),
      });
    },
    [cases, onUpdate],
  );

  const addCase = () => {
    onUpdate({ cases: [...cases, makeRouterCase()] });
  };

  const removeCase = (caseId) => {
    const nextCases = cases.filter((routerCase) => routerCase.id !== caseId);
    onUpdate({ cases: nextCases.length ? nextCases : [makeRouterCase()] });
  };

  const fieldSuggestions = [
    ...(flowVariables || []).map((item) => `{{${item.key}}}`),
    ...SYSTEM_FIELDS.map((field) => field.key),
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Route Field
        </label>
        <input
          list="router-fields"
          type="text"
          value={data.field || ""}
          onChange={(event) => onUpdate({ field: event.target.value })}
          placeholder="user_input"
          className={panelCls}
        />
        <datalist id="router-fields">
          {fieldSuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Compare this field against each case in order.
        </p>

        {fieldSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fieldSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onUpdate({ field: suggestion })}
                className="inline-flex items-center gap-1 rounded-full border border-violet-200/70 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 text-[10px] font-mono font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
              >
                <Variable size={9} />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Cases
          </label>
          <button
            type="button"
            onClick={addCase}
            className="inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-colors"
          >
            <Plus size={11} /> Add Case
          </button>
        </div>

        <div className="space-y-2">
          {cases.map((routerCase, index) => (
            <div key={routerCase.id} className="relative">
              <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
                <select
                  value={routerCase.operator || "equals"}
                  onChange={(event) =>
                    updateCase(routerCase.id, { operator: event.target.value })
                  }
                  className={panelCls}
                >
                  {ROUTER_OPERATORS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={routerCase.value || ""}
                  onChange={(event) =>
                    updateCase(routerCase.id, { value: event.target.value })
                  }
                  placeholder={
                    routerCase.operator === "expression"
                      ? '{{user_input === "both" || user_input === "yes"}}'
                      : "yes, no, both"
                  }
                  className={panelCls}
                />

                <button
                  type="button"
                  onClick={() => removeCase(routerCase.id)}
                  className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  title="Remove case"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Case {index + 1} routes through its output handle.
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/20 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
          <Split size={13} />
          <span>Multi-branch outputs</span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Default fallback included
        </div>
      </div>
    </div>
  );
}

export const RouterNodeConfig = {
  label: "Router / Switch",
  icon: Split,
  accent: "#8b5cf6",
  defaults: {
    field: "user_input",
    cases: [makeRouterCase()],
    defaultLabel: "Default",
    executionState: "idle",
    executionTitle: "",
    executionMessage: "",
    executionDetail: "",
  },
};
