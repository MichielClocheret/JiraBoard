import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask, deleteTask, updateTask } from "../../api/devTracker";
import AssigneePicker from "./AssigneePicker";

const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

// Ported from vdOpenTaskModal()/vdOpenCreateTaskModal()/the
// dev-task-form submit handler in legacy/features/veaudev/veaudev.js.
// Parent renders this with `key={task?.id ?? 'create'}` so switching between
// tasks remounts with fresh initial state.
export default function TaskModal({ task, projectId, availableUsers, onClose, onSaved }) {
  const isEdit = !!task;
  const [name, setName] = useState(() => String(task?.text || ""));
  const [notes, setNotes] = useState(() => String(task?.notes || ""));
  const [assigneeId, setAssigneeId] = useState(() => String(task?.assigneeAccountId || ""));
  const [assigneeName, setAssigneeName] = useState(() => String(task?.assigneeName || ""));
  const [priority, setPriority] = useState(() => String(task?.priority || "medium").toLowerCase());
  const [feedback, setFeedback] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: (data) => (isEdit ? updateTask(data) : createTask(data)),
    onSuccess: (payload) => {
      if (!payload?.success) {
        setFeedback({ type: "error", message: payload?.message || "Unable to save task." });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["devTasks", projectId] });
      onSaved();
    },
    onError: (err) => setFeedback({ type: "error", message: err?.message || "Unable to save task." }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: (payload) => {
      if (!payload?.success) {
        setFeedback({ type: "error", message: payload?.message || "Unable to delete task." });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["devTasks", projectId] });
      onSaved();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFeedback({ type: "error", message: "Task name is required." });
      return;
    }
    setFeedback({ type: "success", message: "Saving task…" });
    const data = isEdit
      ? { taskId: task.id, taskName: trimmed, taskNotes: notes.trim(), assigneeAccountId: assigneeId, assigneeName: assigneeId ? assigneeName : "", priority }
      : { projectId, taskName: trimmed, taskNotes: notes.trim(), assigneeAccountId: assigneeId, assigneeName: assigneeId ? assigneeName : "", priority };
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
            <div className="modal-title">{isEdit ? task.text || "Task" : "New Task"}</div>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label className="form-field-label" htmlFor="vd-task-name">
                  Task name
                </label>
                <input id="vd-task-name" type="text" className="form-input" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="form-field">
                <span className="form-field-label">Assign to</span>
                <AssigneePicker
                  users={availableUsers}
                  value={assigneeId}
                  onChange={(u) => {
                    setAssigneeId(u.accountId);
                    setAssigneeName(u.displayName || "");
                  }}
                />
              </div>

              <div className="form-field">
                <span className="form-field-label">Priority</span>
                <div className="chip-group">
                  {PRIORITIES.map(({ id, label }) => (
                    <button key={id} type="button" className={`chip-btn ${priority === id ? "is-selected" : ""}`} onClick={() => setPriority(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label className="form-field-label" htmlFor="vd-task-notes">
                  Notes
                </label>
                <textarea id="vd-task-notes" className="form-textarea dev-task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="form-actions form-actions--spread">
                {isEdit && task.isCustom ? (
                  <button type="button" className="btn btn--danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                    Delete task
                  </button>
                ) : (
                  <span />
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn--secondary" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={mutation.isPending}>
                    {isEdit ? "Save task" : "Create task"}
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
