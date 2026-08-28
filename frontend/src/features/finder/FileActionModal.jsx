import { useEffect } from "react";
import { getDownloadUrl } from "../../api/finder";
import { FILE_BRIDGE_DMG_URL } from "./nativeApp";

// Ported from ensureFileActionModal() in legacy/features/finder/finder.js —
// shown on double-clicking a file (in the picker or a chat attachment chip).
export default function FileActionModal({ file, onClose, onOpenFileBridgePath }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fileName = String(file.name || file.path || "File");
  const filePath = String(file.path || "");

  return (
    <>
      <div className="finder-backdrop is-open" onClick={onClose} />
      <div className="finder-modal is-open" role="dialog" aria-modal="true">
        <div className="modal-card chat-file-action-modal-card">
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
          <div className="modal-header">
            <div className="modal-title" style={{ wordBreak: "break-word" }}>{fileName}</div>
          </div>
          <div className="chat-file-action-buttons">
            <a
              className="online-finder-btn online-finder-btn--primary"
              href={getDownloadUrl(filePath)}
              download={fileName}
            >
              Download
            </a>
            <button
              type="button"
              className="online-finder-btn online-finder-btn--ghost"
              disabled={!filePath}
              onClick={() => onOpenFileBridgePath(filePath)}
            >
              Show in Finder
            </button>
          </div>
          <div className="chat-file-action-footer">
            <span className="chat-file-action-footer-text">
              Need the app?{" "}
              <a href={FILE_BRIDGE_DMG_URL} download className="chat-file-action-footer-link">
                Download VeauFinder
              </a>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
