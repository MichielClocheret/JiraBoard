import { useParams } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import UserTasksPage from "./UserTasksPage";
import UserProjectsPage from "./UserProjectsPage";
import OverdueTasksPage from "./OverdueTasksPage";

// Ported from renderUserTab() in legacy/js/userDashboard.js.
export default function UserRoute() {
  const { accountId, tab } = useParams();
  const { resolveUser } = useAppState();
  const user = resolveUser(decodeURIComponent(accountId));

  switch (tab) {
    case "assignedProjects":
      return <UserProjectsPage user={user} />;
    case "ownerProjects":
      return <UserProjectsPage user={user} owner />;
    case "alarm":
      return <OverdueTasksPage user={user} />;
    case "todos":
    default:
      return <UserTasksPage user={user} />;
  }
}
