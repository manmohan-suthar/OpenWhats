import { ChevronDown } from "lucide-react";
import { PANEL_ORDER, getPanelMeta } from "./panelConfig";

export default function PanelSwitcher({
  currentPanel,
  showPanelMenu,
  onToggle,
  onSelect,
}) {
  const activePanel = getPanelMeta(currentPanel);

  return (
    <>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150 hover:shadow-sm"
        style={{
          borderColor: activePanel.border,
          background: activePanel.tint,
          color: activePanel.accent,
        }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: activePanel.dot }}
        />
        <span className="hidden sm:inline">{activePanel.shortLabel}</span>
        <ChevronDown size={13} className="opacity-60" />
      </button>

      {showPanelMenu && (
        <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-dropdown border border-slate-200 dark:border-slate-800 animate-fade-in z-50 overflow-hidden py-1">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Switch Panel
          </p>
          {PANEL_ORDER.map((panel) => {
            const panelMeta = getPanelMeta(panel);
            const isActive = currentPanel === panel;

            return (
              <button
                key={panelMeta.key}
                onClick={() => onSelect(panel)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${isActive ? panelMeta.menuActiveClass : panelMeta.menuIdleClass}`}
                style={
                  isActive
                    ? { background: panelMeta.tint, color: panelMeta.accent }
                    : {}
                }
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: panelMeta.dot }}
                />
                {panelMeta.label}
                {isActive && (
                  <span className="ml-auto text-[10px] opacity-60">active</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
