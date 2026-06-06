import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import InstagramSidebar from "../components/InstagramSidebar";
import Topbar from "../components/Topbar";

export default function InstagramDashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem("instagramSidebarCollapsed");
    return stored ? stored === "true" : window.innerWidth < 1024;
  });

  useEffect(() => {
    localStorage.setItem("instagramSidebarCollapsed", collapsed);
  }, [collapsed]);

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
      <InstagramSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <Topbar collapsed={collapsed} role="user" />

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
