import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout({ role }) {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem("sidebarCollapsed");
    return stored ? stored === "true" : window.innerWidth < 1024;
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", collapsed);
  }, [collapsed]);

  // Close mobile sidebar on route change / outside click
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarW = collapsed ? 64 : 240;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile overlay */}
      {mobileOpen && !collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <Topbar collapsed={collapsed} role={role} />

      {/* Main content */}
      <main
        className="transition-all duration-300 pt-[60px]"
        style={{ marginLeft: sidebarW }}
      >
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
