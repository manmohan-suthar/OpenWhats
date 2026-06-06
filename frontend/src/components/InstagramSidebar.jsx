import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  Camera,
  Users,
  BarChart2,
  Shield,
  Inbox,
  Link2,
  Megaphone,
  Bell,
  Brain,
  Film,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const INSTAGRAM_PINK = "#E1306C";
const INSTAGRAM_PURPLE = "#833AB4";

const userNav = [
  { label: "Overview", icon: LayoutDashboard, to: "/instagram", section: null },
  { label: "Connect", icon: Link2, to: "/instagram/connect", section: null },
  {
    label: "Account",
    icon: Users,
    to: "/instagram/account",
    section: "Business",
  },
  { label: "Posts", icon: Camera, to: "/instagram/posts", section: "Content" },
  {
    label: "DM",
    icon: MessageSquare,
    to: "/instagram/dm",
    section: "Messaging",
  },
  {
    label: "Notifications",
    icon: Bell,
    to: "/instagram/notifications",
    section: "Activity",
  },
  {
    label: "AI Reply",
    icon: Sparkles,
    to: "/instagram/ai-reply",
    section: "AI",
  },
  {
    label: "AI Agent",
    icon: Brain,
    to: "/instagram/ai-agent",
    section: "AI",
  },
  {
    label: "Reel Campaigns",
    icon: Film,
    to: "/instagram/reels",
    section: "Content",
  },
  {
    label: "Reel Campaigns v1",
    icon: Film,
    to: "/instagram/reels-v1",
    section: "Content",
  },
  {
    label: "Campaigns",
    icon: Megaphone,
    to: "/instagram/campaigns",
    section: null,
  },
  {
    label: "Analytics",
    icon: BarChart2,
    to: "/instagram/analytics",
    section: "Reports",
  },
  {
    label: "Settings",
    icon: Settings,
    to: "/instagram/settings",
    section: null,
  },
];

const adminNav = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    to: "/instagram/admin",
    section: null,
  },
  {
    label: "Users",
    icon: Users,
    to: "/instagram/admin/users",
    section: "Management",
  },
  {
    label: "Accounts",
    icon: Camera,
    to: "/instagram/admin/accounts",
    section: null,
  },
  {
    label: "Messages",
    icon: Inbox,
    to: "/instagram/admin/messages",
    section: null,
  },
  {
    label: "System Settings",
    icon: Settings,
    to: "/instagram/admin/settings",
    section: "System",
  },
];

export default function InstagramSidebar({ collapsed, onToggle }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ["admin", "superadmin"].includes(user?.role);
  const nav = isAdmin ? adminNav : userNav;

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
        boxShadow: `2px 0 20px rgba(225,48,108,0.07), 1px 0 4px rgba(0,0,0,0.04)`,
      }}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-[60px] px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${INSTAGRAM_PURPLE} 0%, ${INSTAGRAM_PINK} 55%, #F58529 100%)`,
          }}
        >
          <Camera width="16" height="16" className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
              Instagram
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {isAdmin ? "Admin Panel" : "Business API"}
            </p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          {isAdmin ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Shield
                size={12}
                className="text-amber-600 dark:text-amber-400"
              />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Instagram Admin
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{
                background: "rgba(225,48,108,0.06)",
                borderColor: "rgba(225,48,108,0.2)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: INSTAGRAM_PINK }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: INSTAGRAM_PINK }}
              >
                Instagram Panel
              </span>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
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
                end={to === "/instagram" || to === "/instagram/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                   transition-all duration-150 cursor-pointer select-none
                   ${collapsed ? "justify-center px-2" : ""}
                   ${
                     isActive
                       ? "text-pink-700 dark:text-pink-400"
                       : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                   }`
                }
                style={({ isActive }) =>
                  isActive ? { background: "rgba(225,48,108,0.08)" } : {}
                }
                title={collapsed ? label : undefined}
              >
                <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Footer - Logout */}
      <div className="px-2 py-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors ${collapsed ? "justify-center px-2" : ""}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} strokeWidth={1.8} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="px-2 py-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
