import { useState } from "react";

// Ported from initSidebarCollapsibles() in legacy/js/sideDashboard.js —
// same localStorage key scheme, so a previously-saved collapse state (from
// the old app) still applies.
export default function SidebarSection({ sectionKey, label, children }) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(`sidebar-section:${sectionKey}`) !== "closed";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`sidebar-section:${sectionKey}`, next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section className={`sidebar-collapsible ${open ? "" : "is-collapsed"}`}>
      <button type="button" className="sidebar-section-toggle" aria-expanded={open} onClick={toggle}>
        <span className="sidebar-section-label">{label}</span>
        <span className="sidebar-section-indicator" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      <div className="sidebar-section-content" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
