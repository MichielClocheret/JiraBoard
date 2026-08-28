import { useEffect } from "react";

// Reusable delete-confirm modal — the same pattern used by
// legacy/features/password/password.js and legacy/features/veaudev/veaudev.js
// for their respective "Delete project" flows.
export default function ConfirmDeleteModal({ open, title = "Delete", text, confirmLabel = "Delete", onCancel, onConfirm, pending = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="finder-backdrop is-open" onClick={onCancel} />
      <div className="finder-modal is-open" role="dialog" aria-modal="true">
        <div className="modal-card" style={{ width: "min(420px, 92vw)" }}>
          <button className="modal-close" type="button" aria-label="Close" onClick={onCancel}>
            ×
          </button>
          <div className="modal-header">
            <div className="modal-title">{title}</div>
          </div>
          <div className="modal-body">
            <p>{text}</p>
            <div className="form-actions">
              <button type="button" className="btn btn--secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" disabled={pending} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
