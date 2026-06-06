import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Star,
  Users,
  BarChart2,
  Shield,
  Link2,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const GOOGLE_BLUE = "#4285F4";
const GOOGLE_GREEN = "#34A853";
const GOOGLE_YELLOW = "#FBBC04";
const GOOGLE_RED = "#EA4335";

const userNav = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/google-review",
    section: null,
  },
  {
    label: "Connect",
    icon: Link2,
    to: "/google-review/connect",
    section: null,
  },
  {
    label: "Reviews",
    icon: MessageSquare,
    to: "/google-review/reviews",
    section: "Reviews",
  },
  {
    label: "Analytics",
    icon: BarChart2,
    to: "/google-review/analytics",
    section: "Reports",
  },
  {
    label: "Settings",
    icon: Settings,
    to: "/google-review/settings",
    section: null,
  },
];

const adminNav = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    to: "/google-review/admin",
    section: null,
  },
  {
    label: "Businesses",
    icon: Star,
    to: "/google-review/admin/businesses",
    section: "Management",
  },
  {
    label: "Users",
    icon: Users,
    to: "/google-review/admin/users",
    section: null,
  },
  {
    label: "System Settings",
    icon: Settings,
    to: "/google-review/admin/settings",
    section: "System",
  },
];

export default function GoogleReviewSidebar({ collapsed, onToggle }) {
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
        boxShadow: `2px 0 20px rgba(66,133,244,0.07), 1px 0 4px rgba(0,0,0,0.04)`,
      }}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-[60px] px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${GOOGLE_BLUE} 0%, ${GOOGLE_GREEN} 50%, ${GOOGLE_YELLOW} 100%)`,
          }}
        >
          <Star width="16" height="16" className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
              Google Reviews
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {isAdmin ? "Admin Panel" : "Business Portal"}
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
                Google Admin
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{
                background: "rgba(66,133,244,0.06)",
                borderColor: "rgba(66,133,244,0.2)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: GOOGLE_BLUE }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: GOOGLE_BLUE }}
              >
                Google Reviews Panel
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
                end={to === "/google-review" || to === "/google-review/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                   transition-all duration-150 cursor-pointer select-none
                   ${collapsed ? "justify-center px-2" : ""}
                   ${
                     isActive
                       ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                       : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                   }`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2 flex-shrink-0">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
             text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400
             transition-all duration-150 cursor-pointer select-none
             ${collapsed ? "justify-center px-2" : ""}`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
      </div>

      {/* Toggle Button */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2 flex-shrink-0">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
             text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800
             transition-all duration-150 cursor-pointer select-none
             ${collapsed ? "justify-center px-2" : ""}`}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <span className="truncate">Collapse</span>
              <ChevronLeft size={18} className="flex-shrink-0 ml-auto" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
