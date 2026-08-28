import { createContext, useContext, useEffect, useState } from "react";

// Drives the shared content-header (title/subtitle/avatar/action buttons)
// from whichever page is currently mounted — replaces the imperative
// document.getElementById('page-title').textContent = ... calls (and the
// #dev-content-back-btn / #password-manager-edit-btn-style header
// buttons) scattered across legacy/js/userDashboard.js.
const PageHeaderContext = createContext(null);

const EMPTY_HEADER = { title: "", subtitle: "", avatarUser: null, actions: null };

export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState(EMPTY_HEADER);
  return <PageHeaderContext.Provider value={{ header, setHeader }}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error("usePageHeaderContext must be used within PageHeaderProvider");
  return ctx;
}

export function usePageHeader(title, { subtitle = "", avatarUser = null, actions = null } = {}) {
  const { setHeader } = usePageHeaderContext();
  useEffect(() => {
    setHeader({ title, subtitle, avatarUser, actions });
  }, [title, subtitle, avatarUser, actions, setHeader]);
}
