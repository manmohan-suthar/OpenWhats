import { useCallback } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import {
  CheckCircle2,
  Plus,
  Split,
  Trash2,
  Variable,
  XCircle,
} from "lucide-react";
import NodeActionBar from "./NodeActionBar";

// ─── System fields always available in every flow ─────────────────────────────

const SYSTEM_FIELDS = [
  { key: "user.message", label: "User's message" },
  { key: "user.reply", label: "User's reply" },
  { key: "user.phone", label: "User's phone" },
  { key: "user.name", label: "User's name" },
  { key: "user.email", label: "User's email" },
];

// ─── Operator catalogue ───────────────────────────────────────────────────────

export const OPERATOR_GROUPS = [
  {
    group: "Text",
    ops: [
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "≠ not equals" },
      { value: "contains", label: "contains" },
      { value: "not_contains", label: "not contains" },
      { value: "starts_with", label: "starts with" },
      { value: "ends_with", label: "ends with" },
    ],
  },
  {
    group: "Number",
    ops: [
      { value: "gt", label: "> greater" },
      { value: "lt", label: "< less" },
      { value: "gte", label: ">= gte" },
      { value: "lte", label: "<= lte" },
      { value: "num_eq", label: "= equals" },
    ],
  },
  {
    group: "General",
    ops: [
      { value: "exists", label: "exists" },
      { value: "not_exists", label: "not exists" },
      { value: "is_empty", label: "is empty" },
      { value: "is_not_empty", label: "not empty" },
    ],
  },
  {
    group: "Advanced",
    ops: [
      { value: "in_list", label: "in list" },
      { value: "not_in_list", label: "not in list" },
      { value: "regex", label: "regex match" },
    ],
  },
];

const NO_VALUE_OPS = new Set([
  "exists",
  "not_exists",
  "is_empty",
  "is_not_empty",
]);

export function makeRule() {
  return {
    id: `r_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    field: "user.message",
    operator: "contains",
    value: "",
  };
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const compactCls =
  "h-7 px-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400/50 transition-all";

const panelCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all";

// ─── Logic badge between rules ────────────────────────────────────────────────

function LogicDivider({ logic }) {
  return (
    <div className="flex items-center gap-1.5 my-2">
      <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/40" />
      <span
        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
          logic === "AND"
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
        }`}
      >
        {logic}
      </span>
      <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/40" />
    </div>
  );
}

// ─── Compact rule row (inside the canvas node) ────────────────────────────────

function RuleRow({
  rule,
  onChange,
  onRemove,
  canRemove,
  index,
  logic,
  flowVars,
}) {
  const showValue = !NO_VALUE_OPS.has(rule.operator);
  const fieldListId = `canvas-fields-${rule.id}`;
  const valueListId = `canvas-values-${rule.id}`;

  // Combine flow variables + system fields for autocomplete
  const suggestions = [
    ...(flowVars || []).map((v) => `{{${v.key}}}`),
    ...SYSTEM_FIELDS.map((f) => f.key),
  ];

  return (
    <div>
      {index > 0 && <LogicDivider logic={logic} />}
      <div className="flex items-center gap-1">
        <input
          list={fieldListId}
          value={rule.field}
          onChange={(e) => onChange({ field: e.target.value })}
          placeholder="{{var}} or field"
          className={`${compactCls} flex-1 min-w-0`}
        />
        <datalist id={fieldListId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <select
          value={rule.operator}
          onChange={(e) => onChange({ operator: e.target.value })}
          className={`${compactCls} w-[82px] flex-shrink-0`}
        >
          {OPERATOR_GROUPS.map((grp) => (
            <optgroup key={grp.group} label={grp.group}>
              {grp.ops.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {showValue && (
          <>
            <input
              list={valueListId}
              className={`${compactCls} w-[72px] flex-shrink-0`}
              value={rule.value}
              placeholder="value or {{var}}"
              onChange={(e) => onChange({ value: e.target.value })}
            />
            <datalist id={valueListId}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </>
        )}

        {canRemove && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Condition Flow Node (React Flow canvas renderer) ─────────────────────────

export function ConditionFlowNode({ id, data, selected }) {
  const { setNodes, getNodes } = useReactFlow();
  const executionState = data.executionState;
  const isExecuting = ["active", "evaluating", "waiting"].includes(
    executionState,
  );
  const resultTone =
    executionState === "false"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
      : executionState === "true"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300";

  // Snapshot of all flow variables (User Input + API response) — refreshes on each render
  const allNodes = getNodes();
  const flowVars = [
    ...allNodes
      .filter((n) => n.type === "input" && n.data?.variableKey)
      .map((n) => ({ key: n.data.variableKey })),
    ...allNodes
      .filter((n) => n.type === "api" && n.data?.responseKeys?.length)
      .flatMap((n) => (n.data.responseKeys || []).map((key) => ({ key }))),
  ];

  const rules = data.rules?.length ? data.rules : [makeRule()];
  const logic = data.logic || "AND";

  const patch = useCallback(
    (update) =>
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...update } } : n,
        ),
      ),
    [id, setNodes],
  );

  const updateRule = (ruleId, changes) =>
    patch({
      rules: rules.map((r) => (r.id === ruleId ? { ...r, ...changes } : r)),
    });

  const addRule = () => patch({ rules: [...rules, makeRule()] });

  const removeRule = (ruleId) => {
    const next = rules.filter((r) => r.id !== ruleId);
    patch({ rules: next.length ? next : [makeRule()] });
  };

  const stopAndCall = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className={`group relative min-w-[320px] max-w-[400px] rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.1)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        isExecuting
          ? "ring-2 ring-blue-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-[1.02] animate-pulse"
          : selected
            ? "ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
            : "hover:shadow-[0_18px_38px_rgba(2,6,23,0.16)]"
      }`}
      style={{ borderColor: "#3b82f666" }}
    >
      <NodeActionBar nodeId={id} />

      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white dark:!border-slate-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5 border-b border-slate-100/70 dark:border-slate-800/60">
        <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 bg-blue-500">
          <Split size={15} />
        </div>
        <div className="min-w-0 flex-1 pr-[124px]">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Condition
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            #{id.slice(-6)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2">
        {/* IF / logic toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            IF
          </span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={stopAndCall(() =>
              patch({ logic: logic === "AND" ? "OR" : "AND" }),
            )}
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${
              logic === "AND"
                ? "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {logic === "AND" ? "ALL" : "ANY"}
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            of these match:
          </span>
        </div>

        {/* Rules */}
        <div>
          {rules.map((rule, i) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={i}
              logic={logic}
              onChange={(changes) => updateRule(rule.id, changes)}
              onRemove={() => removeRule(rule.id)}
              canRemove={rules.length > 1}
              flowVars={flowVars}
            />
          ))}
        </div>

        {/* Add condition */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={stopAndCall(addRule)}
          className="w-full flex items-center gap-1.5 justify-center py-1.5 rounded-lg border border-dashed border-blue-300/70 dark:border-blue-700/50 text-[11px] font-semibold text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-all"
        >
          <Plus size={11} /> Add Condition
        </button>

        {/* TRUE / FALSE output labels */}
        <div className="flex items-center justify-between px-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <CheckCircle2 size={11} /> True
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
            False <XCircle size={11} />
          </span>
        </div>
      </div>

      {/* Source handles */}
      <Handle
        type="source"
        id="true"
        position={Position.Bottom}
        style={{ left: "28%" }}
        className="!w-3.5 !h-3.5 !bg-emerald-500 !border-2 !border-white dark:!border-slate-900"
      />
      <Handle
        type="source"
        id="false"
        position={Position.Bottom}
        style={{ left: "72%" }}
        className="!w-3.5 !h-3.5 !bg-rose-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}

// ─── Panel rule card (right sidebar editor) ───────────────────────────────────

function PanelRuleCard({
  rule,
  index,
  logic,
  total,
  onChange,
  onRemove,
  flowVariables,
}) {
  const showValue = !NO_VALUE_OPS.has(rule.operator);
  const listId = `fields-${rule.id}`;
  const vars = flowVariables || [];

  const valuePlaceholder =
    rule.operator === "in_list" || rule.operator === "not_in_list"
      ? "a, b, c"
      : rule.operator === "regex"
        ? "^hello.*"
        : "Enter value...";

  // Chips: input vars (green) + API response vars (purple) + system fields (blue)
  const inputChips = vars
    .filter((v) => !v.source || v.source === "input")
    .map((v) => `{{${v.key}}}`);
  const apiChips = vars
    .filter((v) => v.source === "api")
    .map((v) => `{{${v.key}}}`);
  const sysChips = SYSTEM_FIELDS.map((f) => f.key);

  return (
    <div className="rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-800/30 p-3 space-y-2.5">
      {index > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/40" />
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              logic === "AND"
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            {logic}
          </span>
          <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/40" />
        </div>
      )}

      {/* Field — free text with datalist + clickable chips */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Field
        </label>
        <input
          list={listId}
          value={rule.field}
          onChange={(e) => onChange({ field: e.target.value })}
          placeholder="Type {{variable}} or pick below..."
          className={panelCls}
        />
        <datalist id={listId}>
          {inputChips.map((v) => (
            <option key={v} value={v} />
          ))}
          {apiChips.map((v) => (
            <option key={v} value={v} />
          ))}
          {sysChips.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>

        {/* Clickable chips */}
        {(inputChips.length > 0 ||
          apiChips.length > 0 ||
          sysChips.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {inputChips.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ field: v })}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border transition-all hover:scale-105 active:scale-95 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                <Variable size={9} />
                {v}
              </button>
            ))}
            {apiChips.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ field: v })}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border transition-all hover:scale-105 active:scale-95 bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700/60 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              >
                <Variable size={9} />
                {v}
              </button>
            ))}
            {sysChips.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ field: v })}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border transition-all hover:scale-105 active:scale-95 bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className={showValue ? "flex-1" : "w-full"}>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Operator
          </label>
          <select
            value={rule.operator}
            onChange={(e) => onChange({ operator: e.target.value })}
            className={panelCls}
          >
            {OPERATOR_GROUPS.map((grp) => (
              <optgroup key={grp.group} label={grp.group}>
                {grp.ops.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {showValue && (
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Value
            </label>
            <input
              list={`${listId}-value`}
              className={panelCls}
              value={rule.value}
              placeholder={valuePlaceholder}
              onChange={(e) => onChange({ value: e.target.value })}
            />
            <datalist id={`${listId}-value`}>
              {inputChips.map((v) => (
                <option key={v} value={v} />
              ))}
              {apiChips.map((v) => (
                <option key={v} value={v} />
              ))}
              {sysChips.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            {(inputChips.length > 0 || apiChips.length > 0) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {inputChips.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChange({ value: v })}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border transition-all hover:scale-105 active:scale-95 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                  >
                    <Variable size={9} />
                    {v}
                  </button>
                ))}
                {apiChips.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChange({ value: v })}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border transition-all hover:scale-105 active:scale-95 bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700/60 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  >
                    <Variable size={9} />
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {total > 1 && (
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 transition-colors"
        >
          <Trash2 size={11} /> Remove condition
        </button>
      )}
    </div>
  );
}

// ─── Condition Node Editor (right sidebar panel) ──────────────────────────────

export function ConditionNodeEditor({ data, onUpdate, flowVariables = [] }) {
  const rules = data.rules?.length ? data.rules : [makeRule()];
  const logic = data.logic || "AND";
  const advancedMode = data.advancedMode || false;
  const expression = data.expression || "";

  const updateRule = (ruleId, changes) =>
    onUpdate({
      rules: rules.map((r) => (r.id === ruleId ? { ...r, ...changes } : r)),
    });

  const addRule = () => onUpdate({ rules: [...rules, makeRule()] });

  const removeRule = (ruleId) => {
    const next = rules.filter((r) => r.id !== ruleId);
    onUpdate({ rules: next.length ? next : [makeRule()] });
  };

  return (
    <div className="space-y-4">
      {/* Logic toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Match logic
        </label>
        <div className="inline-flex rounded-lg border border-slate-200/40 dark:border-slate-700/40 overflow-hidden">
          {["AND", "OR"].map((mode) => (
            <button
              key={mode}
              onClick={() => onUpdate({ logic: mode })}
              className={`px-4 py-1.5 text-xs font-bold transition-all ${
                logic === mode
                  ? mode === "AND"
                    ? "bg-blue-500 text-white"
                    : "bg-amber-500 text-white"
                  : "bg-white/10 dark:bg-slate-900/20 text-slate-600 dark:text-slate-300 hover:bg-white/20"
              }`}
            >
              {mode === "AND" ? "ALL (AND)" : "ANY (OR)"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          {logic === "AND"
            ? "All conditions must be true"
            : "At least one condition must be true"}
        </p>
      </div>

      {data.executionTitle && (
        <div className={`rounded-xl border px-3 py-2 shadow-sm ${resultTone}`}>
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
            <p className="mt-1 text-sm font-semibold">
              {data.executionMessage}
            </p>
          )}
          {data.executionDetail && (
            <p className="mt-1 text-[11px] opacity-80">
              {data.executionDetail}
            </p>
          )}
        </div>
      )}
      {/* Advanced mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Advanced expression
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Write raw JS-style logic
          </p>
        </div>
        <button
          onClick={() => onUpdate({ advancedMode: !advancedMode })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            advancedMode ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              advancedMode ? "translate-x-4" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {advancedMode ? (
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Expression
          </label>
          <textarea
            rows={4}
            className={panelCls}
            value={expression}
            placeholder={`{{user.message}}.includes("order") && {{api.price}} > 100`}
            onChange={(e) => onUpdate({ expression: e.target.value })}
          />
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            Use {"{{variable}}"} syntax for dynamic values. Output is TRUE or
            FALSE.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Conditions
              <span className="ml-1.5 text-[10px] font-normal text-slate-400 dark:text-slate-500">
                ({rules.length})
              </span>
            </label>
          </div>

          {rules.map((rule, i) => (
            <PanelRuleCard
              key={rule.id}
              rule={rule}
              index={i}
              logic={logic}
              total={rules.length}
              onChange={(changes) => updateRule(rule.id, changes)}
              onRemove={() => removeRule(rule.id)}
              flowVariables={flowVariables}
            />
          ))}

          <button
            onClick={addRule}
            className="w-full flex items-center gap-2 justify-center py-2 rounded-lg border border-dashed border-blue-300/60 dark:border-blue-700/40 text-xs font-semibold text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          >
            <Plus size={13} /> Add Condition
          </button>
        </div>
      )}

      {/* Output summary */}
      <div className="rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-800/20 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          <span>TRUE output</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 dark:text-rose-400">
          <XCircle size={13} />
          <span>FALSE output</span>
        </div>
      </div>
    </div>
  );
}

// ─── Node config (used by NODE_LIBRARY in nodeConfig.js) ─────────────────────

export const ConditionNodeConfig = {
  label: "Condition",
  icon: Split,
  accent: "#3b82f6",
  defaults: {
    rules: [
      {
        id: "rule_init",
        field: "user.message",
        operator: "contains",
        value: "",
      },
    ],
    logic: "AND",
    advancedMode: false,
    expression: "",
  },
};
