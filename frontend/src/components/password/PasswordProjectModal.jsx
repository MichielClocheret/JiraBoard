import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { savePasswordProject } from "../../api/password";

const ENTRY_TYPES = [
  { id: "login", label: "Login" },
  { id: "licence", label: "Licence" },
];

// Ported from pmOpenModal()/the add-password-project-form submit handler in
// legacy/features/password/password.js.
// Parent renders this with `key={project?.id ?? 'create'}` so switching
// between "add" and "edit X" (or between two different X's) remounts the
// form with fresh initial state instead of needing an effect to reset it.
export default function PasswordProjectModal({ project, onClose, onSaved, onRequestDelete }) {
  const isEdit = !!project;
  const [name, setName] = useState(() => String(project?.projectName || "").trim());
  const [entryType, setEntryType] = useState(() => String(project?.entryType || "").trim());
  const [username, setUsername] = useState(() => String(project?.loginUsername || "").trim());
  const [password, setPassword] = useState(() => String(project?.loginPassword || "").trim());
  const [licence, setLicence] = useState(() => String(project?.licenceKey || "").trim());
  const [feedback, setFeedback] = useState(null); // { type, message } | null
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: savePasswordProject,
    onSuccess: (payload) => {
      if (!payload?.success) {
        setFeedback({ type: "error", message: payload?.message || "Unable to save." });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["passwordProjects"] });
      onSaved(payload);
    },
    onError: (err) => setFeedback({ type: "error", message: err?.message || "Unable to save." }),
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFeedback({ type: "error", message: "Please enter a project name." });
      return;
    }
    if (!entryType) {
      setFeedback({ type: "error", message: "Please choose login or licence." });
      return;
    }
    if (entryType === "login" && !username.trim() && !password.trim()) {
      setFeedback({ type: "error", message: "Please fill in a username or password." });
      return;
    }
    if (entryType === "licence" && !licence.trim()) {
      setFeedback({ type: "error", message: "Please fill in the licence key." });
      return;
    }

    setFeedback({ type: "success", message: "Saving…" });
    const data = {
      action: isEdit ? "update" : "create",
      projectName: trimmedName,
      entryType,
      loginUsername: username.trim(),
      loginPassword: password.trim(),
      licenceKey: licence.trim(),
    };
    if (isEdit) data.id = project.id;
    mutation.mutate(data);
  };

  return (
    <>
      <div className="finder-backdrop is-open" onClick={onClose} />
      <div className="finder-modal is-open" role="dialog" aria-modal="true">
        <div className="modal-card form-modal-card">
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
          <div className="modal-header">
            <div className="modal-title">{isEdit ? "Edit Password Project" : "Add Password Project"}</div>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label className="form-field-label" htmlFor="pw-project-name">
                  Project name
                </label>
                <input
                  id="pw-project-name"
                  type="text"
                  className="form-input"
                  maxLength={190}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                />
              </div>

              <div className="form-field">
                <span className="form-field-label">What do you want to save?</span>
                <div className="pill-filter">
                  {ENTRY_TYPES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className={`pill-filter__btn ${entryType === id ? "is-active" : ""}`}
                      onClick={() => setEntryType(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {entryType === "login" && (
                <div className="form-field form-row">
                  <div>
                    <label className="form-field-label" htmlFor="pw-username">
                      Username
                    </label>
                    <input id="pw-username" type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-field-label" htmlFor="pw-password">
                      Password
                    </label>
                    <input id="pw-password" type="text" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
              )}

              {entryType === "licence" && (
                <div className="form-field">
                  <label className="form-field-label" htmlFor="pw-licence">
                    Licence key
                  </label>
                  <textarea id="pw-licence" className="form-textarea" value={licence} onChange={(e) => setLicence(e.target.value)} />
                </div>
              )}

              <div className="form-actions form-actions--spread">
                {isEdit ? (
                  <button type="button" className="btn btn--danger" onClick={() => onRequestDelete(project)}>
                    Delete
                  </button>
                ) : (
                  <span />
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn--secondary" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={mutation.isPending}>
                    {isEdit ? "Save changes" : "Save"}
                  </button>
                </div>
              </div>
            </form>
            {feedback && <div className={`form-feedback form-feedback--${feedback.type}`}>{feedback.message}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
