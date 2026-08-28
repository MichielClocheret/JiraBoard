import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebar";
import { useAppState } from "../../state/AppStateContext";
import { usePinnedProjects } from "../../features/chat/useChatProjects";
import Avatar from "../ui/Avatar";
import SidebarSection from "./SidebarSection";

function UserRow({ user, badge, onClick }) {
  return (
    <a href="#" className="user-item" onClick={(e) => { e.preventDefault(); onClick(); }}>
      <Avatar user={user} />
      <span className="user-name">{user.displayName || "Unknown"}</span>
      {badge != null && badge > 0 && <span className="nav-badge">{badge}</span>}
    </a>
  );
}

export default function MainSidebarPanel() {
  const { availableUsers, projectManagers, isGuest, signOut } = useAppState();
  const navigate = useNavigate();
  const pinnedQuery = usePinnedProjects(!isGuest);
  const pinnedProjects = pinnedQuery.data?.success ? pinnedQuery.data.projects || [] : [];

  const managerIds = useMemo(
    () => new Set(projectManagers.map((m) => m.accountId).filter(Boolean)),
    [projectManagers]
  );
  const teamMembers = useMemo(
    () => availableUsers.filter((u) => !managerIds.has(u.accountId)),
    [availableUsers, managerIds]
  );

  const goToUser = (user) => navigate(`/user/${encodeURIComponent(user.accountId)}/todos`);

  return (
    <div id="main-sidebar-panel">
      {sidebarConfig.mainSections.map((section) => (
        <SidebarSection key={section.key} sectionKey={section.key} label={section.label}>
          <nav className="user-list">
            {section.items
              .filter((item) => !(item.hiddenForGuest && isGuest))
              .map((item) => (
                <NavLink
                  key={item.tab}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) => `user-item ${isActive ? "active" : ""}`}
                >
                  <span className="user-name">
                    {item.icon} {item.label}
                  </span>
                </NavLink>
              ))}
          </nav>
        </SidebarSection>
      ))}

      <SidebarSection sectionKey="project-managers" label="Project Managers">
        <nav className="user-list">
          {!projectManagers.length ? (
            <div className="muted-text">No project managers found.</div>
          ) : (
            projectManagers.map((m) => (
              <UserRow key={m.accountId} user={m} badge={m.projects?.length} onClick={() => goToUser(m)} />
            ))
          )}
        </nav>
      </SidebarSection>

      <SidebarSection sectionKey="team-members" label="Team Members">
        <nav className="user-list">
          {!teamMembers.length ? (
            <div className="muted-text">No team members found.</div>
          ) : (
            teamMembers.map((u) => <UserRow key={u.accountId} user={u} onClick={() => goToUser(u)} />)
          )}
        </nav>
      </SidebarSection>

      {!isGuest && (
        <SidebarSection sectionKey="pinned-projects" label="Pinned Projects">
          <nav className="user-list">
            {!pinnedProjects.length ? (
              <div className="muted-text">No pinned projects yet.</div>
            ) : (
              pinnedProjects.map((p) => {
                const key = String(p.projectKey || "").toUpperCase();
                return (
                  <NavLink key={key} to={`/chats/${key}`} className={({ isActive }) => `user-item ${isActive ? "active" : ""}`}>
                    <span className="user-name">💬 {p.projectName || key}</span>
                  </NavLink>
                );
              })
            )}
          </nav>
        </SidebarSection>
      )}

      <div style={{ padding: "10px 10px 16px", marginTop: "auto" }}>
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
