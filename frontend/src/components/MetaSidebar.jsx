import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Layers,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Phone,
  MessageSquare,
  Megaphone,
  Link2,
  Users,
  Building2,
  Inbox,
  Shield,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const META_BLUE = "#1877F2";

const userNav = [
  { label: "Overview", icon: LayoutDashboard, to: "/meta", section: null },
  { label: "Connect", icon: Link2, to: "/meta/connect", section: null },
  { label: "Numbers", icon: Phone, to: "/meta/numbers", section: "Business" },
  { label: "Templates", icon: FileText, to: "/meta/templates", section: null },
  { label: "Chat", icon: MessageSquare, to: "/meta/chat", section: "Messaging" },
  { label: "Campaigns", icon: Megaphone, to: "/meta/campaigns", section: null },
  { label: "Analytics", icon: BarChart2, to: "/meta/analytics", section: "Reports" },
  { label: "Settings", icon: Settings, to: "/meta/settings", section: null },
];

const adminNav = [
  { label: "Overview", icon: LayoutDashboard, to: "/meta/admin", section: null },
  { label: "Users", icon: Users, to: "/meta/admin/users", section: "Management" },
  { label: "Businesses", icon: Building2, to: "/meta/admin/businesses", section: null },
  { label: "Messages", icon: Inbox, to: "/meta/admin/messages", section: null },
  { label: "Templates", icon: FileText, to: "/meta/admin/templates", section: null },
  { label: "System Settings", icon: Settings, to: "/meta/admin/settings", section: "System" },
];

export default function MetaSidebar({ collapsed, onToggle }) {
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
      style={{ boxShadow: "2px 0 20px rgba(24,119,242,0.07), 1px 0 4px rgba(0,0,0,0.04)" }}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-[60px] px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: META_BLUE }}
        >
          <svg width="16" height="16" viewBox="0 0 36 36" fill="white">
            <path d="M18 2C9.163 2 2 9.163 2 18s7.163 16 16 16 16-7.163 16-16S26.837 2 18 2zm-3 22.5v-13l10 6.5-10 6.5z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
              Meta
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
              <Shield size={12} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Meta Admin
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{ background: "rgba(24,119,242,0.06)", borderColor: "rgba(24,119,242,0.2)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: META_BLUE }} />
              <span className="text-xs font-semibold" style={{ color: META_BLUE }}>
                Meta Panel
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
                end={to === "/meta" || to === "/meta/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                   transition-all duration-150 cursor-pointer select-none
                   ${collapsed ? "justify-center px-2" : ""}
                   ${isActive
                     ? "text-blue-700 dark:text-blue-400"
                     : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                   }`
                }
                style={({ isActive }) =>
                  isActive ? { background: "rgba(24,119,242,0.08)" } : {}
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

      {/* User + collapse toggle */}
      <div className="border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        {!collapsed && user && (
          <div className="px-3 py-3 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1877F2, #42a5f5)" }}
            >
              <span className="text-white text-xs font-bold uppercase">
                {(user.name || user.email || "U")[0]}
              </span>
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user.name || "User"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
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
