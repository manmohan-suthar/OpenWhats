import pino from "pino";

const SUPPORTED_LEVELS = new Set([
  "silent",
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
]);

export function resolveBaileysLogLevel(value = process.env.BAILEYS_LOG_LEVEL) {
  const level = String(value || "warn").trim().toLowerCase();
  return SUPPORTED_LEVELS.has(level) ? level : "warn";
}

export function createBaileysLogger(sessionId) {
  return pino({
    level: resolveBaileysLogLevel(),
    base: undefined,
  }).child({
    component: "baileys",
    sessionId,
  });
}
