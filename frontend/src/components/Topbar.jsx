import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Sun,
  Moon,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import PanelSwitcher from "./topbar/PanelSwitcher";
import { getActivePanel, getPanelRoute } from "./topbar/panelConfig";

const mockNotifications = [
  {
    id: 1,
    type: "success",
    title: "Session connected",
    desc: "Session WA-001 is now active",
    time: "2m ago",
    read: false,
  },
  {
    id: 2,
    type: "warning",
    title: "High API usage",
    desc: "You have used 80% of your quota",
    time: "15m ago",
    read: false,
  },
  {
    id: 3,
    type: "info",
    title: "New message received",
    desc: "3 new messages in queue",
    time: "1h ago",
    read: true,
  },
  {
    id: 4,
    type: "error",
    title: "Session disconnected",
    desc: "Session WA-003 lost connection",
    time: "2h ago",
    read: true,
  },
];

function NotificationDot({ type }) {
  const colors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
    error: "bg-red-500",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${colors[type] || "bg-slate-400"}`}
    />
  );
}

const META_BLUE = "#1877F2";
const WA_GREEN = "#25D366";

export default function Topbar({ collapsed, role }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPanel = getActivePanel(location.pathname);

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPanelMenu, setShowPanelMenu] = useState(false);
  const [search, setSearch] = useState("");

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const panelRef = useRef(null);

  const unread = mockNotifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target))
        setShowProfile(false);
      if (panelRef.current && !panelRef.current.contains(e.target))
        setShowPanelMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const handlePanelSwitch = (panel) => {
    setShowPanelMenu(false);
    navigate(getPanelRoute(panel, isAdmin));
  };

  const sidebarW = collapsed ? 64 : 240;

  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center h-[60px] px-4 gap-3
                 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm
                 border-b border-slate-200 dark:border-slate-800 transition-all duration-300"
      style={{ left: sidebarW }}
    >
      {/* Panel selector */}
      <div className="relative flex-shrink-0" ref={panelRef}>
        <PanelSwitcher
          currentPanel={currentPanel}
          showPanelMenu={showPanelMenu}
          onToggle={() => {
            setShowPanelMenu((v) => !v);
            setShowNotif(false);
            setShowProfile(false);
          }}
          onSelect={handlePanelSwitch}
        />
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs hidden sm:block">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="input pl-9 py-1.5 text-xs h-8 bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="btn-ghost btn-sm p-2 rounded-lg"
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? (
          <Sun size={17} className="text-amber-400" />
        ) : (
          <Moon size={17} className="text-slate-500" />
        )}
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setShowNotif((v) => !v);
            setShowProfile(false);
          }}
          className="btn-ghost btn-sm p-2 rounded-lg relative"
          title="Notifications"
        >
          <Bell size={17} className="text-slate-500 dark:text-slate-400" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {showNotif && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-dropdown border border-slate-200 dark:border-slate-800 animate-fade-in z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Notifications
              </h4>
              <span className="badge badge-blue">{unread} new</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {mockNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${!n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                >
                  <NotificationDot type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {n.desc}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {n.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
              <button className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline w-full text-center">
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => {
            setShowProfile((v) => !v);
            setShowNotif(false);
          }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold uppercase">
              {(user?.name || user?.email || "U")[0]}
            </span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.name || "User"}
            </p>
            <p className="text-[10px] text-slate-400 capitalize">
              {role === "admin" ? "Super Admin" : "Member"}
            </p>
          </div>
          <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
        </button>

        {showProfile && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-dropdown border border-slate-200 dark:border-slate-800 animate-fade-in z-50 overflow-hidden py-1">
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={() =>
                navigate(
                  role === "admin" ? "/admin/settings" : "/dashboard/settings",
                )
              }
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings size={14} /> Profile & Settings
            </button>
            {role === "user" && (
              <button
                onClick={() => navigate("/admin")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <Shield size={14} /> Admin Preview
              </button>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
