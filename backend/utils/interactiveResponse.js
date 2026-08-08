function parseJsonObject(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  if (value.length > 8192) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function unwrapMessageContent(message) {
  let content = message?.message || message || null;
  const seen = new Set();
  while (content && typeof content === "object" && !seen.has(content)) {
    seen.add(content);
    const nested =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.viewOnceMessageV2Extension?.message ||
      content.documentWithCaptionMessage?.message;
    if (!nested) break;
    content = nested;
  }
  return content || {};
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

export function extractInteractiveResponse(message) {
  const content = unwrapMessageContent(message);

  const button = content.buttonsResponseMessage;
  if (button) {
    return {
      type: "quick_reply",
      actionId: firstString(button.selectedButtonId),
      label: firstString(button.selectedDisplayText, button.selectedButtonId),
      originalMessageId: firstString(button.contextInfo?.stanzaId),
      rawType: "buttonsResponseMessage",
    };
  }

  const template = content.templateButtonReplyMessage;
  if (template) {
    return {
      type: "quick_reply",
      actionId: firstString(template.selectedId),
      label: firstString(template.selectedDisplayText, template.selectedId),
      originalMessageId: firstString(template.contextInfo?.stanzaId),
      rawType: "templateButtonReplyMessage",
    };
  }

  const list = content.listResponseMessage?.singleSelectReply;
  if (list) {
    return {
      type: "list",
      actionId: firstString(list.selectedRowId),
      label: firstString(
        content.listResponseMessage?.title,
        list.title,
        list.selectedRowId,
      ),
      description: firstString(list.description),
      originalMessageId: firstString(
        content.listResponseMessage?.contextInfo?.stanzaId,
      ),
      rawType: "listResponseMessage",
    };
  }

  const interactive = content.interactiveResponseMessage;
  if (interactive) {
    const native = interactive.nativeFlowResponseMessage || {};
    const params = parseJsonObject(native.paramsJson) || {};
    const actionId = firstString(
      params.id,
      params.selected_id,
      params.selectedId,
      params.row_id,
      params.rowId,
      params.flow_token,
      params.action,
      interactive.buttonReply?.id,
    );
    const label = firstString(
      params.title,
      params.display_text,
      params.label,
      interactive.buttonReply?.displayText,
      interactive.body?.text,
      actionId,
    );
    return {
      type: native.name || "native_flow",
      actionId,
      label,
      originalMessageId: firstString(interactive.contextInfo?.stanzaId),
      rawType: "interactiveResponseMessage",
      params,
    };
  }

  return null;
}

export function interactiveResponseText(response) {
  if (!response) return "";
  return firstString(response.label, response.actionId);
}
