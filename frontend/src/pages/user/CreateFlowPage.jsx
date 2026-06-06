import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authFetch } from "../../services/api.js";
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ArrowLeft,
  Moon,
  PlayCircle,
  Sun,
  Trash2,
  Save,
  Settings,
  X,
  ChevronLeft,
} from "lucide-react";
import { TriggerNodeEditor } from "../../components/flow/TriggerNode";
import { SendMessageNodeEditor } from "../../components/flow/SendMessageNode";
import { ConditionNodeEditor } from "../../components/flow/ConditionNode";
import { RouterNodeEditor } from "../../components/flow/RouterNode";
import { UserInputNodeEditor } from "../../components/flow/UserInputNode";
import { ApiNodeEditor } from "../../components/flow/ApiNode";
import {
  GoogleSheetsNodeEditor,
  getValidCachedToken,
} from "../../components/flow/GoogleSheetsNode";
import WorkflowBottomToolbar from "../../components/flow/WorkflowBottomToolbar";
import { useTheme } from "../../contexts/ThemeContext";
import {
  NODE_LIBRARY,
  NODE_MAP,
  edgeDefaults,
  getLabelFromType,
  createNode,
  makeStarterCanvas,
} from "../../components/flow/nodeConfig";
import { nodeTypes } from "../../components/flow/FlowNode";
import FlowActionsContext from "../../components/flow/FlowActionsContext";

export default function CreateFlowPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [flowInstance, setFlowInstance] = useState(null);
  const canvasRef = useRef(null);

  const [flowName, setFlowName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isFlowLoading, setIsFlowLoading] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(true);
  const [flowId, setFlowId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [executionState, setExecutionState] = useState({
    activeNodeId: null,
    activeEdgeId: null,
    visitedEdgeIds: [],
    nodeState: {},
  });
  const [inputModal, setInputModal] = useState(null);
  const inputResolverRef = useRef(null);
  const executionContextRef = useRef({});
  const demoRunTokenRef = useRef(0);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const getSessionKey = (session) => session?._id || session?.sessionId || "";
  const getSessionLabel = (session) => {
    if (!session) return "No session selected";

    const name = session.name || "Unnamed session";
    const number = session.phoneNumber || session.phone || "";
    return number ? `${name} · ${number}` : name;
  };

  const findSessionByKey = useCallback(
    (sessionList, key) =>
      sessionList.find(
        (session) =>
          getSessionKey(session) === key || session.sessionId === key,
      ) || null,
    [],
  );

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const response = await authFetch("/api/sessions");
        if (response.ok) {
          const data = await response.json();
          const sessionsList =
            data.data?.sessions || data.sessions || data.data || [];

          if (!Array.isArray(sessionsList)) {
            console.warn("Unexpected sessions response shape:", data);
            setSessions([]);
            return;
          }

          setSessions(sessionsList);
        } else {
          setSessions([]);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessions.length === 0) return;

    const requestedSessionId = searchParams.get("sessionId");
    if (requestedSessionId) {
      const requestedSession = findSessionByKey(sessions, requestedSessionId);
      if (requestedSession) {
        setSelectedSession(requestedSession);
        return;
      }
    }

    if (!selectedSession) {
      const connectedSession =
        sessions.find((session) => session.status === "connected") ||
        sessions[0] ||
        null;
      setSelectedSession(connectedSession);
    }
  }, [findSessionByKey, searchParams, selectedSession, sessions]);

  // Load existing flow when ?flowId= is in the URL
  useEffect(() => {
    const editFlowId = searchParams.get("flowId");
    const mode = searchParams.get("mode");
    if (!editFlowId) return;

    setIsReadOnly(mode === "view");
    setIsFlowLoading(true);

    authFetch(`/flows/${editFlowId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load flow");
        return res.json();
      })
      .then((data) => {
        const flow = data.flow || data;
        setFlowId(editFlowId);
        setFlowName(flow.name || "");
        setDescription(flow.description || "");
        setStatus(flow.status || "Active");

        const flowNodes = Array.isArray(flow.nodes) ? flow.nodes : [];
        const flowEdges = Array.isArray(flow.edges) ? flow.edges : [];
        setNodes(flowNodes);
        setEdges(flowEdges);
        if (flowNodes.length > 0) setSelectedNodeId(flowNodes[0].id);

        // Resolve session from the flow
        if (flow.sessionId) {
          if (typeof flow.sessionId === "object") {
            setSelectedSession(flow.sessionId);
          } else {
            setSelectedSession({
              _id: flow.sessionId,
              sessionId: flow.sessionId,
              name: "Session",
            });
          }
        }
        setShowSessionModal(false);
      })
      .catch((err) => {
        console.error("Failed to load flow:", err);
        alert("Could not load flow. Returning to flow list.");
        navigate("/dashboard/flow-builder");
      })
      .finally(() => setIsFlowLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize canvas — skip if loading an existing flow from URL
  useEffect(() => {
    if (searchParams.get("flowId")) return;
    const starter = makeStarterCanvas();
    setNodes(starter.nodes);
    setEdges(starter.edges);
    if (starter.nodes.length > 0) {
      setSelectedNodeId(starter.nodes[0].id);
    }
  }, [setNodes, setEdges, searchParams]);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find((node) => node.id === params.source);
      let label = params.sourceHandle
        ? params.sourceHandle.toUpperCase()
        : undefined;

      if (sourceNode?.type === "router") {
        if (params.sourceHandle === "default") {
          label = "DEFAULT";
        } else {
          const routerCase = sourceNode.data?.cases?.find(
            (item) => item.id === params.sourceHandle,
          );
          label = routerCase
            ? `${(routerCase.operator || "equals").toUpperCase()} ${routerCase.value || "..."}`
            : label;
        }
      }

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
    [nodes, setEdges],
  );

  const addNode = useCallback(
    (type, position) => {
      const node = createNode(type, position);
      setNodes((prev) => [...prev, node]);
      setSelectedNodeId(node.id);
    },
    [setNodes],
  );

  const handleSidebarAdd = (type) => {
    const offset = nodes.length * 26;
    addNode(type, { x: 220 + offset, y: 130 + offset * 0.2 });
  };

  const onDragStart = (event, type) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
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
    [addNode, flowInstance],
  );

  const updateSelectedNodeData = (patch) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
    );
  };

  const deleteNode = useCallback(
    (nodeId) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
    },
    [setNodes, setEdges],
  );

  const unlinkNode = useCallback(
    (nodeId) => {
      setEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
    },
    [setEdges],
  );

  const duplicateNode = useCallback(
    (nodeId) => {
      setNodes((prev) => {
        const source = prev.find((n) => n.id === nodeId);
        if (!source) return prev;
        const newId = `${source.type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        return [
          ...prev,
          {
            id: newId,
            type: source.type,
            position: { x: source.position.x + 40, y: source.position.y + 40 },
            data: {
              ...source.data,
              showBubble: false,
              bubbleStatus: "idle",
              bubbleMessage: "",
              bubbleTimestamp: "",
            },
          },
        ];
      });
    },
    [setNodes],
  );

  const openConfig = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setShowConfigPanel(true);
  }, []);

  const deleteSelectedNode = () => {
    if (selectedNodeId) deleteNode(selectedNodeId);
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

  const wait = useCallback(
    (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    [],
  );

  const nowLabel = useCallback(
    () =>
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const randomStepDelay = useCallback(
    () => 300 + Math.floor(Math.random() * 500),
    [],
  );

  const clearExecutionState = useCallback(() => {
    setExecutionState({
      activeNodeId: null,
      activeEdgeId: null,
      visitedEdgeIds: [],
      nodeState: {},
    });
    setInputModal(null);
    inputResolverRef.current = null;
    executionContextRef.current = {};
  }, []);

  const patchExecutionNode = useCallback((nodeId, patch) => {
    setExecutionState((prev) => ({
      ...prev,
      nodeState: {
        ...prev.nodeState,
        [nodeId]: {
          ...(prev.nodeState[nodeId] || {}),
          ...patch,
        },
      },
    }));
  }, []);

  const getContextValue = useCallback((context, key) => {
    if (!key) return undefined;
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      return context[key];
    }
    return undefined;
  }, []);

  const resolveTemplate = useCallback(
    (text, context) =>
      String(text ?? "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey) => {
        const value = getContextValue(context, rawKey.trim());
        return value == null ? "" : String(value);
      }),
    [getContextValue],
  );

  const resolveJsonLike = useCallback(
    (text, context) => {
      const resolved = resolveTemplate(text, context).trim();
      if (!resolved) return "";
      if (Object.prototype.hasOwnProperty.call(context, resolved)) {
        return context[resolved];
      }
      return resolved;
    },
    [resolveTemplate],
  );

  const coerceComparable = useCallback((value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === "number" || typeof value === "boolean") return value;
    const text = String(value).trim();
    if (text === "true") return true;
    if (text === "false") return false;
    if (text !== "" && !Number.isNaN(Number(text))) return Number(text);
    return text;
  }, []);

  const evaluateRule = useCallback(
    (rule, context) => {
      const leftValue = coerceComparable(resolveJsonLike(rule.field, context));
      const rightValue = coerceComparable(resolveJsonLike(rule.value, context));

      switch (rule.operator) {
        case "equals":
          return String(leftValue ?? "") === String(rightValue ?? "");
        case "not_equals":
          return String(leftValue ?? "") !== String(rightValue ?? "");
        case "contains":
          return String(leftValue ?? "").includes(String(rightValue ?? ""));
        case "not_contains":
          return !String(leftValue ?? "").includes(String(rightValue ?? ""));
        case "starts_with":
          return String(leftValue ?? "").startsWith(String(rightValue ?? ""));
        case "ends_with":
          return String(leftValue ?? "").endsWith(String(rightValue ?? ""));
        case "gt":
          return Number(leftValue) > Number(rightValue);
        case "lt":
          return Number(leftValue) < Number(rightValue);
        case "gte":
          return Number(leftValue) >= Number(rightValue);
        case "lte":
          return Number(leftValue) <= Number(rightValue);
        case "num_eq":
          return Number(leftValue) === Number(rightValue);
        case "exists":
          return (
            leftValue !== undefined &&
            leftValue !== null &&
            String(leftValue).trim() !== ""
          );
        case "not_exists":
          return (
            leftValue === undefined ||
            leftValue === null ||
            String(leftValue).trim() === ""
          );
        case "is_empty":
          return String(leftValue ?? "").trim() === "";
        case "is_not_empty":
          return String(leftValue ?? "").trim() !== "";
        case "in_list":
          return String(rightValue ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .includes(String(leftValue ?? ""));
        case "not_in_list":
          return !String(rightValue ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .includes(String(leftValue ?? ""));
        case "regex":
          try {
            return new RegExp(String(rightValue ?? "")).test(
              String(leftValue ?? ""),
            );
          } catch {
            return false;
          }
        default:
          return false;
      }
    },
    [coerceComparable, resolveJsonLike],
  );

  const evaluateCondition = useCallback(
    (conditionNode, context) => {
      const {
        advancedMode,
        expression,
        rules = [],
        logic = "AND",
      } = conditionNode.data || {};

      if (advancedMode && expression) {
        try {
          const resolvedExpression = String(expression).replace(
            /\{\{\s*([^}]+?)\s*\}\}/g,
            (_, rawKey) => {
              const value = getContextValue(context, rawKey.trim());
              return JSON.stringify(value ?? "");
            },
          );
          const result = Function(
            `"use strict"; return (${resolvedExpression});`,
          )();
          return Boolean(result);
        } catch (error) {
          console.error("Error evaluating advanced condition:", error);
          return false;
        }
      }

      const ruleResults = (rules.length ? rules : []).map((rule) =>
        evaluateRule(rule, context),
      );
      if (ruleResults.length === 0) return false;
      return logic === "OR"
        ? ruleResults.some(Boolean)
        : ruleResults.every(Boolean);
    },
    [evaluateRule, getContextValue],
  );

  const resolveMessageText = useCallback(
    (text, context) =>
      String(text ?? "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey) => {
        const value = getContextValue(context, rawKey.trim());
        return value == null ? "" : String(value);
      }),
    [getContextValue],
  );

  const getOutgoingEdge = useCallback(
    (nodeId, branch) => {
      const outgoing = edges.filter((edge) => edge.source === nodeId);
      if (branch) {
        const branchEdge = outgoing.find(
          (edge) => String(edge.sourceHandle || "") === String(branch),
        );
        if (branchEdge) return branchEdge;
      }
      return outgoing[0] || null;
    },
    [edges],
  );

  const buildRuntimeContext = useCallback(
    (incomingText, phoneNumber) => ({
      incoming_message: incomingText,
      user_message: incomingText,
      "user.message": incomingText,
      "user.reply": incomingText,
      "user.phone": phoneNumber,
      "user.name": "",
      "user.email": "",
    }),
    [],
  );

  const waitForUserInput = useCallback(
    (node, context) =>
      new Promise((resolve) => {
        const variableKey = node.data?.variableKey || "user_input";
        const promptText = resolveMessageText(
          node.data?.prompt || "Please type your response",
          context,
        );

        patchExecutionNode(node.id, {
          executionState: "waiting",
          executionTitle: "Waiting for input",
          executionMessage: promptText,
          executionDetail: `Save as {{${variableKey}}}`,
          executionBranch: null,
          executionValue: "",
        });

        setInputModal({
          nodeId: node.id,
          title: promptText,
          variableKey,
          value: "",
        });

        inputResolverRef.current = (value) => resolve(value);
      }),
    [patchExecutionNode, resolveMessageText],
  );

  const executeApiNode = useCallback(
    async (node, context) => {
      const {
        method = "GET",
        url = "",
        headers = [],
        params = [],
        body = "",
        responsePrefix = "api",
        useBackendProxy = true,
      } = node.data || {};

      patchExecutionNode(node.id, {
        executionState: "loading",
        executionTitle: "Calling API...",
        executionMessage: url,
        executionDetail: `${method} request`,
        executionPreview: "",
      });

      const resolvedUrl = resolveMessageText(url, context);
      const urlObject = new URL(resolvedUrl);
      (params || []).forEach(({ key, value }) => {
        if (key)
          urlObject.searchParams.set(
            resolveMessageText(key, context),
            resolveMessageText(value, context),
          );
      });

      const headerObject = {};
      (headers || []).forEach(({ key, value }) => {
        if (key)
          headerObject[resolveMessageText(key, context)] = resolveMessageText(
            value,
            context,
          );
      });

      const requestOptions = { method, headers: headerObject };
      if (["POST", "PUT", "PATCH"].includes(method) && body?.trim()) {
        const resolvedBody = resolveMessageText(body, context);
        requestOptions.body = resolvedBody;
      }

      let rawResult;
      let statusLabel = "200 OK";

      if (useBackendProxy !== false) {
        const proxyParams = {};
        (params || []).forEach(({ key, value }) => {
          if (!key) return;
          proxyParams[resolveMessageText(key, context)] = resolveMessageText(
            value,
            context,
          );
        });

        const proxyResponse = await authFetch("/flows/proxy-request", {
          method: "POST",
          body: JSON.stringify({
            method,
            url: resolvedUrl,
            headers: headerObject,
            params: proxyParams,
            body: requestOptions.body || "",
          }),
        });

        const proxyPayload = await proxyResponse.json();
        if (!proxyResponse.ok || !proxyPayload?.success) {
          throw new Error(
            proxyPayload?.message ||
              proxyPayload?.statusText ||
              "API request failed",
          );
        }

        rawResult = proxyPayload.data;
        statusLabel = `${proxyPayload.status || 200} ${proxyPayload.statusText || "OK"}`;
      } else {
        const response = await fetch(urlObject.toString(), requestOptions);
        const contentType = response.headers.get("content-type") || "";
        rawResult = contentType.includes("application/json")
          ? await response.json()
          : await response.text();

        if (!response.ok) {
          throw new Error(
            typeof rawResult === "string"
              ? rawResult
              : JSON.stringify(rawResult),
          );
        }

        statusLabel = `${response.status} ${response.statusText}`.trim();
      }

      const flatResult = {};
      const walk = (value, prefix = "") => {
        if (Array.isArray(value)) {
          value.forEach((item, index) => walk(item, `${prefix}[${index}]`));
          return;
        }
        if (value && typeof value === "object") {
          Object.entries(value).forEach(([key, nestedValue]) => {
            walk(nestedValue, prefix ? `${prefix}.${key}` : key);
          });
          return;
        }
        if (prefix) {
          flatResult[prefix] = value;
        }
      };

      walk(rawResult, responsePrefix);
      Object.entries(flatResult).forEach(([key, value]) => {
        context[key] = value;
      });

      patchExecutionNode(node.id, {
        executionState: "success",
        executionTitle: "Response received",
        executionMessage: statusLabel,
        executionDetail: Object.keys(flatResult).length
          ? `Stored ${Object.keys(flatResult).length} variables`
          : "No variables extracted",
        executionPreview:
          typeof rawResult === "string"
            ? rawResult
            : JSON.stringify(rawResult, null, 2),
      });

      await wait(randomStepDelay());
      return rawResult;
    },
    [patchExecutionNode, randomStepDelay, resolveMessageText, wait],
  );

  const executeGoogleSheetsSimNode = useCallback(
    async (node, context) => {
      const prefix = node.data?.outputPrefix || "sheets";
      const action = (node.data?.action || "read").toUpperCase();
      const sheetLabel =
        node.data?.spreadsheetName ||
        (node.data?.spreadsheetId
          ? node.data.spreadsheetId.slice(0, 20) + "…"
          : "Sheet");

      patchExecutionNode(node.id, {
        executionState: "loading",
        executionTitle: `${action} — connecting…`,
        executionMessage: sheetLabel,
        executionDetail: "Executing real Google Sheets operation…",
      });

      // Pass the browser-cached token so the backend can save it to DB
      // if the user is connected in the UI but the DB record is missing/expired
      const cachedTok = getValidCachedToken();
      const proxyResponse = await authFetch("/flows/simulate-googlesheets", {
        method: "POST",
        body: JSON.stringify({
          nodeData: node.data,
          inputContext: context,
          accessToken: cachedTok?.accessToken || null,
        }),
      });

      const payload = await proxyResponse.json();

      if (!proxyResponse.ok || !payload?.success) {
        const errMsg = payload?.message || "Sheets operation failed";
        context[`${prefix}.success`] = false;
        context[`${prefix}.error`] = errMsg;
        patchExecutionNode(node.id, {
          executionState: "error",
          executionTitle: `${action} failed`,
          executionMessage: errMsg,
          executionDetail: `{{${prefix}.success}} = false`,
        });
        await wait(randomStepDelay());
        return;
      }

      // Merge returned output context into the running context
      Object.entries(payload.outputContext || {}).forEach(([k, v]) => {
        context[k] = v;
      });

      const success = context[`${prefix}.success`];
      const affectedRows = context[`${prefix}.affectedRows`];
      const found = context[`${prefix}.found`];
      const count = context[`${prefix}.count`];
      const errMsg = context[`${prefix}.error`];

      if (success) {
        let detail = "";
        if (affectedRows !== undefined)
          detail = `${affectedRows} row(s) affected`;
        else if (found !== undefined)
          detail = found ? `Found ${count || 1} row(s)` : "No rows found";
        patchExecutionNode(node.id, {
          executionState: "success",
          executionTitle: `${action} complete`,
          executionMessage: detail || "Done",
          executionDetail: `{{${prefix}.success}} = true`,
        });
      } else {
        patchExecutionNode(node.id, {
          executionState: "error",
          executionTitle: `${action} failed`,
          executionMessage: errMsg || "Operation failed",
          executionDetail: `{{${prefix}.success}} = false`,
        });
      }

      await wait(randomStepDelay());
    },
    [patchExecutionNode, randomStepDelay, wait],
  );

  const executeSendMessage = useCallback(
    async (node, context) => {
      const messageText = resolveMessageText(node.data?.message || "", context);
      patchExecutionNode(node.id, {
        executionState: "success",
        executionTitle: "Sent",
        executionMessage: messageText,
        executionDetail: "Rendered as WhatsApp bubble",
        showBubble: true,
        bubbleStatus: "sent",
        bubbleMessage: messageText,
        bubbleTimestamp: nowLabel(),
      });
      await wait(randomStepDelay());
    },
    [nowLabel, patchExecutionNode, randomStepDelay, resolveMessageText, wait],
  );

  const executeConditionNode = useCallback(
    async (node, context) => {
      const result = evaluateCondition(node, context);
      patchExecutionNode(node.id, {
        executionState: result ? "true" : "false",
        executionTitle: result
          ? "Condition Result: TRUE"
          : "Condition Result: FALSE",
        executionMessage: result ? "✅ TRUE" : "❌ FALSE",
        executionDetail: result
          ? "Following the TRUE branch"
          : "Following the FALSE branch",
        executionBranch: result ? "true" : "false",
      });
      await wait(randomStepDelay());
      return result;
    },
    [evaluateCondition, patchExecutionNode, randomStepDelay, wait],
  );

  const evaluateRouterCase = useCallback(
    (routerCase, fieldValue, context) => {
      const operator = routerCase.operator || "equals";
      const expectedValue = resolveJsonLike(routerCase.value || "", context);
      const actualText = String(fieldValue ?? "").trim();
      const actualLower = actualText.toLowerCase();
      const expectedText = String(expectedValue ?? "").trim();
      const expectedLower = expectedText.toLowerCase();

      if (operator === "expression") {
        try {
          const expression = expectedText.replace(
            /\{\{\s*([^}]+?)\s*\}\}/g,
            (_, rawKey) => {
              const value = getContextValue(context, rawKey.trim());
              return JSON.stringify(value ?? "");
            },
          );
          return Boolean(Function(`"use strict"; return (${expression});`)());
        } catch (error) {
          console.error("Error evaluating router expression:", error);
          return false;
        }
      }

      if (operator === "contains") {
        return actualLower.includes(expectedLower);
      }

      if (operator === "starts_with") {
        return actualLower.startsWith(expectedLower);
      }

      if (operator === "ends_with") {
        return actualLower.endsWith(expectedLower);
      }

      const allowedValues = expectedText
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      if (allowedValues.length > 1) {
        return allowedValues.includes(actualLower);
      }

      return actualLower === expectedLower;
    },
    [getContextValue, resolveJsonLike],
  );

  const executeRouterNode = useCallback(
    async (node, context) => {
      const cases = node.data?.cases?.length ? node.data.cases : [];
      const fieldKey = node.data?.field || "user_input";
      const fieldValue = resolveJsonLike(fieldKey, context);

      const matchedCase = cases.find((routerCase) =>
        evaluateRouterCase(routerCase, fieldValue, context),
      );

      const branchHandle = matchedCase?.id || "default";
      const matchedLabel = matchedCase
        ? matchedCase.value || "matched"
        : "default";

      patchExecutionNode(node.id, {
        executionState: matchedCase ? "matched" : "default",
        executionTitle: matchedCase
          ? `Matched: \"${matchedLabel}\" ✅`
          : "No match → Default ⚠️",
        executionMessage: matchedCase
          ? `Routing via case ${cases.findIndex((item) => item.id === matchedCase.id) + 1}`
          : "Routing via default output",
        executionDetail: matchedCase
          ? `Output handle: ${branchHandle}`
          : "Output handle: default",
        executionBranch: branchHandle,
      });

      await wait(randomStepDelay());
      return branchHandle;
    },
    [
      getContextValue,
      patchExecutionNode,
      randomStepDelay,
      resolveJsonLike,
      wait,
    ],
  );

  const runDemoOnce = useCallback(async () => {
    if (isDemoRunning) return;

    const triggerNode = nodes.find((node) => node.type === "trigger");
    if (!triggerNode) return;

    const runToken = demoRunTokenRef.current + 1;
    demoRunTokenRef.current = runToken;
    setIsDemoRunning(true);
    clearExecutionState();

    const context = buildRuntimeContext(
      testMessage || "Hello",
      selectedSession?.phoneNumber || "1234567890",
    );
    executionContextRef.current = context;

    const touchNode = (nodeId, patch) => {
      patchExecutionNode(nodeId, patch);
    };

    const isCancelled = () => demoRunTokenRef.current !== runToken;

    try {
      touchNode(triggerNode.id, {
        executionState: "active",
        executionTitle: "Trigger armed",
        executionMessage: triggerNode.data?.triggerName || "Incoming Trigger",
        executionDetail: "Starting from the trigger node",
      });
      setExecutionState((prev) => ({
        ...prev,
        activeNodeId: triggerNode.id,
      }));

      await wait(randomStepDelay());
      if (isCancelled()) return;

      let currentNode = triggerNode;
      let currentEdge = getOutgoingEdge(currentNode.id);

      while (currentEdge) {
        if (isCancelled()) return;

        setExecutionState((prev) => ({
          ...prev,
          activeEdgeId: currentEdge.id,
          visitedEdgeIds: prev.visitedEdgeIds.includes(currentEdge.id)
            ? prev.visitedEdgeIds
            : [...prev.visitedEdgeIds, currentEdge.id],
        }));

        const nextNode = nodes.find((node) => node.id === currentEdge.target);
        if (!nextNode) break;

        setExecutionState((prev) => ({ ...prev, activeNodeId: nextNode.id }));
        touchNode(nextNode.id, {
          executionState:
            nextNode.type === "input"
              ? "waiting"
              : nextNode.type === "router"
                ? "matching"
                : "active",
          executionTitle:
            nextNode.type === "input"
              ? "Waiting for user input"
              : nextNode.type === "condition"
                ? "Evaluating condition"
                : nextNode.type === "router"
                  ? "Evaluating router"
                  : nextNode.type === "api"
                    ? "Calling API..."
                    : nextNode.type === "googlesheets"
                      ? "Querying Sheet..."
                      : nextNode.type === "message"
                        ? "Sending message..."
                        : "Running step",
          executionMessage:
            nextNode.type === "input"
              ? resolveMessageText(
                  nextNode.data?.prompt || "Enter Value",
                  context,
                )
              : nextNode.type === "condition"
                ? "Checking variables"
                : nextNode.type === "router"
                  ? `Switching on ${nextNode.data?.field || "user_input"}`
                  : nextNode.type === "api"
                    ? resolveMessageText(nextNode.data?.url || "", context)
                    : nextNode.type === "googlesheets"
                      ? `${(nextNode.data?.action || "read").toUpperCase()} — ${nextNode.data?.spreadsheetName || "Sheet"}`
                      : nextNode.type === "message"
                        ? resolveMessageText(
                            nextNode.data?.message || "",
                            context,
                          )
                        : nextNode.data?.label || nextNode.type,
          executionDetail:
            nextNode.type === "input"
              ? `Store as {{${nextNode.data?.variableKey || "user_input"}}}`
              : nextNode.type === "api"
                ? `${nextNode.data?.method || "GET"} request`
                : nextNode.type === "googlesheets"
                  ? `Output prefix: {{${nextNode.data?.outputPrefix || "sheets"}.*}}`
                  : nextNode.type === "router"
                    ? `Cases: ${(nextNode.data?.cases || []).length}`
                    : nextNode.type === "message"
                      ? "Waiting to render bubble"
                      : "",
        });

        await wait(randomStepDelay());
        if (isCancelled()) return;

        if (nextNode.type === "input") {
          const enteredValue = await waitForUserInput(nextNode, context);
          if (isCancelled()) return;
          const variableKey = nextNode.data?.variableKey || "user_input";
          const rawText = String(enteredValue ?? "").trim();
          const normalizedValue = rawText.toLowerCase();

          // Base variables — mirrors backend applyInputToContext
          context[variableKey] = normalizedValue;
          context["user_input"] = normalizedValue;
          context["incoming_message"] = rawText;
          context["user_message"] = rawText;
          context["user.reply"] = normalizedValue;

          // Comma-split — mirrors backend applyInputToContext
          if (rawText.includes(",")) {
            const parts = rawText
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean);
            const splitVarStr = String(
              nextNode.data?.splitVariables || "",
            ).trim();
            const namedVars = splitVarStr
              ? splitVarStr
                  .split(",")
                  .map((v) =>
                    v
                      .trim()
                      .replace(/[^a-z0-9_]/gi, "_")
                      .toLowerCase(),
                  )
                  .filter(Boolean)
              : [];
            parts.forEach((part, i) => {
              context[`${variableKey}.${i}`] = part.toLowerCase();
              context[`${variableKey}.raw.${i}`] = part;
              if (namedVars[i]) {
                context[`${variableKey}.${namedVars[i]}`] = part.toLowerCase();
                context[`${variableKey}.${namedVars[i]}.raw`] = part;
              }
            });
            context[`${variableKey}.count`] = parts.length;
          }

          touchNode(nextNode.id, {
            executionState: "success",
            executionTitle: "Input received",
            executionMessage: normalizedValue,
            executionDetail: `Saved to {{${variableKey}}}`,
            executionValue: normalizedValue,
          });
          setInputModal(null);
          inputResolverRef.current = null;
        }

        if (nextNode.type === "condition") {
          const branch = await executeConditionNode(nextNode, context);
          currentEdge = getOutgoingEdge(nextNode.id, branch ? "true" : "false");
          currentNode = nextNode;
          continue;
        }

        if (nextNode.type === "router") {
          const branchHandle = await executeRouterNode(nextNode, context);
          currentEdge = getOutgoingEdge(nextNode.id, branchHandle);
          currentNode = nextNode;
          continue;
        }

        if (nextNode.type === "api") {
          try {
            await executeApiNode(nextNode, context);
          } catch (error) {
            touchNode(nextNode.id, {
              executionState: "error",
              executionTitle: "API error",
              executionMessage: error.message,
              executionDetail: "Request failed",
              executionPreview: error.message,
            });
          }
        }

        if (nextNode.type === "googlesheets") {
          try {
            await executeGoogleSheetsSimNode(nextNode, context);
          } catch (error) {
            const prefix = nextNode.data?.outputPrefix || "sheets";
            context[`${prefix}.success`] = false;
            context[`${prefix}.error`] = error.message;
            touchNode(nextNode.id, {
              executionState: "error",
              executionTitle: "Sheets error",
              executionMessage: error.message,
              executionDetail: `{{${prefix}.success}} = false`,
            });
          }
        }

        if (nextNode.type === "message") {
          await executeSendMessage(nextNode, context);
        }

        currentNode = nextNode;
        currentEdge = getOutgoingEdge(currentNode.id);
      }

      setExecutionState((prev) => ({
        ...prev,
        activeNodeId: null,
        activeEdgeId: null,
      }));
    } finally {
      if (demoRunTokenRef.current === runToken) {
        setIsDemoRunning(false);
      }
    }
  }, [
    buildRuntimeContext,
    clearExecutionState,
    executeApiNode,
    executeConditionNode,
    executeGoogleSheetsSimNode,
    executeRouterNode,
    executeSendMessage,
    getOutgoingEdge,
    isDemoRunning,
    nodes,
    nowLabel,
    randomStepDelay,
    resolveMessageText,
    selectedSession?.phoneNumber,
    testMessage,
    wait,
    waitForUserInput,
  ]);
  const flowActions = useMemo(
    () => ({ deleteNode, unlinkNode, duplicateNode, openConfig }),
    [deleteNode, unlinkNode, duplicateNode, openConfig],
  );

  // All dynamic variables in the flow: User Input + split vars + API + Google Sheets output
  const flowVariables = useMemo(() => {
    // User Input nodes — base variableKey + optional named split vars
    const inputVars = nodes
      .filter((n) => n.type === "input" && n.data?.variableKey)
      .flatMap((n) => {
        const base = {
          key: n.data.variableKey,
          type: n.data.inputType || "text",
          source: "input",
        };
        const extras = [];
        if (n.data.enableSplit && n.data.splitVariables) {
          const names = n.data.splitVariables
            .split(",")
            .map((v) =>
              v
                .trim()
                .replace(/[^a-z0-9_]/gi, "_")
                .toLowerCase(),
            )
            .filter(Boolean);
          names.forEach((name) => {
            extras.push({
              key: `${n.data.variableKey}.${name}`,
              type: "text",
              source: "input.split",
            });
          });
        }
        return [base, ...extras];
      });

    // API response keys
    const apiVars = nodes
      .filter((n) => n.type === "api" && n.data?.responseKeys?.length)
      .flatMap((n) =>
        (n.data.responseKeys || []).map((key) => ({
          key,
          type: "string",
          source: "api",
        })),
      );

    // Google Sheets READ nodes — output variables based on readHeaders or A/B/C defaults
    const sheetsReadVars = nodes
      .filter(
        (n) =>
          n.type === "googlesheets" &&
          n.data?.action === "read" &&
          n.data?.outputPrefix,
      )
      .flatMap((n) => {
        const p = n.data.outputPrefix || "sheets";
        const headers = (n.data.readHeaders || "")
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean);
        const dataVars = headers.length
          ? headers.map((h) => ({
              key: `${p}.${h.replace(/\s+/g, "_").toLowerCase()}`,
              type: "string",
              source: "sheets.read",
            }))
          : [
              { key: `${p}.A`, type: "string", source: "sheets.read" },
              { key: `${p}.B`, type: "string", source: "sheets.read" },
              { key: `${p}.C`, type: "string", source: "sheets.read" },
              { key: `${p}.row`, type: "string", source: "sheets.read" },
            ];
        return [
          ...dataVars,
          { key: `${p}.found`, type: "boolean", source: "sheets.read" },
          { key: `${p}.count`, type: "number", source: "sheets.read" },
          { key: `${p}.success`, type: "boolean", source: "sheets.read" },
        ];
      });

    // Google Sheets write nodes (append/update/delete) — success + affectedRows
    const sheetsWriteVars = nodes
      .filter(
        (n) =>
          n.type === "googlesheets" &&
          n.data?.action !== "read" &&
          n.data?.outputPrefix,
      )
      .flatMap((n) => {
        const p = n.data.outputPrefix || "sheets";
        return [
          { key: `${p}.success`, type: "boolean", source: "sheets" },
          { key: `${p}.affectedRows`, type: "number", source: "sheets" },
        ];
      });

    return [...inputVars, ...apiVars, ...sheetsReadVars, ...sheetsWriteVars];
  }, [nodes]);

  const runtimeNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          ...(executionState.nodeState[node.id] || {}),
        },
      })),
    [executionState.nodeState, nodes],
  );

  const runtimeEdges = useMemo(
    () =>
      edges.map((edge) => {
        const isActive = edge.id === executionState.activeEdgeId;
        const isVisited = executionState.visitedEdgeIds.includes(edge.id);
        const stroke = isActive
          ? "#8b5cf6"
          : isVisited
            ? "#22c55e"
            : edge.style?.stroke || "#64748b";

        return {
          ...edge,
          animated: isActive || edge.animated,
          style: {
            ...(edge.style || {}),
            stroke,
            strokeWidth: isActive
              ? 3
              : isVisited
                ? 2.5
                : edge.style?.strokeWidth || 2,
            filter: isActive
              ? "drop-shadow(0 0 10px rgba(139,92,246,0.45))"
              : undefined,
          },
          markerEnd: edge.markerEnd
            ? { ...edge.markerEnd, color: stroke }
            : edge.markerEnd,
        };
      }),
    [edges, executionState.activeEdgeId, executionState.visitedEdgeIds],
  );

  const handleSaveFlow = async () => {
    if (!selectedSession) {
      alert("Choose a WhatsApp session before saving the flow.");
      return;
    }

    setIsSaving(true);
    try {
      const generatedName =
        flowName.trim() || `Flow ${new Date().toLocaleString()}`;
      const sessionId =
        selectedSession.sessionId ||
        selectedSession._id ||
        getSessionKey(selectedSession);

      const flowData = {
        name: generatedName,
        sessionId,
        description: description.trim(),
        status,
        nodes,
        edges,
      };

      const endpoint = flowId ? `/flows/${flowId}` : "/flows";
      const method = flowId ? "PUT" : "POST";

      const response = await authFetch(endpoint, {
        method,
        body: JSON.stringify(flowData),
      });

      if (response.ok) {
        const data = await response.json();
        setFlowId(data.flow._id);
        console.log("Flow saved:", data.flow);

        setTimeout(() => {
          navigate("/dashboard/flow-builder");
        }, 500);
      } else {
        throw new Error("Failed to save flow");
      }
    } catch (error) {
      console.error("Error saving flow:", error);
      alert(error.message || "Failed to save flow");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel? Your changes will not be saved.",
      )
    ) {
      navigate("/dashboard/flow-builder");
    }
  };

  const handleTestFlow = async () => {
    if (!flowId) {
      alert("Save flow first before testing");
      return;
    }

    try {
      const response = await authFetch(`/flows/${flowId}/test-trigger`, {
        method: "POST",
        body: JSON.stringify({
          messageContent: testMessage,
          phoneNumber: selectedSession?.phoneNumber || "1234567890",
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error("Error testing flow:", error);
      alert("Failed to test flow");
    }
  };

  const renderEditorPanel = () => {
    if (!selectedNode) {
      return (
        <div className="flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 px-4 text-center h-full py-12">
          Click a node to configure
        </div>
      );
    }

    const { type, data } = selectedNode;

    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
              {getLabelFromType(type)}
            </p>
          </div>
          <button
            onClick={deleteSelectedNode}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-rose-200/50 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div className="space-y-3">
          {type === "trigger" && (
            <TriggerNodeEditor data={data} onUpdate={updateSelectedNodeData} />
          )}

          {type === "message" && (
            <SendMessageNodeEditor
              data={data}
              onUpdate={updateSelectedNodeData}
              flowVariables={flowVariables}
            />
          )}

          {type === "router" && (
            <RouterNodeEditor
              data={data}
              onUpdate={updateSelectedNodeData}
              flowVariables={flowVariables}
            />
          )}

          {type === "condition" && (
            <ConditionNodeEditor
              data={data}
              onUpdate={updateSelectedNodeData}
              flowVariables={flowVariables}
            />
          )}

          {type === "input" && (
            <UserInputNodeEditor
              data={data}
              onUpdate={updateSelectedNodeData}
              flowVariables={flowVariables}
            />
          )}

          {type === "api" && (
            <ApiNodeEditor data={data} onUpdate={updateSelectedNodeData} />
          )}

          {type === "googlesheets" && (
            <GoogleSheetsNodeEditor
              data={data}
              onUpdate={updateSelectedNodeData}
              flowVariables={flowVariables}
            />
          )}

          {type === "delay" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Duration
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  value={data.durationValue || 1}
                  onChange={(event) =>
                    updateSelectedNodeData({
                      durationValue: Number(event.target.value || 1),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Unit
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  value={data.durationUnit || "minutes"}
                  onChange={(event) =>
                    updateSelectedNodeData({ durationUnit: event.target.value })
                  }
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </>
          )}

          {type === "ai" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Prompt
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  value={data.prompt || ""}
                  onChange={(event) =>
                    updateSelectedNodeData({ prompt: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Tone
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  value={data.tone || "friendly"}
                  onChange={(event) =>
                    updateSelectedNodeData({ tone: event.target.value })
                  }
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="sales">Sales</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      {/* Session Selection Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-[#1a1a1a]/90 rounded-3xl border border-slate-200/30 dark:border-slate-700/30 backdrop-blur-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Create New Flow
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Name your flow and select a WhatsApp session
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Flow Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                placeholder="e.g. Welcome Flow, Order Confirmation..."
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                autoFocus
              />
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-slate-500">
                Loading sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  No WhatsApp sessions found
                </p>
                <button
                  onClick={() => navigate("/dashboard/sessions")}
                  className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
                >
                  Create a session first
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {sessions.map((session) => (
                    <button
                      key={session._id}
                      onClick={() => setSelectedSession(session)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        selectedSession?._id === session._id
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/20 hover:border-primary-300 dark:hover:border-primary-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {session.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {session.phoneNumber || "No number"}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            session.status === "connected"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedSession && (
                  <button
                    onClick={() => {
                      if (!flowName.trim()) {
                        document
                          .querySelector('input[placeholder*="Welcome Flow"]')
                          ?.focus();
                        return;
                      }
                      setShowSessionModal(false);
                    }}
                    className={`w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                      flowName.trim()
                        ? "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {flowName.trim()
                      ? `Start Building "${flowName.trim()}"`
                      : "Enter a flow name to continue"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Full-screen loading overlay while fetching existing flow */}
      {isFlowLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Loading flow...
            </p>
          </div>
        </div>
      )}

      {/* View-only banner */}
      {isReadOnly && !showSessionModal && (
        <div className="absolute top-[72px] left-0 right-0 z-30 flex items-center justify-center gap-3 py-2 px-4 bg-amber-50/90 dark:bg-amber-900/30 border-b border-amber-200/60 dark:border-amber-700/40 backdrop-blur-sm">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            View Only — Changes will not be saved
          </span>
          <button
            onClick={() => {
              const fid = searchParams.get("flowId");
              if (fid) navigate(`/create-flow?flowId=${fid}&mode=edit`);
            }}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-200/70 dark:bg-amber-700/40 text-amber-800 dark:text-amber-200 hover:bg-amber-300/70 dark:hover:bg-amber-600/50 transition-colors"
          >
            Switch to Edit
          </button>
        </div>
      )}

      {/* Show canvas only if session is selected */}
      {!showSessionModal && selectedSession && (
        <FlowActionsContext.Provider value={flowActions}>
          <div
            ref={canvasRef}
            className="absolute inset-0 z-0"
            onDrop={isReadOnly ? undefined : onDrop}
            onDragOver={isReadOnly ? undefined : onDragOver}
          >
            <ReactFlow
              nodes={runtimeNodes}
              edges={runtimeEdges}
              nodeTypes={nodeTypes}
              onNodesChange={isReadOnly ? undefined : onNodesChange}
              onEdgesChange={isReadOnly ? undefined : onEdgesChange}
              onConnect={isReadOnly ? undefined : onConnect}
              nodesDraggable={!isReadOnly}
              nodesConnectable={!isReadOnly}
              elementsSelectable={!isReadOnly}
              onInit={setFlowInstance}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              onSelectionChange={({ nodes: selected }) => {
                if (selected?.length) setSelectedNodeId(selected[0].id);
              }}
              fitView
              fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1 }}
              defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
              snapToGrid={!isReadOnly}
              snapGrid={[16, 16]}
              deleteKeyCode={isReadOnly ? null : ["Delete", "Backspace"]}
              attributionPosition="bottom-left"
              className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#171717] dark:to-[#1a1a1a]"
            >
              <MiniMap
                pannable
                zoomable
                className="!bg-white/10 dark:!bg-slate-900/10 !border !border-slate-200/20 dark:!border-slate-700/20 !rounded-xl backdrop-blur-xl"
                nodeStrokeWidth={3}
                nodeColor={(node) => node?.data?.accent || "#64748b"}
              />
              <Controls className="!bg-white/10 dark:!bg-slate-900/10 !border !border-slate-200/20 dark:!border-slate-700/20 !rounded-xl backdrop-blur-xl" />
              <Background
                gap={16}
                size={1.1}
                color={theme === "dark" ? "#333333" : "#cbd5e1"}
              />
            </ReactFlow>
          </div>

          {/* Top Header */}
          <div className="absolute top-0 left-0 right-0 z-40 border-b border-slate-200/10 dark:border-slate-800/10 bg-gradient-to-b from-white/40 via-white/20 to-transparent dark:from-[#1a1a1a]/60 dark:via-[#171717]/40 dark:to-transparent backdrop-blur-xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>

              {flowName.trim() && (
                <div className="pl-4 border-l border-slate-200/20 dark:border-slate-700/20">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight max-w-[200px] truncate">
                    {flowName.trim()}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {getSessionLabel(selectedSession)}
                  </p>
                </div>
              )}

              {/* Component Icons */}
              <div className="flex items-center gap-1 pl-4 border-l border-slate-200/20 dark:border-slate-700/20">
                {NODE_LIBRARY.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.type} className="group relative">
                      <button
                        draggable
                        onDragStart={(event) => onDragStart(event, item.type)}
                        onClick={() => handleSidebarAdd(item.type)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200/20 dark:border-slate-700/20 bg-white/10 dark:bg-slate-900/10 px-2.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-900/20 backdrop-blur-md transition-all cursor-grab active:cursor-grabbing"
                        title={item.label}
                      >
                        <Icon size={16} style={{ color: item.accent }} />
                      </button>
                      {/* Hover Tooltip */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-900/10 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-900/20 backdrop-blur-md transition-all"
                title="Flow settings"
              >
                <Settings size={16} />
              </button>

              {flowId && (
                <button
                  onClick={() => setShowTestModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-900/10 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-900/20 backdrop-blur-md transition-all"
                  title="Test flow trigger"
                >
                  <PlayCircle size={16} />
                </button>
              )}

              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-900/10 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-900/20 backdrop-blur-md transition-all"
              >
                {theme === "dark" ? (
                  <Sun size={16} className="text-amber-400" />
                ) : (
                  <Moon size={16} />
                )}
              </button>

              {isReadOnly ? (
                <button
                  onClick={() => {
                    const fid = searchParams.get("flowId");
                    if (fid) navigate(`/create-flow?flowId=${fid}&mode=edit`);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2 text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  <Save size={16} /> Edit Flow
                </button>
              ) : (
                <button
                  onClick={handleSaveFlow}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white px-5 py-2 text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  <Save size={16} /> {isSaving ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar - Node Config (Sliding Panel) */}
          <div
            className={`absolute top-20 right-0 bottom-0 z-30 border-l border-slate-200/10 dark:border-slate-800/10 bg-gradient-to-l from-white/60 via-white/40 to-white/30 dark:from-[#1a1a1a]/80 dark:via-[#171717]/60 dark:to-[#171717]/40 backdrop-blur-2xl shadow-2xl rounded-l-3xl overflow-y-auto p-4 transition-all duration-300 ease-in-out ${
              showConfigPanel
                ? "w-96 translate-x-0 opacity-100"
                : "w-0 translate-x-full opacity-0 pointer-events-none m-0"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
                {selectedNode ? "Configure" : "Properties"}
              </p>
              <button
                onClick={() => setShowConfigPanel(false)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            {renderEditorPanel()}
          </div>

          {/* Right Side Notch - Toggle Configure Panel */}
          {!showConfigPanel && (
            <button
              onClick={() => setShowConfigPanel(true)}
              className="absolute right-0 z-20 h-10 w-2.5 rounded-l-lg border-l border-t border-b border-slate-200/30 dark:border-slate-700/30 bg-gradient-to-r from-white/50 to-white/30 dark:from-[#1a1a1a]/70 dark:to-[#171717]/50 backdrop-blur-xl hover:from-white/70 dark:hover:from-[#1a1a1a]/90 transition-all duration-300 group mr-2"
              style={{ top: "50%", transform: "translateY(-50%)" }}
              title="Show Configure"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <ChevronLeft
                  size={12}
                  className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors"
                />
              </div>
            </button>
          )}

          {/* Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/80 dark:bg-[#1a1a1a]/90 rounded-2xl border border-slate-200/30 dark:border-slate-700/30 backdrop-blur-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Flow Settings
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200/40 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-900/30 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
                      Selected session
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {getSessionLabel(selectedSession)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      This is the WhatsApp session that will be used when the
                      flow is saved or started.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Choose session
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                      value={getSessionKey(selectedSession)}
                      onChange={(e) => {
                        const nextSession = findSessionByKey(
                          sessions,
                          e.target.value,
                        );
                        setSelectedSession(nextSession);
                      }}
                      disabled={sessions.length === 0}
                    >
                      <option value="" disabled>
                        {sessions.length === 0
                          ? "No sessions available"
                          : "Select a session"}
                      </option>
                      {sessions.map((session) => {
                        const sessionKey = getSessionKey(session);
                        return (
                          <option key={sessionKey} value={sessionKey}>
                            {getSessionLabel(session)}
                          </option>
                        );
                      })}
                    </select>
                    {sessions.length === 0 && (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                        No connected WhatsApp sessions were found. Create or
                        connect a session first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                      placeholder="Optional flow description..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-slate-400 disabled:to-slate-500 text-white px-4 py-2 text-sm font-semibold transition-all"
                    disabled={!selectedSession}
                  >
                    {selectedSession ? "Done" : "Choose a session"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Test Flow Modal */}
          {showTestModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/80 dark:bg-[#1a1a1a]/90 rounded-2xl border border-slate-200/30 dark:border-slate-700/30 backdrop-blur-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Test Flow Trigger
                  </h3>
                  <button
                    onClick={() => {
                      setShowTestModal(false);
                      setTestResult(null);
                      setTestMessage("");
                    }}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Test Message
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                      placeholder="Enter a test message to check if trigger matches..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                    />
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg border ${
                        testResult.triggerMatches
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          testResult.triggerMatches
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {testResult.triggerMatches ? "✅ " : "❌ "}
                        {testResult.message}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleTestFlow}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-4 py-2 text-sm font-semibold transition-all"
                  >
                    <PlayCircle size={16} className="mr-2" />
                    Test Trigger
                  </button>
                </div>
              </div>
            </div>
          )}

          <WorkflowBottomToolbar
            onRunOnce={runDemoOnce}
            isRunning={isDemoRunning}
          />

          {inputModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm px-4">
              <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/90 dark:bg-slate-950/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    User Input
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                    Enter Value
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {inputModal.title}
                  </p>
                </div>

                <input
                  autoFocus
                  value={inputModal.value}
                  onChange={(e) =>
                    setInputModal((prev) => ({
                      ...prev,
                      value: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder={`Save as {{${inputModal.variableKey}}}`}
                />

                <button
                  onClick={() => {
                    if (!inputResolverRef.current) return;
                    const value = inputModal.value.trim().toLowerCase();
                    setInputModal(null);
                    inputResolverRef.current(value);
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-600 hover:to-lime-600"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </FlowActionsContext.Provider>
      )}
    </div>
  );
}
