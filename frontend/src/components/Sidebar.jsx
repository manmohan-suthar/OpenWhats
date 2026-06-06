import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Smartphone,
  MessageSquare,
  Key,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Activity,
  Shield,
  Zap,
  MessageCircle,
  List,
  Megaphone,
  Image,
  Inbox,
  BookOpen,
  Send,
  Crown,
  CreditCard,
  History,
  Bot,
  Brain,
  GitBranch,
  Terminal,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const adminNav = [
  { label: "Overview", icon: LayoutDashboard, to: "/admin", section: null },
  { label: "Users", icon: Users, to: "/admin/users", section: null },
  { label: "Sessions", icon: Smartphone, to: "/admin/sessions", section: null },
  {
    label: "Campaigns",
    icon: Megaphone,
    to: "/admin/campaigns",
    section: "Campaigns",
  },
  { label: "Flows", icon: GitBranch, to: "/admin/flows", section: null },
  { label: "Message Logs", icon: Inbox, to: "/admin/msg-logs", section: null },
  { label: "Media Files", icon: Image, to: "/admin/media", section: null },
  {
    label: "Azure Logs",
    icon: Terminal,
    to: "/admin/azure-logs",
    section: "System",
  },
  { label: "API Usage", icon: Zap, to: "/admin/api-usage", section: "System" },
  {
    label: "Pricing Plans",
    icon: CreditCard,
    to: "/admin/pricing",
    section: null,
  },
  {
    label: "Analytics",
    icon: BarChart2,
    to: "/admin/analytics",
    section: null,
  },
  { label: "Settings", icon: Settings, to: "/admin/settings", section: null },
  {
    label: "AI Settings",
    icon: Brain,
    to: "/admin/ai-settings",
    section: null,
  },
  {
    label: "Google OAuth",
    icon: Settings,
    to: "/admin/google-settings",
    section: null,
  },
];

const userNav = [
  { label: "Overview", icon: LayoutDashboard, to: "/dashboard", section: null },
  {
    label: "Sessions",
    icon: Smartphone,
    to: "/dashboard/sessions",
    section: null,
  },
  {
    label: "Chats",
    icon: MessageSquare,
    to: "/dashboard/chats",
    section: null,
  },
  {
    label: "AI Agent",
    icon: Bot,
    to: "/dashboard/ai-agent",
    section: null,
  },
  {
    label: "Flow Builder",
    icon: GitBranch,
    to: "/dashboard/flow-builder",
    section: null,
  },
  {
    label: "Campaigns",
    icon: Megaphone,
    to: "/dashboard/campaigns",
    section: "Campaigns",
  },
  {
    label: "Send Single Message",
    icon: Send,
    to: "/dashboard/send-message",
    section: "Messages",
  },
  {
    label: "Message History",
    icon: History,
    to: "/dashboard/message-history",
    section: "Messages",
  },
  { label: "Number Lists", icon: List, to: "/dashboard/lists", section: null },
  { label: "Groups", icon: Users, to: "/dashboard/groups", section: null },
  {
    label: "Media Gallery",
    icon: Image,
    to: "/dashboard/media",
    section: null,
  },
  { label: "API Keys", icon: Key, to: "/dashboard/api-keys", section: "API" },
  {
    label: "API Docs",
    icon: BookOpen,
    to: "/dashboard/api-docs",
    section: null,
  },
  {
    label: "Api Logs",
    icon: Activity,
    to: "/dashboard/api-logs",
    section: "API",
  },
  {
    label: "Analytics",
    icon: BarChart2,
    to: "/dashboard/analytics",
    section: null,
  },
  {
    label: "Settings",
    icon: Settings,
    to: "/dashboard/settings",
    section: null,
  },
  {
    label: "Subscription",
    icon: Crown,
    to: "/dashboard/subscription",
    section: "Account",
  },
];

export default function Sidebar({ role, collapsed, onToggle }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const nav = role === "admin" ? adminNav : userNav;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-30 flex flex-col
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-60"}
      `}
      style={{
        boxShadow:
          "2px 0 20px rgba(16,185,129,0.06), 1px 0 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-[60px] px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div className="w-8 h-8 rounded-lg bg-wa-green flex items-center justify-center flex-shrink-0 shadow-sm">
          <MessageCircle size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
              WA Control
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
              {role === "admin" ? "Super Admin" : "User Panel"}
            </p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          {role === "admin" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Shield
                size={12}
                className="text-amber-600 dark:text-amber-400"
              />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Super Admin
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <Activity
                size={12}
                className="text-primary-600 dark:text-primary-400"
              />
              <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
                User Dashboard
              </span>
            </div>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {nav.map(({ label, icon: Icon, to, section }, i) => {
          const prevSection = i > 0 ? nav[i - 1].section : null;
          const showDivider = section && section !== prevSection;
          return (
            <div key={to}>
              {showDivider && !collapsed && (
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {section}
                </p>
              )}
              {showDivider && collapsed && (
                <div className="my-1 mx-2 border-t border-slate-100 dark:border-slate-800" />
              )}
              <NavLink
                to={to}
                end={to === "/admin" || to === "/dashboard"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""} ${collapsed ? "justify-center px-2" : ""} ${isActive && to.endsWith("/chats") ? "chats-active-glow" : ""}`
                }
                title={collapsed ? label : undefined}
                style={({ isActive }) =>
                  isActive && to.endsWith("/chats")
                    ? {
                        boxShadow:
                          "0 0 0 1px rgba(16,185,129,0.25), 0 2px 12px rgba(16,185,129,0.15)",
                      }
                    : {}
                }
              >
                <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* User + collapse toggle */}
      <div className="border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        {/* User info */}
        {!collapsed && user && (
          <div className="px-3 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold uppercase">
                {(user.name || user.email || "U")[0]}
              </span>
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user.name || "User"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost btn-sm p-1.5 text-slate-400 hover:text-red-500"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
        {collapsed && (
          <div className="py-2 px-2 flex flex-col items-center gap-1">
            <button
              onClick={handleLogout}
              className="nav-item w-full justify-center px-2"
              title="Logout"
            >
              <LogOut size={18} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center h-9 border-t border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
