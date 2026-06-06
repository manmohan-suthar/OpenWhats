// TriggerNode Component
import { PlayCircle } from "lucide-react";

export function TriggerNodeEditor({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Trigger Type
        </label>
        <select
          className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm"
          value={data.triggerType || "message_received"}
          onChange={(e) => onUpdate({ triggerType: e.target.value })}
        >
          <option value="message_received">Message Received</option>
          <option value="match_text">Match Text</option>
          <option value="keyword_match">Keyword Contains</option>
        </select>
      </div>

      {(data.triggerType === "keyword_match" ||
        data.triggerType === "match_text") && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Match Text
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm"
            placeholder="e.g., hello, help"
            value={String(data.keyword || "").toLowerCase()}
            onChange={(e) =>
              onUpdate({ keyword: String(e.target.value || "").toLowerCase() })
            }
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Use exact text for Match Text, or choose Keyword Contains for
            partial matches
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Trigger Name
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm"
          placeholder="e.g., Customer Message"
          value={data.triggerName || ""}
          onChange={(e) => onUpdate({ triggerName: e.target.value })}
        />
      </div>

      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>ℹ️ How it works:</strong> When a message arrives in your
          selected WhatsApp session and matches this trigger, the flow will
          start executing the next steps.
        </p>
      </div>
    </div>
  );
}

export const TriggerNodeConfig = {
  label: "Trigger",
  icon: PlayCircle,
  accent: "#ef4444",
  defaults: {
    triggerType: "message_received",
    triggerName: "Incoming Trigger",
    keyword: "",
  },
};
