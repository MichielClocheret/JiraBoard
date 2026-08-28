import { useQuery } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { fetchUserOverdue } from "../../api/jira";
import { useAppState } from "../../state/AppStateContext";
import Avatar from "../ui/Avatar";

// Ported from populateUserSidebar() in legacy/js/sideDashboard.js.
export default function UserSidebarPanel({ user }) {
  const { signOut } = useAppState();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["userOverdue", user.accountId],
    queryFn: () => fetchUserOverdue(user.accountId),
    staleTime: 5 * 60 * 1000,
  });
  const overdueCount = data?.ok && Array.isArray(data.issues) ? data.issues.length : 0;

  const base = `/user/${encodeURIComponent(user.accountId)}`;

  return (
    <div id="user-sidebar-panel">
      <div className="user-sidebar-home">
        <a
          href="#"
          className="user-item"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          ← Home
        </a>
      </div>

      <span className="user-sidebar-selected-label">Selected user</span>

      <div className="user-sidebar-user-row">
        <NavLink to={`${base}/todos`} className="user-item active">
          <Avatar user={user} />
          <span className="user-name">{user.displayName || "Unknown"}</span>
          <span className="active-dot" />
        </NavLink>
      </div>

      <nav className="user-list user-sidebar-nav">
        <NavLink to={`${base}/assignedProjects`} className={({ isActive }) => `user-item ${isActive ? "active" : ""}`}>
          📁 Assigned Projects
        </NavLink>
        <NavLink to={`${base}/ownerProjects`} className={({ isActive }) => `user-item ${isActive ? "active" : ""}`}>
          👑 Owner Of Projects
        </NavLink>
        <NavLink to={`${base}/alarm`} className={({ isActive }) => `user-item user-item-alarm ${isActive ? "active" : ""}`}>
          ‼️ Overdue Tasks
          {overdueCount > 0 && <span className="nav-badge">{overdueCount}</span>}
        </NavLink>
      </nav>

      <div className="user-sidebar-signout">
        <button type="button" className="switch-user-btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => signOut()}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
