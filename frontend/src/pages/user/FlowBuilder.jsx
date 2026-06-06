import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ArrowLeft,
  Bot,
  Braces,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Eye,
  GitBranch,
  Layers,
  Link,
  MessageSquare,
  Moon,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Split,
  StopCircle,
  Sun,
  Trash2,
  Type,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { authFetch } from "../../services/api";

const NODE_LIBRARY = [
  {
    type: "trigger",
    label: "Trigger",
    icon: PlayCircle,
    accent: "#ef4444",
    defaults: {
      triggerType: "message_received",
      triggerName: "Incoming Trigger",
    },
  },
  {
    type: "message",
    label: "Send Message",
    icon: MessageSquare,
    accent: "#f59e0b",
    defaults: {
      message: "Hello there!",
      messageType: "normal",
      buttons: [{ text: "Yes", id: "yes_1" }],
      showBubble: false,
      bubbleStatus: "idle",
      bubbleMessage: "",
      bubbleTimestamp: "",
    },
  },
  {
    type: "condition",
    label: "Condition",
    icon: Split,
    accent: "#3b82f6",
    defaults: {
      conditionMode: "simple",
      conditionLogic: "AND",
      conditionRules: [
        {
          field: "user.message",
          operator: "contains",
          value: "",
        },
      ],
      conditionExpression: "",
    },
  },
  {
    type: "input",
    label: "User Input",
    icon: Type,
    accent: "#22c55e",
    defaults: {
      prompt: "Please share your order ID",
      variableKey: "order_id",
    },
  },
  {
    type: "api",
    label: "API Call",
    icon: Braces,
    accent: "#a855f7",
    defaults: {
      url: "https://example.com/api",
      method: "GET",
      params: [{ key: "id", value: "123" }],
    },
  },
  {
    type: "delay",
    label: "Delay",
    icon: Clock3,
    accent: "#f97316",
    defaults: { durationValue: 1, durationUnit: "minutes" },
  },
  {
    type: "ai",
    label: "AI Reply",
    icon: Bot,
    accent: "#111827",
    defaults: {
      prompt: "Reply naturally and ask follow-up questions.",
      tone: "friendly",
    },
  },
];

const NODE_MAP = Object.fromEntries(
  NODE_LIBRARY.map((item) => [item.type, item]),
);

const edgeDefaults = {
  type: "smoothstep",
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
  style: { stroke: "#64748b", strokeWidth: 2 },
};

const CONDITION_FIELD_CATEGORIES = [
  {
    label: "User Data",
    fields: [
      { value: "user.message", label: "user.message", kind: "text" },
      { value: "user.reply", label: "user.reply", kind: "text" },
      { value: "user.phone", label: "user.phone", kind: "text" },
    ],
  },
  {
    label: "Variables",
    fields: [
      { value: "{{order_id}}", label: "{{order_id}}", kind: "text" },
      { value: "{{selected_item}}", label: "{{selected_item}}", kind: "text" },
      { value: "{{user_name}}", label: "{{user_name}}", kind: "text" },
    ],
  },
  {
    label: "API Data",
    fields: [
      { value: "api1.response", label: "api1.response", kind: "text" },
      {
        value: "api1.response.price",
        label: "api1.response.price",
        kind: "number",
      },
      {
        value: "api1.response.status",
        label: "api1.response.status",
        kind: "text",
      },
    ],
  },
  {
    label: "System",
    fields: [
      { value: "current_time", label: "current_time", kind: "text" },
      { value: "flow_status", label: "flow_status", kind: "text" },
    ],
  },
];

const TEXT_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
];

const NUMBER_OPERATORS = [
  { value: "less_than", label: "<" },
  { value: "greater_than", label: ">" },
  { value: "less_than_or_equal", label: "<=" },
  { value: "greater_than_or_equal", label: ">=" },
  { value: "equals", label: "=" },
  { value: "not_equals", label: "not equals" },
];

const GENERAL_OPERATORS = [
  { value: "exists", label: "exists" },
  { value: "not_exists", label: "not exists" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "in_list", label: "in list" },
  { value: "not_in_list", label: "not in list" },
  { value: "regex_match", label: "regex match" },
];

const DEFAULT_CONDITION_RULE = {
  field: "user.message",
  operator: "contains",
  value: "",
};

const ALL_CONDITION_FIELDS = CONDITION_FIELD_CATEGORIES.flatMap(
  (group) => group.fields,
);

function getConditionFieldMeta(field) {
  return (
    ALL_CONDITION_FIELDS.find((item) => item.value === field) || {
      value: field,
      label: field || "custom_field",
      kind: "text",
    }
  );
}

function getConditionFieldKind(field) {
  return getConditionFieldMeta(field).kind || "text";
}

function getConditionOperators(field) {
  const kind = getConditionFieldKind(field);
  return [
    ...(kind === "number" ? NUMBER_OPERATORS : TEXT_OPERATORS),
    ...GENERAL_OPERATORS,
  ];
}

function normalizeConditionRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return [{ ...DEFAULT_CONDITION_RULE }];
  }

  return rules.map((rule) => ({
    field: rule?.field || DEFAULT_CONDITION_RULE.field,
    operator: rule?.operator || DEFAULT_CONDITION_RULE.operator,
    value: rule?.value ?? "",
  }));
}

function summarizeConditionNode(data) {
  if (data.conditionMode === "advanced") {
    return data.conditionExpression || "Advanced expression";
  }

  const rules = normalizeConditionRules(data.conditionRules);
  if (rules.length === 0) {
    return "No rules configured";
  }

  const firstRule = rules[0];
  const firstField = getConditionFieldMeta(firstRule.field).label;
  const firstOperator = getConditionOperators(firstRule.field).find(
    (operator) => operator.value === firstRule.operator,
  )?.label;
  const firstValue = firstRule.value || "...";
  const extraRules = rules.length > 1 ? ` +${rules.length - 1}` : "";

  return `IF ${firstField} ${firstOperator || firstRule.operator} ${firstValue}${extraRules}`;
}

const BUBBLE_STATUS_META = {
  running: {
    label: "Running",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  },
  sent: {
    label: "Sent",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
  delivered: {
    label: "Delivered",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  },
};

const EXECUTION_STATUS_META = {
  started: {
    label: "Start",
    icon: PlayCircle,
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  },
  running: {
    label: "Playing",
    icon: Sparkles,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
};

const FlowEditorContext = createContext({ isReadOnly: false, patchNodeData: () => {} });

function getLabelFromType(type) {
  return NODE_MAP[type]?.label || type;
}

function createNode(type, position) {
  const blueprint = NODE_MAP[type];
  const id = `${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    id,
    type,
    position,
    data: {
      label: blueprint.label,
      accent: blueprint.accent,
      ...blueprint.defaults,
    },
  };
}

function makeStarterCanvas() {
  const trigger = createNode("trigger", { x: 80, y: 90 });
  const message = createNode("message", { x: 420, y: 90 });

  return {
    nodes: [trigger, message],
    edges: [
      {
        id: `e_${trigger.id}_${message.id}`,
        source: trigger.id,
        target: message.id,
        ...edgeDefaults,
      },
    ],
  };
}

function cloneCanvas({ nodes, edges }) {
  return {
    nodes: (nodes || []).map((node) => ({
      ...node,
      data: { ...node.data },
      position: { ...node.position },
    })),
    edges: (edges || []).map((edge) => ({
      ...edge,
      markerEnd: edge.markerEnd ? { ...edge.markerEnd } : undefined,
      style: edge.style ? { ...edge.style } : undefined,
      labelStyle: edge.labelStyle ? { ...edge.labelStyle } : undefined,
      labelBgStyle: edge.labelBgStyle ? { ...edge.labelBgStyle } : undefined,
    })),
  };
}

function normalizeFlow(flow) {
  return {
    id: flow._id,
    name: flow.name || "Untitled Flow",
    sessionName: flow.sessionId?.name || flow.sessionId?.phoneNumber || "Unassigned Session",
    sessionDbId: flow.sessionId?._id || flow.sessionId,
    sessionPhone: flow.sessionId?.phoneNumber || "",
    description: flow.description || "",
    status: flow.status || "Draft",
    updatedAt: flow.updatedAt,
    nodes: Array.isArray(flow.nodes) ? flow.nodes : [],
    edges: Array.isArray(flow.edges) ? flow.edges : [],
  };
}

// ── Flow card (list view) ────────────────────────────────────────────────────
function FlowCard({ flow, sessions, onNavigate, onStopStart, onDelete, onChangeSession }) {
  const [showPicker, setShowPicker] = useState(false);
  const [changingSession, setChangingSession] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const pickerRef = useRef(null);

  const isActive = flow.status === "Active";
  const availableSessions = (sessions || []).filter(
    (s) => String(s._id) !== String(flow.sessionDbId),
  );

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target))
        setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleSessionSelect = async (sessionDbId) => {
    setShowPicker(false);
    setChangingSession(true);
    await onChangeSession(flow.id, sessionDbId);
    setChangingSession(false);
  };

  const handleStopStart = async () => {
    setTogglingStatus(true);
    await onStopStart(flow.id, flow.status);
    setTogglingStatus(false);
  };

  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
            {flow.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {flow.description || "No description"}
          </p>
        </div>
        <span
          className={`flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full ${
            isActive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"
          }`}
        >
          {flow.status}
        </span>
      </div>

      <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-1">
        {/* Session row with change picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="inline-flex items-center gap-1.5 hover:text-violet-500 dark:hover:text-violet-400 transition-colors group"
            title="Change linked session"
          >
            <Layers size={12} />
            <span>Session: {flow.sessionName}</span>
            {changingSession ? (
              <RefreshCw size={9} className="animate-spin" />
            ) : (
              <ChevronDown size={9} className="opacity-60 group-hover:opacity-100" />
            )}
          </button>

          {showPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[210px] rounded-xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
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
                    key={s._id}
                    onClick={() => handleSessionSelect(s._id)}
                    className="w-full text-left px-3 py-2.5 text-[11px] hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="font-medium text-slate-700 dark:text-white/70 truncate">
                      {s.phoneNumber || s.name || String(s._id)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <p className="inline-flex items-center gap-1.5">
          <GitBranch size={12} /> Nodes: {flow.nodes.length} | Edges: {flow.edges.length}
        </p>
        <p className="text-[11px] text-slate-500">
          Updated: {new Date(flow.updatedAt).toLocaleString()}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <button
          onClick={() => onNavigate(`/create-flow?flowId=${flow.id}&mode=view`)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-2 text-xs font-semibold"
        >
          <Eye size={12} /> View
        </button>
        <button
          onClick={() => onNavigate(`/create-flow?flowId=${flow.id}&mode=edit`)}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 dark:bg-primary-600 text-white px-2 py-2 text-xs font-semibold"
        >
          <Pencil size={12} /> Edit
        </button>
        <button
          onClick={handleStopStart}
          disabled={togglingStatus}
          className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
            isActive
              ? "border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
              : "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          }`}
        >
          {togglingStatus ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : isActive ? (
            <StopCircle size={12} />
          ) : (
            <PlayCircle size={12} />
          )}
          {isActive ? "Stop" : "Start"}
        </button>
        <button
          onClick={() => onDelete(flow.id)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2 py-2 text-xs transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </article>
  );
}

function nodeSummary(type, data) {
  if (type === "trigger") return data.triggerName || "Untitled trigger";
  if (type === "message") return data.message?.slice(0, 44) || "No message";
  if (type === "condition") return summarizeConditionNode(data);
  if (type === "input") return data.variableKey || "variable_key";
  if (type === "api") return data.url || "https://...";
  if (type === "delay") {
    return `${data.durationValue || 1} ${data.durationUnit || "minutes"}`;
  }
  if (type === "ai") return `${data.tone || "friendly"} tone`;
  return "";
}

function getExecutionSequence(nodes, edges) {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  const startNode = nodes.find((node) => node.type === "trigger") || nodes[0];
  const sequence = [];
  const seen = new Set();
  let currentNode = startNode;

  while (currentNode && !seen.has(currentNode.id)) {
    sequence.push(currentNode);
    seen.add(currentNode.id);

    const nextEdge = (edges || []).find(
      (edge) => edge.source === currentNode.id,
    );
    currentNode = nextEdge
      ? nodes.find((node) => node.id === nextEdge.target)
      : null;
  }

  return sequence;
}

function ConditionFieldPicker({ value, onChange, isReadOnly }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const allFields = CONDITION_FIELD_CATEGORIES.flatMap((group) =>
      group.fields.map((field) => ({ ...field, groupLabel: group.label })),
    );

    if (!normalizedQuery) {
      return allFields;
    }

    return allFields.filter(
      (field) =>
        field.label.toLowerCase().includes(normalizedQuery) ||
        field.value.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <div className="relative">
      <input
        className="input"
        readOnly={isReadOnly}
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);
          onChange(nextValue);
          setOpen(true);
        }}
        placeholder="Search or type a field"
      />

      {open && !isReadOnly && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              No matches. Use a custom field path.
            </div>
          ) : (
            suggestions.map((field) => (
              <button
                key={field.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(field.value);
                  onChange(field.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="truncate">{field.label}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  {field.groupLabel}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ConditionRuleItem({ rule, index, onChange, onRemove, isReadOnly }) {
  const fieldKind = getConditionFieldKind(rule.field);
  const operatorOptions = getConditionOperators(rule.field);
  const valueDisabled = [
    "exists",
    "not_exists",
    "is_empty",
    "is_not_empty",
  ].includes(rule.operator);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Rule {index + 1}
        </span>
        <button
          type="button"
          disabled={isReadOnly}
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-slate-900 dark:text-rose-300"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.2fr_0.9fr_1fr]">
        <ConditionFieldPicker
          value={rule.field}
          onChange={(nextField) => {
            const nextOperator =
              getConditionOperators(nextField)[0]?.value || "equals";
            onChange({
              field: nextField,
              operator: nextOperator,
            });
          }}
          isReadOnly={isReadOnly}
        />

        <select
          className="input"
          disabled={isReadOnly}
          value={rule.operator}
          onChange={(event) => onChange({ operator: event.target.value })}
        >
          {operatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          className="input"
          disabled={isReadOnly || valueDisabled}
          type={fieldKind === "number" ? "number" : "text"}
          inputMode={fieldKind === "number" ? "decimal" : "text"}
          value={rule.value || ""}
          onChange={(event) => onChange({ value: event.target.value })}
          placeholder={valueDisabled ? "No value needed" : "Enter value"}
        />
      </div>
    </div>
  );
}

function ConditionNodeEditor({ data, onUpdate, isReadOnly }) {
  const mode = data.conditionMode || "simple";
  const logic = data.conditionLogic || "AND";
  const rules = normalizeConditionRules(data.conditionRules);

  const updateRule = (index, patch) => {
    const nextRules = rules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, ...patch } : rule,
    );
    onUpdate({ conditionRules: nextRules });
  };

  const addRule = () => {
    onUpdate({ conditionRules: [...rules, { ...DEFAULT_CONDITION_RULE }] });
  };

  const removeRule = (index) => {
    onUpdate({
      conditionRules: rules.filter((_, ruleIndex) => ruleIndex !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            IF
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Build flexible rules from any data source.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-[11px] shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {[
            { value: "simple", label: "Simple Mode" },
            { value: "advanced", label: "Advanced Mode" },
          ].map((option) => {
            const isActive = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={isReadOnly}
                onClick={() => onUpdate({ conditionMode: option.value })}
                className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                } ${isReadOnly ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "simple" ? (
        <>
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <ConditionRuleItem
                key={`${rule.field}_${index}`}
                rule={rule}
                index={index}
                isReadOnly={isReadOnly}
                onChange={(patch) => updateRule(index, patch)}
                onRemove={() => removeRule(index)}
              />
            ))}

            {!isReadOnly && (
              <button
                type="button"
                onClick={addRule}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary-400 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:bg-primary-900/20"
              >
                <Plus size={13} /> Add Condition
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Logic
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-[11px] dark:border-slate-700 dark:bg-slate-950">
              {[
                { value: "AND", label: "AND" },
                { value: "OR", label: "OR" },
              ].map((option) => {
                const isActive = logic === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => onUpdate({ conditionLogic: option.value })}
                    className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                      isActive
                        ? "bg-primary-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    } ${isReadOnly ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Expression
          </label>
          <textarea
            rows={4}
            className="input font-mono text-xs"
            readOnly={isReadOnly}
            value={data.conditionExpression || ""}
            onChange={(event) =>
              onUpdate({ conditionExpression: event.target.value })
            }
            placeholder='{{user.message.includes("order") && price > 1000}}'
          />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Preview
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            Runtime only
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {mode === "simple"
            ? `${rules.length} rule${rules.length === 1 ? "" : "s"} • ${logic}`
            : data.conditionExpression ||
              "Add an advanced expression to evaluate at runtime."}
        </p>
      </div>

      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={12} className="text-emerald-500" /> TRUE OUTPUT
        </span>
        <span className="inline-flex items-center gap-1">
          <Code2 size={12} className="text-rose-500" /> FALSE OUTPUT
        </span>
      </div>
    </div>
  );
}

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
  const executionStatus = EXECUTION_STATUS_META[data.executionState] || null;
  const executionOrder = data.executionOrder || null;
  const isExecutionActive =
    data.executionState === "started" || data.executionState === "running";
  const isExecutionDone = data.executionState === "done";
  const { isReadOnly, patchNodeData } = useContext(FlowEditorContext);

  const updateNode = useCallback(
    (patch) => patchNodeData(id, patch),
    [id, patchNodeData],
  );

  return (
    <div
      className={`group relative overflow-visible rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_14px_30px_rgba(2,6,23,0.1)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.45)] transition-all duration-300 ${
        type === "condition"
          ? "min-w-[360px] max-w-[440px]"
          : "min-w-[240px] max-w-[270px]"
      } ${
        selected
          ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
          : "hover:shadow-[0_18px_38px_rgba(2,6,23,0.16)]"
      } ${
        isExecutionActive
          ? "ring-2 ring-amber-300/40 shadow-[0_18px_40px_rgba(245,158,11,0.18)]"
          : ""
      } ${
        isExecutionDone
          ? "border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/25 shadow-[0_18px_40px_rgba(16,185,129,0.14)]"
          : ""
      } ${data.executionState === "started" ? "animate-pulse" : ""}`}
      style={{
        borderColor: isExecutionDone
          ? "rgba(16, 185, 129, 0.45)"
          : isExecutionActive
            ? "rgba(245, 158, 11, 0.55)"
            : `${data.accent}66`,
        ringColor: data.accent,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white dark:!border-slate-900"
      />

      {type === "condition" ? (
        <div className="p-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center text-white transition-transform duration-300 ${
                isExecutionActive ? "scale-110" : ""
              }`}
              style={{
                background: isExecutionDone
                  ? "linear-gradient(135deg, #10b981, #34d399)"
                  : isExecutionActive
                    ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                    : data.accent,
              }}
            >
              <Icon size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {getLabelFromType(type)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                #{id.slice(-6)}
              </p>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1">
              {executionOrder && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Step {executionOrder}
                </span>
              )}
              {executionStatus && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${executionStatus.className}`}
                >
                  <executionStatus.icon size={11} /> {executionStatus.label}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Rule Engine
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {summary ||
                "Build flexible rules using any field, variable, or API response."}
            </p>
          </div>

          <div className="mt-3">
            <ConditionNodeEditor
              data={data}
              onUpdate={updateNode}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      ) : (
        <div className="p-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center text-white transition-transform duration-300 ${
                isExecutionActive ? "scale-110" : ""
              }`}
              style={{
                background: isExecutionDone
                  ? "linear-gradient(135deg, #10b981, #34d399)"
                  : isExecutionActive
                    ? "linear-gradient(135deg, #f59e0b, #fb7185)"
                    : data.accent,
              }}
            >
              <Icon size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {getLabelFromType(type)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                #{id.slice(-6)}
              </p>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1">
              {executionOrder && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Step {executionOrder}
                </span>
              )}
              {executionStatus && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${executionStatus.className}`}
                >
                  <executionStatus.icon size={11} /> {executionStatus.label}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-2.5 py-2">
            {summary || "Configure from right panel"}
          </div>

          {showBubble && (
            <div className="mt-3 flex justify-end">
              <div
                className={`w-full max-w-[78%] rounded-2xl rounded-br-md border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-100 via-lime-50 to-emerald-50 dark:from-emerald-900/35 dark:via-emerald-900/25 dark:to-slate-800/75 px-3 py-2 shadow-sm transition-all duration-300 ease-out ${
                  data.bubbleStatus === "running"
                    ? "opacity-85 translate-y-1 scale-[0.99]"
                    : data.bubbleStatus === "sent"
                      ? "opacity-100 translate-y-0"
                      : "opacity-90 translate-y-0"
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
      )}

      {type === "condition" ? (
        <>
          <Handle
            type="source"
            id="true"
            position={Position.Right}
            style={{ top: "32%" }}
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-slate-900"
          />
          <Handle
            type="source"
            id="false"
            position={Position.Right}
            style={{ top: "70%" }}
            className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white dark:!border-slate-900"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-slate-600 !border-2 !border-white dark:!border-slate-900"
        />
      )}
    </div>
  );
}

const nodeTypes = {
  trigger: FlowNode,
  message: FlowNode,
  condition: FlowNode,
  input: FlowNode,
  api: FlowNode,
  delay: FlowNode,
  ai: FlowNode,
  router: FlowNode,
};

export default function FlowBuilder() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeFlowId, setActiveFlowId] = useState(null);
  const [editorMode, setEditorMode] = useState("edit");
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);
  const [flowError, setFlowError] = useState("");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [flowInstance, setFlowInstance] = useState(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const canvasRef = useRef(null);
  const demoRunTokenRef = useRef(0);

  const activeFlow = useMemo(
    () => flows.find((flow) => flow.id === activeFlowId) || null,
    [flows, activeFlowId],
  );
  const isEditor = !!activeFlow;
  const isReadOnly = editorMode === "view";

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        setIsLoadingFlows(true);
        setFlowError("");
        const response = await authFetch("/flows");
        if (!response.ok) {
          throw new Error("Failed to load flows");
        }
        const data = await response.json();
        const items = Array.isArray(data?.flows)
          ? data.flows.map(normalizeFlow)
          : [];
        setFlows(items);
      } catch (error) {
        setFlows([]);
        setFlowError(error.message || "Unable to load flows");
      } finally {
        setIsLoadingFlows(false);
      }
    };

    fetchFlows();

    authFetch("/flows/sessions/list")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (!activeFlowId) return;
    setFlows((prev) =>
      prev.map((flow) =>
        flow.id === activeFlowId
          ? {
              ...flow,
              nodes: cloneCanvas({ nodes, edges }).nodes,
              edges: cloneCanvas({ nodes, edges }).edges,
              updatedAt: new Date().toISOString(),
            }
          : flow,
      ),
    );
  }, [activeFlowId, nodes, edges]);

  const openFlowEditor = (flow, mode) => {
    const cloned = cloneCanvas({ nodes: flow.nodes, edges: flow.edges });
    setNodes(cloned.nodes);
    setEdges(cloned.edges);
    setSelectedNodeId(cloned.nodes[0]?.id || null);
    setEditorMode(mode);
    setActiveFlowId(flow.id);
  };

  const closeFlowEditor = () => {
    setActiveFlowId(null);
    setSelectedNodeId(null);
    setNodes([]);
    setEdges([]);
  };

  const handleDeleteFlow = async (flowId) => {
    if (!window.confirm("Delete this flow permanently? This cannot be undone.")) return;
    try {
      const res = await authFetch(`/flows/${flowId}`, { method: "DELETE" });
      if (res.ok) {
        setFlows((prev) => prev.filter((f) => f.id !== flowId));
      } else {
        alert("Failed to delete flow");
      }
    } catch {
      alert("Failed to delete flow");
    }
  };

  const handleStopStartFlow = async (flowId, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Draft" : "Active";
    try {
      const res = await authFetch(`/flows/${flowId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = normalizeFlow(data.flow);
        setFlows((prev) => prev.map((f) => (f.id === flowId ? updated : f)));
      } else {
        alert("Failed to update flow status");
      }
    } catch {
      alert("Failed to update flow status");
    }
  };

  const handleChangeFlowSession = async (flowId, newSessionDbId) => {
    try {
      const res = await authFetch(`/flows/${flowId}`, {
        method: "PUT",
        body: JSON.stringify({ sessionId: newSessionDbId }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = normalizeFlow(data.flow);
        setFlows((prev) => prev.map((f) => (f.id === flowId ? updated : f)));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.message || "Failed to change session");
      }
    } catch {
      alert("Failed to change session");
    }
  };

  const onConnect = useCallback(
    (params) => {
      if (isReadOnly) return;
      const label = params.sourceHandle
        ? params.sourceHandle.toUpperCase()
        : undefined;
      setEdges((existingEdges) =>
        addEdge(
          {
            ...params,
            ...edgeDefaults,
            label,
            labelStyle: { fill: "#0f172a", fontWeight: 700, fontSize: 11 },
            labelBgStyle: { fill: "#ffffffdd" },
          },
          existingEdges,
        ),
      );
    },
    [isReadOnly, setEdges],
  );

  const handleNodesChange = useCallback(
    (changes) => {
      if (isReadOnly) return;
      onNodesChange(changes);
    },
    [isReadOnly, onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      if (isReadOnly) return;
      onEdgesChange(changes);
    },
    [isReadOnly, onEdgesChange],
  );

  const addNode = useCallback(
    (type, position) => {
      if (isReadOnly) return;
      const node = createNode(type, position);
      setNodes((prev) => [...prev, node]);
      setSelectedNodeId(node.id);
    },
    [isReadOnly, setNodes],
  );

  const handleSidebarAdd = (type) => {
    const offset = nodes.length * 26;
    addNode(type, { x: 220 + offset, y: 130 + offset * 0.2 });
  };

  const onDragStart = (event, type) => {
    if (isReadOnly) return;
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback(
    (event) => {
      if (isReadOnly) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [isReadOnly],
  );

  const onDrop = useCallback(
    (event) => {
      if (isReadOnly) return;
      event.preventDefault();
      if (!flowInstance || !canvasRef.current) return;
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const bounds = canvasRef.current.getBoundingClientRect();
      const position = flowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      addNode(type, position);
    },
    [addNode, flowInstance, isReadOnly],
  );

  const updateSelectedNodeData = (patch) => {
    if (!selectedNodeId || isReadOnly) return;
    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId || isReadOnly) return;
    setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
  };

  const patchNodeData = useCallback(
    (nodeId, patch) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...patch } }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const resetExecutionState = useCallback(() => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        data: {
          ...node.data,
          executionState: "idle",
          executionOrder: null,
          showBubble: false,
          bubbleStatus: "idle",
          bubbleMessage: "",
          bubbleTimestamp: "",
        },
      })),
    );
  }, [setNodes]);

  const runDemoOnce = useCallback(async () => {
    if (isReadOnly || isDemoRunning) return;

    const sequence = getExecutionSequence(nodes, edges);
    if (sequence.length === 0) return;

    const runToken = demoRunTokenRef.current + 1;
    demoRunTokenRef.current = runToken;
    setIsDemoRunning(true);

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const nowLabel = () =>
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    try {
      resetExecutionState();

      await wait(120);

      for (let index = 0; index < sequence.length; index += 1) {
        const node = sequence[index];
        if (demoRunTokenRef.current !== runToken) return;

        const isMessageNode = node.type === "message";
        const demoMessage = node.data.message || "Thanks for your message!";

        patchNodeData(node.id, {
          executionState: "started",
          executionOrder: index + 1,
          showBubble: isMessageNode,
          bubbleStatus: isMessageNode ? "running" : "idle",
          bubbleMessage: isMessageNode ? demoMessage : "",
          bubbleTimestamp: isMessageNode ? "Starting..." : "",
        });

        await wait(400);

        if (demoRunTokenRef.current !== runToken) return;

        patchNodeData(node.id, {
          executionState: "running",
        });

        await wait(isMessageNode ? 550 : 260);

        if (demoRunTokenRef.current !== runToken) return;

        patchNodeData(node.id, {
          executionState: "done",
          executionOrder: index + 1,
          showBubble: isMessageNode,
          bubbleStatus: isMessageNode ? "sent" : "idle",
          bubbleMessage: isMessageNode ? demoMessage : "",
          bubbleTimestamp: isMessageNode ? nowLabel() : "",
        });

        await wait(180);
      }
    } finally {
      if (demoRunTokenRef.current === runToken) {
        setIsDemoRunning(false);
      }
    }
  }, [isDemoRunning, isReadOnly, nodes, patchNodeData]);

  const renderEditorPanel = () => {
    if (!selectedNode) {
      return (
        <div className="h-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 px-4 text-center">
          Click a node to view properties.
        </div>
      );
    }

    const { type, data } = selectedNode;

    return (
      <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
              Node Config
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {getLabelFromType(type)}
            </h3>
          </div>
          {!isReadOnly && (
            <button
              onClick={deleteSelectedNode}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/35"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {type === "trigger" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Trigger Type
              </label>
              <select
                className="input"
                disabled={isReadOnly}
                value={data.triggerType}
                onChange={(event) =>
                  updateSelectedNodeData({ triggerType: event.target.value })
                }
              >
                <option value="message_received">Message Received</option>
                <option value="keyword_match">Keyword Match</option>
                <option value="webhook">Webhook</option>
              </select>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Trigger Name
              </label>
              <input
                className="input"
                readOnly={isReadOnly}
                value={data.triggerName || ""}
                onChange={(event) =>
                  updateSelectedNodeData({ triggerName: event.target.value })
                }
                placeholder="Enter trigger name"
              />
            </>
          )}

          {type === "message" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Message
              </label>
              <textarea
                rows={4}
                className="input"
                readOnly={isReadOnly}
                value={data.message || ""}
                onChange={(event) =>
                  updateSelectedNodeData({ message: event.target.value })
                }
                placeholder="Type message text"
              />

              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Message Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Normal Text", value: "normal" },
                  { label: "Button Message", value: "button" },
                ].map((item) => (
                  <button
                    key={item.value}
                    disabled={isReadOnly}
                    onClick={() =>
                      updateSelectedNodeData({ messageType: item.value })
                    }
                    className={`px-2 py-2 rounded-lg border text-xs font-semibold ${
                      data.messageType === item.value
                        ? "bg-primary-50 dark:bg-primary-900/20 border-primary-400 text-primary-700 dark:text-primary-300"
                        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    } ${isReadOnly ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {data.messageType === "button" && (
                <div className="space-y-2">
                  {!isReadOnly && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Buttons
                      </p>
                      <button
                        onClick={() =>
                          updateSelectedNodeData({
                            buttons: [
                              ...(data.buttons || []),
                              { text: "New Button", id: `btn_${Date.now()}` },
                            ],
                          })
                        }
                        className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  )}

                  {(data.buttons || []).map((btn, index) => (
                    <div
                      key={`${btn.id}_${index}`}
                      className="grid grid-cols-2 gap-2"
                    >
                      <input
                        className="input"
                        readOnly={isReadOnly}
                        placeholder="Button text"
                        value={btn.text}
                        onChange={(event) => {
                          const next = [...(data.buttons || [])];
                          next[index] = {
                            ...next[index],
                            text: event.target.value,
                          };
                          updateSelectedNodeData({ buttons: next });
                        }}
                      />
                      <input
                        className="input"
                        readOnly={isReadOnly}
                        placeholder="Button ID"
                        value={btn.id}
                        onChange={(event) => {
                          const next = [...(data.buttons || [])];
                          next[index] = {
                            ...next[index],
                            id: event.target.value,
                          };
                          updateSelectedNodeData({ buttons: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {type === "condition" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Condition Type
              </label>
              <select
                className="input"
                disabled={isReadOnly}
                value={data.conditionType || "equals"}
                onChange={(event) =>
                  updateSelectedNodeData({ conditionType: event.target.value })
                }
              >
                <option value="equals">equals</option>
                <option value="contains">contains</option>
                <option value="not_equals">not equals</option>
              </select>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Value
              </label>
              <input
                className="input"
                readOnly={isReadOnly}
                value={data.value || ""}
                onChange={(event) =>
                  updateSelectedNodeData({ value: event.target.value })
                }
                placeholder="Enter comparison value"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This node has two outputs: TRUE and FALSE.
              </p>
            </>
          )}

          {type === "input" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Prompt Message
              </label>
              <textarea
                rows={3}
                className="input"
                readOnly={isReadOnly}
                value={data.prompt || ""}
                onChange={(event) =>
                  updateSelectedNodeData({ prompt: event.target.value })
                }
              />
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Save Variable Key
              </label>
              <input
                className="input"
                readOnly={isReadOnly}
                value={data.variableKey || ""}
                onChange={(event) =>
                  updateSelectedNodeData({ variableKey: event.target.value })
                }
                placeholder="order_id"
              />
            </>
          )}

          {type === "api" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                URL
              </label>
              <input
                className="input"
                readOnly={isReadOnly}
                value={data.url || ""}
                onChange={(event) =>
                  updateSelectedNodeData({ url: event.target.value })
                }
              />
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Method
              </label>
              <select
                className="input"
                disabled={isReadOnly}
                value={data.method || "GET"}
                onChange={(event) =>
                  updateSelectedNodeData({ method: event.target.value })
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>

              <div className="space-y-2">
                {!isReadOnly && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Params
                    </p>
                    <button
                      onClick={() =>
                        updateSelectedNodeData({
                          params: [
                            ...(data.params || []),
                            { key: "", value: "" },
                          ],
                        })
                      }
                      className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                )}

                {(data.params || []).map((param, index) => (
                  <div
                    key={`param_${index}`}
                    className="grid grid-cols-2 gap-2"
                  >
                    <input
                      className="input"
                      readOnly={isReadOnly}
                      placeholder="key"
                      value={param.key}
                      onChange={(event) => {
                        const next = [...(data.params || [])];
                        next[index] = {
                          ...next[index],
                          key: event.target.value,
                        };
                        updateSelectedNodeData({ params: next });
                      }}
                    />
                    <input
                      className="input"
                      readOnly={isReadOnly}
                      placeholder="value"
                      value={param.value}
                      onChange={(event) => {
                        const next = [...(data.params || [])];
                        next[index] = {
                          ...next[index],
                          value: event.target.value,
                        };
                        updateSelectedNodeData({ params: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {type === "delay" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Time Value
              </label>
              <input
                type="number"
                min={1}
                className="input"
                readOnly={isReadOnly}
                value={data.durationValue || 1}
                onChange={(event) =>
                  updateSelectedNodeData({
                    durationValue: Number(event.target.value || 1),
                  })
                }
              />
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Unit
              </label>
              <select
                className="input"
                disabled={isReadOnly}
                value={data.durationUnit || "minutes"}
                onChange={(event) =>
                  updateSelectedNodeData({ durationUnit: event.target.value })
                }
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </>
          )}

          {type === "ai" && (
            <>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Prompt
              </label>
              <textarea
                rows={4}
                className="input"
                readOnly={isReadOnly}
                value={data.prompt || ""}
                onChange={(event) =>
                  updateSelectedNodeData({ prompt: event.target.value })
                }
              />
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Tone
              </label>
              <select
                className="input"
                disabled={isReadOnly}
                value={data.tone || "friendly"}
                onChange={(event) =>
                  updateSelectedNodeData({ tone: event.target.value })
                }
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="sales">Sales</option>
              </select>
            </>
          )}
        </div>
      </div>
    );
  };

  if (!isEditor) {
    return (
      <section className="page">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              WA Flow Studio
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Create and manage automation flows before opening the canvas
              editor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {theme === "dark" ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            <button
              onClick={() => navigate("/create-flow")}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-primary-600"
            >
              <Plus size={16} /> New Flow
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-semibold">
                <Sparkles size={16} className="text-primary-500" />
                Flow Performance Snapshot
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                  <p className="text-[11px] text-slate-500">Total Flows</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {flows.length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                  <p className="text-[11px] text-slate-500">Active</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {flows.filter((flow) => flow.status === "Active").length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                  <p className="text-[11px] text-slate-500">Drafts</p>
                  <p className="text-lg font-bold text-amber-600">
                    {flows.filter((flow) => flow.status === "Draft").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-4 flex items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
              Your real saved flows are shown below. Click New Flow to create
              another one.
            </div>
          </div>

          {isLoadingFlows ? (
            <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-500 dark:text-slate-400">
              Loading flows...
            </div>
          ) : flowError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-6 text-sm text-rose-700 dark:text-rose-300">
              {flowError}
            </div>
          ) : flows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-500 dark:text-slate-400">
              No flows found. Create your first flow to get started.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {flows.map((flow) => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  sessions={sessions}
                  onNavigate={navigate}
                  onStopStart={handleStopStartFlow}
                  onDelete={handleDeleteFlow}
                  onChangeSession={handleChangeFlowSession}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm flex-shrink-0">
        <div>
          <button
            onClick={closeFlowEditor}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2"
          >
            <ArrowLeft size={14} /> Back To Flows
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {activeFlow.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Session: {activeFlow.sessionName} | Mode:{" "}
            {isReadOnly ? "View" : "Edit"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setEditorMode((mode) => (mode === "edit" ? "view" : "edit"))
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {isReadOnly ? <Pencil size={15} /> : <Eye size={15} />}
            {isReadOnly ? "Switch To Edit" : "Switch To View"}
          </button>

          <button
            onClick={runDemoOnce}
            disabled={isReadOnly || isDemoRunning}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayCircle size={15} />
            {isDemoRunning ? "Running Demo..." : "Run Once Demo"}
          </button>

          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {theme === "dark" ? (
              <Sun size={16} className="text-amber-400" />
            ) : (
              <Moon size={16} />
            )}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="grid grid-cols-12 w-full h-full">
          <aside className="col-span-12 xl:col-span-2 border-r border-slate-200 dark:border-slate-800 p-3 bg-white/70 dark:bg-slate-900/70 overflow-y-auto">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-2">
              Components
            </p>
            <div className="space-y-2">
              {NODE_LIBRARY.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable={!isReadOnly}
                    onDragStart={(event) => onDragStart(event, item.type)}
                    className={`group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 ${
                      isReadOnly
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-7 w-7 rounded-lg text-white flex items-center justify-center"
                          style={{ backgroundColor: item.accent }}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {item.label}
                        </span>
                      </div>
                      <button
                        disabled={isReadOnly}
                        onClick={() => handleSidebarAdd(item.type)}
                        className={`rounded-md p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          isReadOnly ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        title={`Add ${item.label}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="col-span-12 xl:col-span-7 border-r border-slate-200 dark:border-slate-800 h-full">
            <div
              ref={canvasRef}
              className="h-full"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <FlowEditorContext.Provider value={{ isReadOnly, patchNodeData }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onConnect={onConnect}
                  onInit={setFlowInstance}
                  onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                  onPaneClick={() => setSelectedNodeId(null)}
                  onSelectionChange={({ nodes: selected }) => {
                    if (selected?.length) setSelectedNodeId(selected[0].id);
                  }}
                  fitView
                  snapToGrid
                  snapGrid={[16, 16]}
                  deleteKeyCode={isReadOnly ? null : ["Delete", "Backspace"]}
                  attributionPosition="bottom-left"
                  nodesDraggable={!isReadOnly}
                  nodesConnectable={!isReadOnly}
                  elementsSelectable
                  className="bg-gradient-to-b from-slate-100/70 to-slate-50 dark:from-slate-900 dark:to-slate-950"
                >
                  <MiniMap
                    pannable
                    zoomable
                    className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-700"
                    nodeStrokeWidth={3}
                    nodeColor={(node) => node?.data?.accent || "#64748b"}
                  />
                  <Controls className="!bg-white dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-700 !rounded-xl" />
                  <Background
                    gap={16}
                    size={1.1}
                    color={theme === "dark" ? "#334155" : "#cbd5e1"}
                  />
                </ReactFlow>
              </FlowEditorContext.Provider>
            </div>
          </div>

          <aside className="col-span-12 xl:col-span-3 p-3 bg-white/70 dark:bg-slate-900/70 overflow-y-auto">
            {renderEditorPanel()}
          </aside>
        </div>
      </div>
    </div>
  );
}
