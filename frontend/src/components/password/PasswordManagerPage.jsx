import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePasswordProject, fetchPasswordProjects } from "../../api/password";
import { usePageHeader } from "../../state/PageHeaderContext";
import { entryTypeName } from "../../lib/passwordFormat";
import PasswordProjectList from "./PasswordProjectList";
import PasswordProjectDetail from "./PasswordProjectDetail";
import PasswordProjectModal from "./PasswordProjectModal";
import ConfirmDeleteModal from "../shared/ConfirmDeleteModal";

// Ported from legacy/features/password/password.js.
export default function PasswordManagerPage() {
  const [selectedId, setSelectedId] = useState(0);
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', project }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["passwordProjects"],
    queryFn: fetchPasswordProjects,
  });

  const projects = data?.success ? data.projects || [] : [];
  const selected = projects.find((p) => Number(p.id) === selectedId) || null;

  const deleteMutation = useMutation({
    mutationFn: () => deletePasswordProject(deleteTarget.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwordProjects"] });
      setDeleteTarget(null);
      setSelectedId(0);
    },
  });

  usePageHeader(selected ? selected.projectName : "Password Manager", {
    subtitle: selected ? entryTypeName(selected.entryType) : "",
    actions: selected ? (
      <>
        <button type="button" className="third-btn" onClick={() => setSelectedId(0)}>
          Go back
        </button>
        <button type="button" className="third-btn" onClick={() => setModalState({ mode: "edit", project: selected })}>
          ✏️ Edit
        </button>
      </>
    ) : null,
  });

  const loadError = isError || !data?.success ? data?.message || "Unable to load password projects." : "";

  return (
    <div>
      {selected ? (
        <PasswordProjectDetail project={selected} />
      ) : (
        <PasswordProjectList
          projects={projects}
          isLoading={isLoading}
          loadError={loadError}
          onSelect={(p) => setSelectedId(Number(p.id))}
          onAdd={() => setModalState({ mode: "create" })}
        />
      )}

      {modalState && (
        <PasswordProjectModal
          key={modalState.mode === "edit" ? modalState.project.id : "create"}
          project={modalState.mode === "edit" ? modalState.project : null}
          onClose={() => setModalState(null)}
          onSaved={(payload) => {
            if (modalState.mode === "create" && payload?.id) setSelectedId(Number(payload.id));
            setModalState(null);
          }}
          onRequestDelete={(project) => {
            setModalState(null);
            setDeleteTarget(project);
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete password"
        text={`Are you sure you want to delete "${deleteTarget?.projectName || "this password project"}"?`}
        confirmLabel="Delete password"
        pending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
