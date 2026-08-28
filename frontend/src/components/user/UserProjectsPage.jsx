import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUserOwnerProjects, fetchUserProjects } from "../../api/jira";
import { usePageHeader } from "../../state/PageHeaderContext";
import ProjectsGrid from "../shared/ProjectsGrid";
import ProjectBoard from "../shared/ProjectBoard";

// Ported from renderAssignedProjects()/renderOwnerProjects() in
// legacy/js/userDashboard.js. `owner` toggles between the two endpoints;
// only the assigned-projects drill-in scopes issues to the user (matches
// the original's asymmetry: owner-of-projects shows the whole project).
export default function UserProjectsPage({ user, owner = false }) {
  const [selected, setSelected] = useState(null); // { key, name } | null
  const title = owner ? "Owner Of Projects" : "Assigned Projects";
  usePageHeader(selected ? selected.name : title, { avatarUser: user });

  const { data, isLoading, isError } = useQuery({
    queryKey: [owner ? "userOwnerProjects" : "userProjects", user.accountId],
    queryFn: () => (owner ? fetchUserOwnerProjects(user.accountId) : fetchUserProjects(user.accountId)),
    staleTime: 5 * 60 * 1000,
  });

  if (selected) {
    return (
      <ProjectBoard
        projectKey={selected.key}
        projectName={selected.name}
        userId={owner ? undefined : user.accountId}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (isLoading) return <p className="spinner-text">Loading {owner ? "owned" : ""} projects…</p>;
  if (isError || !data?.ok) return <p className="error-text">Could not load projects.</p>;

  return (
    <ProjectsGrid
      titleText={title}
      showSectionTitle={false}
      projects={data.projects || {}}
      onSelectProject={(key, name) => setSelected({ key, name })}
    />
  );
}
