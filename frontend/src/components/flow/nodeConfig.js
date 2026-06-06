import { Bot, Clock3 } from "lucide-react";
import { MarkerType } from "reactflow";
import { TriggerNodeConfig } from "./TriggerNode";
import { SendMessageNodeConfig } from "./SendMessageNode";
import { ConditionNodeConfig } from "./ConditionNode";
import { RouterNodeConfig } from "./RouterNode";
import { UserInputNodeConfig } from "./UserInputNode";
import { ApiNodeConfig } from "./ApiNode";
import { GoogleSheetsNodeConfig } from "./GoogleSheetsNode";

export const NODE_LIBRARY = [
  { type: "trigger", ...TriggerNodeConfig },
  { type: "message", ...SendMessageNodeConfig },
  { type: "condition", ...ConditionNodeConfig },
  { type: "router", ...RouterNodeConfig },
  { type: "input", ...UserInputNodeConfig },
  { type: "api", ...ApiNodeConfig },
  { type: "googlesheets", ...GoogleSheetsNodeConfig },
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

export const NODE_MAP = Object.fromEntries(
  NODE_LIBRARY.map((item) => [item.type, item]),
);

export const BUBBLE_STATUS_META = {
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

export const edgeDefaults = {
  type: "smoothstep",
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
  style: { stroke: "#64748b", strokeWidth: 2 },
};

export function getLabelFromType(type) {
  return NODE_MAP[type]?.label || type;
}

export function nodeSummary(type, data) {
  if (type === "trigger") return data.triggerName || "Untitled trigger";
  if (type === "message") return data.message?.slice(0, 44) || "No message";
  if (type === "condition")
    return `${data.conditionType || "equals"} ${data.value || "..."}`;
  if (type === "router") {
    const field = data.field || "user_input";
    const caseCount = data.cases?.length || 0;
    return `switch on ${field} · ${caseCount} case${caseCount === 1 ? "" : "s"}`;
  }
  if (type === "input") return `{{${data.variableKey || "variable_key"}}}`;
  if (type === "api") {
    if (!data.url) return "No URL configured";
    const host = data.url.replace(/^https?:\/\//, "").split("/")[0];
    return `${data.method || "GET"} ${host}`;
  }
  if (type === "googlesheets") {
    if (!data.spreadsheetId) return "No spreadsheet configured";
    const action = (data.action || "read").toUpperCase();
    const name = data.spreadsheetName || data.spreadsheetId.slice(0, 20);
    return `${action} · ${name}`;
  }
  if (type === "delay")
    return `${data.durationValue || 1} ${data.durationUnit || "minutes"}`;
  if (type === "ai") return `${data.tone || "friendly"} tone`;
  return "";
}

export function createNode(type, position) {
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

export function makeStarterCanvas() {
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

export function cloneCanvas({ nodes, edges }) {
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
