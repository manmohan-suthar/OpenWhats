import { Camera, LayoutDashboard, MessageCircle, Star } from "lucide-react";

export const PANEL_DEFS = {
  wa: {
    key: "wa",
    label: "WA Control",
    shortLabel: "WA Control",
    icon: MessageCircle,
    accent: "#25D366",
    tint: "rgba(37,211,102,0.06)",
    border: "rgba(37,211,102,0.35)",
    dot: "#25D366",
    menuActiveClass:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold",
    menuIdleClass:
      "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
    routes: {
      user: "/dashboard",
      admin: "/admin",
    },
  },
  meta: {
    key: "meta",
    label: "Meta",
    shortLabel: "Meta",
    icon: LayoutDashboard,
    accent: "#1877F2",
    tint: "rgba(24,119,242,0.06)",
    border: "rgba(24,119,242,0.35)",
    dot: "#1877F2",
    menuActiveClass:
      "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold",
    menuIdleClass:
      "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
    routes: {
      user: "/meta",
      admin: "/meta/admin",
    },
  },
  instagram: {
    key: "instagram",
    label: "Instagram",
    shortLabel: "Instagram",
    icon: Camera,
    accent: "#E1306C",
    tint: "rgba(225,48,108,0.08)",
    border: "rgba(225,48,108,0.35)",
    dot: "linear-gradient(135deg, #833AB4 0%, #E1306C 55%, #F58529 100%)",
    menuActiveClass:
      "bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 font-semibold",
    menuIdleClass:
      "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
    routes: {
      user: "/instagram",
      admin: "/instagram/admin",
    },
  },
  "google-review": {
    key: "google-review",
    label: "Google Reviews",
    shortLabel: "Reviews",
    icon: Star,
    accent: "#4285F4",
    tint: "rgba(66,133,244,0.06)",
    border: "rgba(66,133,244,0.35)",
    dot: "linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)",
    menuActiveClass:
      "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold",
    menuIdleClass:
      "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
    routes: {
      user: "/google-review",
      admin: "/google-review/admin",
    },
  },
};

export const PANEL_ORDER = ["wa"];

export function getActivePanel(pathname) {
  if (pathname.startsWith("/instagram")) return "instagram";
  if (pathname.startsWith("/meta")) return "meta";
  if (pathname.startsWith("/google-review")) return "google-review";
  return "wa";
}

export function getPanelRoute(panel, isAdmin) {
  return (
    PANEL_DEFS[panel]?.routes?.[isAdmin ? "admin" : "user"] || "/dashboard"
  );
}

export function getPanelMeta(panel) {
  return PANEL_DEFS[panel] || PANEL_DEFS.wa;
}
