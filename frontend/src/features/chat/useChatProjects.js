import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllProjects } from "../../api/jira";
import { fetchPinnedProjects, pinProject } from "../../api/chat";

// Ported from chatLoadAllProjects() in legacy/features/chat/chat.js — merges
// Api/all-projects.php with chat.php's pinned set. Shares the ['allProjects']
// cache entry with AllProjectsPage, and the ['chatPinnedProjects'] entry with
// the sidebar's compact pinned list, so pinning here updates both instantly.
export function usePinnedProjects(enabled = true) {
  return useQuery({
    queryKey: ["chatPinnedProjects"],
    queryFn: fetchPinnedProjects,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useChatProjects() {
  const allProjectsQuery = useQuery({ queryKey: ["allProjects"], queryFn: fetchAllProjects, staleTime: 5 * 60 * 1000 });
  const pinnedQuery = usePinnedProjects();

  const projects = useMemo(() => {
    if (!allProjectsQuery.data?.ok) return [];
    const pinnedKeys = new Set(
      (pinnedQuery.data?.success ? pinnedQuery.data.projects : [])
        .map((item) => String(item?.projectKey || "").toUpperCase())
        .filter(Boolean)
    );
    const list = Object.entries(allProjectsQuery.data.projects || {}).map(([key, value]) => {
      const k = String(key || "").toUpperCase();
      return { key: k, name: String(value?.name || k), pinned: pinnedKeys.has(k) };
    });
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return String(a.name || a.key).localeCompare(String(b.name || b.key));
    });
    return list;
  }, [allProjectsQuery.data, pinnedQuery.data]);

  return {
    projects,
    isLoading: allProjectsQuery.isLoading || pinnedQuery.isLoading,
    isError: allProjectsQuery.isError || (allProjectsQuery.data && !allProjectsQuery.data.ok),
    errorMessage: allProjectsQuery.data && !allProjectsQuery.data.ok ? allProjectsQuery.data.error : "",
  };
}

export function useTogglePinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ project }) => pinProject(project.key, project.name, !project.pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatPinnedProjects"] });
    },
  });
}
