import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { deleteDevProject, fetchDevProjects } from "../../api/devTracker";
import { useAppState } from "../../state/AppStateContext";
import { usePageHeader } from "../../state/PageHeaderContext";
import ProjectListView from "./ProjectListView";
import ProjectDetailView from "./ProjectDetailView";
import ProjectModal from "./ProjectModal";
import ConfirmDeleteModal from "../shared/ConfirmDeleteModal";

// Ported from legacy/features/veaudev/veaudev.js — the #project/<name>
// hash-routing (getRouteProjectName/setRouteProjectName/vdSyncViewWithRoute)
// is now a plain route param (/dev-tracker/:projectName).
export default function DevTrackerPage() {
  const { projectName } = useParams();
  const navigate = useNavigate();
  const { availableUsers } = useAppState();
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', project }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["devProjects"],
    queryFn: fetchDevProjects,
  });

  const projects = data?.success ? data.projects || [] : [];
  const loadError = isError || (data && !data.success) ? data?.message || "Unable to load projects." : "";

  const decodedName = projectName ? decodeURIComponent(projectName).trim().toLowerCase() : "";
  const selected = decodedName ? projects.find((p) => String(p?.projectName || "").trim().toLowerCase() === decodedName) : null;

  useEffect(() => {
    if (decodedName && !isLoading && !loadError && projects.length && !selected) {
      navigate("/dev-tracker", { replace: true });
    }
  }, [decodedName, isLoading, loadError, projects.length, selected, navigate]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteDevProject(deleteTarget.id),
    onSuccess: (payload) => {
      if (!payload?.success) {
        window.alert(payload?.message || "Unable to delete project.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["devProjects"] });
      setDeleteTarget(null);
      navigate("/dev-tracker", { replace: true });
    },
    onError: (err) => window.alert(err?.message || "Unable to delete project."),
  });

  usePageHeader(selected ? selected.projectName : "Dev Tracker", {
    actions: selected ? (
      <>
        <button type="button" className="third-btn" onClick={() => navigate("/dev-tracker")}>
          Go back
        </button>
        <button type="button" className="third-btn" onClick={() => setModalState({ mode: "edit", project: selected })}>
          ✏️ Edit
        </button>
      </>
    ) : null,
  });

  return (
    <div>
      {selected ? (
        <ProjectDetailView project={selected} availableUsers={availableUsers} onRequestDelete={setDeleteTarget} />
      ) : (
        <ProjectListView
          projects={projects}
          isLoading={isLoading}
          loadError={loadError}
          onSelect={(p) => navigate(`/dev-tracker/${encodeURIComponent(p.projectName)}`)}
          onAdd={() => setModalState({ mode: "create" })}
        />
      )}

      {modalState && (
        <ProjectModal
          key={modalState.mode === "edit" ? modalState.project.id : "create"}
          project={modalState.mode === "edit" ? modalState.project : null}
          onClose={() => setModalState(null)}
          onSaved={() => setModalState(null)}
        />
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete project"
        text={`Are you sure you want to delete "${deleteTarget?.projectName || "this project"}"? This will also delete all tasks for this project.`}
        confirmLabel="Delete project"
        pending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
