import { Copy, Settings, Trash2, Unlink } from "lucide-react";
import { useFlowActions } from "./FlowActionsContext";

function ActionButton({ icon: Icon, onClick, title, danger }) {
  return (
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded-full border shadow-sm transition-all duration-150 hover:scale-110 active:scale-95 ${
        danger
          ? "border-rose-300/50 dark:border-rose-700/50 bg-white/85 dark:bg-slate-900/85 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 hover:border-rose-400/60 dark:hover:border-rose-600/60"
          : "border-slate-200/50 dark:border-slate-700/50 bg-white/85 dark:bg-slate-900/85 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300/60 dark:hover:border-slate-600/60"
      }`}
    >
      <Icon size={11} strokeWidth={2.2} />
    </button>
  );
}

export default function NodeActionBar({ nodeId }) {
  const actions = useFlowActions();
  if (!actions) return null;

  return (
    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 ease-out z-20 translate-y-0.5 group-hover:translate-y-0">
      <ActionButton
        icon={Copy}
        onClick={() => actions.duplicateNode(nodeId)}
        title="Duplicate node"
      />
      <ActionButton
        icon={Unlink}
        onClick={() => actions.unlinkNode(nodeId)}
        title="Disconnect edges"
      />
      <ActionButton
        icon={Settings}
        onClick={() => actions.openConfig(nodeId)}
        title="Configure"
      />
      <ActionButton
        icon={Trash2}
        onClick={() => actions.deleteNode(nodeId)}
        title="Delete node"
        danger
      />
    </div>
  );
}
