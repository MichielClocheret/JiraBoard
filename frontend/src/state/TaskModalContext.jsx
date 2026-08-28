import { createContext, useCallback, useContext, useState } from "react";

// Replaces the shared #tm-* Task Modal + openIssueByKey from
// legacy/js/userDashboard.js. Any component can call openIssue(key, fallback)
// to pop the shared issue/feedback modal.
const TaskModalContext = createContext(null);

export function TaskModalProvider({ children }) {
  const [state, setState] = useState(null); // { issueKey, fallback } | null

  const openIssue = useCallback((issueKey, fallback = {}) => {
    setState({ issueKey, fallback });
  }, []);

  const closeIssue = useCallback(() => setState(null), []);

  return (
    <TaskModalContext.Provider value={{ state, openIssue, closeIssue }}>
      {children}
    </TaskModalContext.Provider>
  );
}

export function useTaskModal() {
  const ctx = useContext(TaskModalContext);
  if (!ctx) throw new Error("useTaskModal must be used within TaskModalProvider");
  return ctx;
}
