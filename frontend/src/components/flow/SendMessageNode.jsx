// SendMessageNode Component
import { MessageSquare } from "lucide-react";

export function SendMessageNodeEditor({ data, onUpdate, flowVariables = [] }) {
  const insertVariable = (key) => {
    if (!key) return;
    const token = `{{${key}}}`;
    const current = data.message || "";
    const separator = current && !current.endsWith(" ") ? " " : "";
    onUpdate({ message: `${current}${separator}${token}` });
  };

  const staticVariables = [
    { key: "incoming_message", source: "system" },
    { key: "user_message", source: "system" },
  ];

  const allVariables = [...staticVariables, ...flowVariables].filter(
    (item, index, arr) =>
      item?.key && arr.findIndex((v) => v.key === item.key) === index,
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Reply Message
        </label>
        <textarea
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm"
          placeholder="Type the message to send as reply..."
          value={data.message || ""}
          onChange={(e) => onUpdate({ message: e.target.value })}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          This message will be sent to the user who triggered the flow
        </p>

        <div className="mt-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
            Available Variables (click to insert)
          </p>

          {allVariables.length === 0 ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Add a User Input or API node to create dynamic variables.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allVariables.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 text-[10px] font-mono font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  title={`Insert {{${variable.key}}}`}
                >
                  {`{{${variable.key}}}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
          Delay before sending
        </label>
        <div className="flex gap-2 items-center">
          <select
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm"
            value={data.delayType || "random"}
            onChange={(e) => onUpdate({ delayType: e.target.value })}
          >
            <option value="random">Random (3-6 sec)</option>
            <option value="fixed">Fixed</option>
            <option value="no_delay">No Delay</option>
          </select>
        </div>
        {data.delayType === "fixed" && (
          <input
            type="number"
            min="1"
            className="w-full px-3 py-2 rounded-lg border border-slate-200/30 dark:border-slate-700/30 bg-white/5 dark:bg-slate-900/5 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm mt-2"
            placeholder="Delay in seconds"
            value={data.fixedDelay || 5}
            onChange={(e) => onUpdate({ fixedDelay: parseInt(e.target.value) })}
          />
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          ⏱️ Default: Random 3-6 seconds (looks more human-like)
        </p>
      </div>

      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-700 dark:text-green-300">
          <strong>✉️ How it works:</strong> The message will be sent to the
          user's number with an automatic delay to appear natural. After
          sending, the flow continues to the next steps if any.
        </p>
      </div>
    </div>
  );
}

export const SendMessageNodeConfig = {
  label: "Send Message",
  icon: MessageSquare,
  accent: "#f59e0b",
  defaults: {
    message: "Thanks for your message!",
    delayType: "random",
    fixedDelay: 5,
    showBubble: false,
    bubbleStatus: "idle",
    bubbleMessage: "",
    bubbleTimestamp: "",
  },
};
