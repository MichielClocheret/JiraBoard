import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllProjects } from "../../api/jira";
import { usePageHeader } from "../../state/PageHeaderContext";
import ProjectsGrid from "../shared/ProjectsGrid";
import ProjectBoard from "../shared/ProjectBoard";

export default function AllProjectsPage() {
  const [selected, setSelected] = useState(null); // { key, name } | null
  usePageHeader(selected ? selected.name : "All Projects");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["allProjects"],
    queryFn: fetchAllProjects,
    staleTime: 5 * 60 * 1000,
  });

  if (selected) {
    return <ProjectBoard projectKey={selected.key} projectName={selected.name} onBack={() => setSelected(null)} />;
  }

  if (isLoading) return <p className="spinner-text">Loading all projects…</p>;
  if (isError || !data?.ok) return <p className="error-text">Could not load projects.</p>;

  return (
    <ProjectsGrid
      titleText="All Projects"
      projects={data.projects || {}}
      onSelectProject={(key, name) => setSelected({ key, name })}
    />
  );
}
