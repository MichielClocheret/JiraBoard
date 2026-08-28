import { useEffect } from "react";
import { FILE_BRIDGE_DMG_URL } from "./nativeApp";

// Ported from showInstallModal() in legacy/features/finder/finder.js.
export default function InstallPromptModal({ onClose, onDownloadClick }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="finder-backdrop is-open" onClick={onClose} />
      <div className="finder-modal is-open" role="dialog" aria-modal="true">
        <div className="modal-card">
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
          <div className="modal-header">
            <div className="modal-title">File Bridge not installed</div>
          </div>
          <div className="finder-install-body">
            <div className="finder-install-icon">📁</div>
            <p className="finder-install-intro">
              File Bridge opens files directly in Finder. It needs a small helper app called{" "}
              <strong>VeauFinder</strong> installed on your Mac.
            </p>
            <ol className="finder-install-steps">
              <li>Download and run the installer below.</li>
              <li>
                Open the app. If macOS blocks it, go to <strong>Settings → Privacy &amp; Security</strong> and click{" "}
                <strong>Open Anyway</strong>.
              </li>
              <li>Come back here — <em>Show in Finder</em> will now work.</li>
            </ol>
            <div className="finder-install-actions">
              <a
                className="online-finder-btn online-finder-btn--primary"
                href={FILE_BRIDGE_DMG_URL}
                download
                onClick={onDownloadClick}
              >
                ⬇ Download VeauFinder.dmg
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
