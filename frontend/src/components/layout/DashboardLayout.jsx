import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import ContentHeader from "./ContentHeader";
import ErrorBoundary from "../shared/ErrorBoundary";

// Ported from the mobile-sidebar handling in legacy/js/sideDashboard.js
// (initMobileSidebar) — a CSS breakpoint + body class toggle, same as before.
export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle("mobile-sidebar-open", mobileOpen);
    return () => document.body.classList.remove("mobile-sidebar-open");
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dashboard-layout">
      <div className="mobile-sidebar-backdrop" hidden={!mobileOpen} onClick={() => setMobileOpen(false)} />
      <Sidebar onCloseMobile={() => setMobileOpen(false)} />

      <main className="main" id="app-main">
        <div className="main-mobile-bar">
          <span className="logo-text" style={{ color: "var(--text-primary)" }}>JiraBoard</span>
          <button
            type="button"
            className="sidebar-mobile-toggle"
            aria-controls="app-sidebar"
            aria-expanded={mobileOpen}
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
        </div>

        <div className="content-area">
          <ContentHeader />
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
