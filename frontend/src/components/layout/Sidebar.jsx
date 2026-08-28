import { matchPath, useLocation } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import MainSidebarPanel from "./MainSidebarPanel";
import UserSidebarPanel from "./UserSidebarPanel";

export default function Sidebar({ onCloseMobile }) {
  const location = useLocation();
  const { resolveUser } = useAppState();
  const match = matchPath("/user/:accountId/*", location.pathname);
  const accountId = match?.params?.accountId ? decodeURIComponent(match.params.accountId) : null;
  const user = accountId ? resolveUser(accountId) : null;

  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="sidebar-header-wrap">
        <a className="sidebar-header" href="#">
          <img className="logo-icon" src="/assets/images/logo-jiraboard.svg" alt="JiraBoard logo" />
          <span className="logo-text">JiraBoard</span>
        </a>
        <button type="button" className="sidebar-mobile-toggle" aria-label="Close sidebar" onClick={onCloseMobile}>
          ✕
        </button>
      </div>

      {user ? <UserSidebarPanel user={user} /> : <MainSidebarPanel />}
    </aside>
  );
}
