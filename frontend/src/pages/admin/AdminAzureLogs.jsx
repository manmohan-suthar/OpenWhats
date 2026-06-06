import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Server, RefreshCw, HeartPulse } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export default function AdminAzureLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const { theme } = useTheme();

  const terminalRef = useRef(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "https://wa-api.suthartech.com/api/admin/azure/logs",
      );

      const data = await res.json();

      if (data?.logs) {
        const nextLogs = Array.isArray(data.logs)
          ? data.logs
          : String(data.logs).split("\n");

        setLogs(nextLogs.filter((line) => line !== ""));
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const restartServer = async () => {
    const confirmed = window.confirm(
      "Restart the server now? This will briefly interrupt live traffic.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setRestarting(true);
      setActionMessage("");

      const res = await fetch(
        "https://wa-api.suthartech.com/api/admin/server/restart",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to initiate server restart");
      }

      setActionMessage(
        data?.message || "Server restart initiated successfully",
      );
      fetchLogs();
    } catch (err) {
      setActionMessage(err.message || "Failed to restart server");
    } finally {
      setRestarting(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={
        theme === "dark"
          ? "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-6"
          : "min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-900 p-6"
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1">
            <h1
              className={
                theme === "dark"
                  ? "text-3xl font-bold flex items-center gap-3 tracking-tight text-white"
                  : "text-3xl font-bold flex items-center gap-3 tracking-tight text-slate-900"
              }
            >
              <span
                className={
                  theme === "dark"
                    ? "relative flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 shadow-sm ring-1 ring-cyan-400/20"
                    : "relative flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm ring-1 ring-sky-200"
                }
              >
                <motion.span
                  className={
                    theme === "dark"
                      ? "absolute inset-0 rounded-2xl bg-cyan-400/20"
                      : "absolute inset-0 rounded-2xl bg-sky-400/20"
                  }
                  animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.05, 0.35] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.span
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative"
                >
                  <HeartPulse size={22} />
                </motion.span>
              </span>
              Azure Live Logs
            </h1>

            <p
              className={
                theme === "dark"
                  ? "text-slate-400 mt-1 text-sm"
                  : "text-slate-500 mt-1 text-sm"
              }
            >
              Real-time PM2 terminal monitoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={restartServer}
              disabled={restarting}
              className={
                theme === "dark"
                  ? "flex items-center gap-2 bg-rose-500 text-white hover:bg-rose-400 transition px-4 py-2 rounded-xl shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  : "flex items-center gap-2 bg-rose-600 text-white hover:bg-rose-700 transition px-4 py-2 rounded-xl shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              }
            >
              <Server size={16} />
              {restarting ? "Restarting..." : "Restart Server"}
            </button>

            <button
              onClick={fetchLogs}
              className={
                theme === "dark"
                  ? "flex items-center gap-2 bg-white text-slate-950 hover:bg-slate-200 transition px-4 py-2 rounded-xl shadow-sm"
                  : "flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 transition px-4 py-2 rounded-xl shadow-sm"
              }
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {actionMessage && (
          <div
            className={
              theme === "dark"
                ? "mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                : "mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
            }
          >
            {actionMessage}
          </div>
        )}

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div
            className={
              theme === "dark"
                ? "bg-slate-900/70 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-sm"
                : "bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "flex items-center gap-2 text-emerald-400"
                  : "flex items-center gap-2 text-emerald-600"
              }
            >
              <Activity size={18} />
              Live Monitoring
            </div>

            <div
              className={
                theme === "dark"
                  ? "text-2xl font-bold mt-2 text-white"
                  : "text-2xl font-bold mt-2 text-slate-900"
              }
            >
              ONLINE
            </div>
          </div>

          <div
            className={
              theme === "dark"
                ? "bg-slate-900/70 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-sm"
                : "bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-slate-400 text-sm"
                  : "text-slate-500 text-sm"
              }
            >
              Auto Refresh
            </div>

            <div
              className={
                theme === "dark"
                  ? "text-2xl font-bold mt-2 text-white"
                  : "text-2xl font-bold mt-2 text-slate-900"
              }
            >
              3 Seconds
            </div>
          </div>

          <div
            className={
              theme === "dark"
                ? "bg-slate-900/70 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-sm"
                : "bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-slate-400 text-sm"
                  : "text-slate-500 text-sm"
              }
            >
              Total Lines
            </div>

            <div
              className={
                theme === "dark"
                  ? "text-2xl font-bold mt-2 text-white"
                  : "text-2xl font-bold mt-2 text-slate-900"
              }
            >
              {logs.length}
            </div>
          </div>
        </div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={
            theme === "dark"
              ? "rounded-3xl overflow-hidden border border-white/10 shadow-xl bg-slate-900/75"
              : "rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white"
          }
        >
          <div
            className={
              theme === "dark"
                ? "bg-slate-950/60 px-4 py-3 flex items-center gap-2 border-b border-white/10"
                : "bg-slate-100 px-4 py-3 flex items-center gap-2 border-b border-slate-200"
            }
          >
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />

            <span
              className={
                theme === "dark"
                  ? "ml-3 text-sm text-slate-400"
                  : "ml-3 text-sm text-slate-500"
              }
            >
              wa-control-api terminal
            </span>
          </div>

          <div
            ref={terminalRef}
            className={
              theme === "dark"
                ? "h-[700px] overflow-y-auto bg-slate-950 p-4"
                : "h-[700px] overflow-y-auto bg-slate-50 p-4"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "rounded-2xl border border-emerald-500/20 bg-[#08140c] p-4 shadow-inner"
                  : "rounded-2xl border border-emerald-200 bg-[#08140c] p-4 shadow-inner"
              }
            >
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-emerald-300/70">
                <span>live log stream</span>
                <span>{loading ? "refreshing..." : "connected"}</span>
              </div>

              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-emerald-400">
                {logs.length > 0 ? logs.join("\n") : "No logs available yet."}
              </pre>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
