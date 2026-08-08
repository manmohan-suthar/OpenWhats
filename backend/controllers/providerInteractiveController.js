import {
  getProviderInteractiveCapabilities,
  sendProviderInteractiveMessage,
} from "../services/ProviderInteractiveMessageService.js";

export async function sendProviderInteractive(req, res) {
  try {
    const result = await sendProviderInteractiveMessage({
      userId: req.user?._id,
      sessionId: String(req.params.sessionId || "").trim(),
      chatJid: String(req.params.chatJid || "").trim(),
      idempotencyKey: req.get("Idempotency-Key"),
      payload: req.body,
    });
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    console.error("[Provider API] interactive send failed", {
      sessionId: req.params.sessionId,
      code: error.code,
      error: error.message,
    });
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "INTERACTIVE_MESSAGE_FAILED",
      error: error.message || "Interactive message failed",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

export function getProviderInteractiveTypes(_req, res) {
  return res.json({ success: true, data: getProviderInteractiveCapabilities() });
}

export default { sendProviderInteractive, getProviderInteractiveTypes };
