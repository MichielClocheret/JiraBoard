import { useEffect, useRef, useState } from "react";
import FinderColumn from "./FinderColumn";
import { getFileIcon } from "../../lib/finderFormat";

// Ported from EnsureFinderModal()/addColumn() in legacy/features/finder/finder.js.
export default function OnlineFinderModal({ mode, onResolve, onOpenFileAction }) {
  const [pathStack, setPathStack] = useState([""]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [selectedFolder, setSelectedFolder] = useState(null);
  const columnsRef = useRef(null);

  useEffect(() => {
    const el = columnsRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [pathStack.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onResolve(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onResolve]);

  const drillInto = (depth, folder) => {
    setPathStack((prev) => [...prev.slice(0, depth + 1), folder.path]);
    if (mode === "folder") setSelectedFolder(folder);
  };

  const toggleFile = (depth, file) => {
    setPathStack((prev) => prev.slice(0, depth + 1));
    setSelectedFiles((prev) => {
      const next = { ...prev };
      if (next[file.path]) delete next[file.path];
      else next[file.path] = file;
      return next;
    });
  };

  const removeSelection = (path) => {
    setSelectedFiles((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setSelectedFolder((f) => (f && f.path === path ? null : f));
  };

  const clearSelection = () => {
    setSelectedFiles({});
    setSelectedFolder(null);
  };

  const items = mode === "folder" ? (selectedFolder ? [selectedFolder] : []) : Object.values(selectedFiles);

  const confirm = () => {
    onResolve({
      files: Object.values(selectedFiles),
      folders: selectedFolder ? [selectedFolder] : [],
      selectionMode: mode,
    });
  };

  return (
    <>
      <div className="finder-backdrop is-open" onClick={() => onResolve(null)} />
      <div className="finder-modal is-open" role="dialog" aria-modal="true">
        <div className="modal-card chats-modal-card online-finder-card">
          <button className="modal-close" type="button" aria-label="Close" onClick={() => onResolve(null)}>
            ×
          </button>
          <div className="modal-header">
            <div className="modal-title">Online Finder</div>
          </div>
          <div className="modal-body" style={{ padding: 0, overflow: "hidden" }}>
            <div className="online-finder-columns" ref={columnsRef}>
              {pathStack.map((path, depth) => (
                <FinderColumn
                  key={`${depth}:${path}`}
                  path={path}
                  depth={depth}
                  selectionMode={mode}
                  selectedFiles={selectedFiles}
                  selectedFolder={selectedFolder}
                  activeChildPath={pathStack[depth + 1]}
                  onDrill={drillInto}
                  onToggleFile={toggleFile}
                  onOpenFileAction={onOpenFileAction}
                />
              ))}
            </div>

            <div className={`online-finder-footer ${items.length ? "is-visible" : ""}`}>
              <div className="online-finder-footer-files">
                {items.map((item) => (
                  <span key={item.path} className="online-finder-footer-tag" title={item.name}>
                    {item.type === "folder" ? "📁" : getFileIcon(item.ext)} {item.name}
                    <button
                      type="button"
                      className="online-finder-footer-tag-remove"
                      aria-label="Remove"
                      onClick={() => removeSelection(item.path)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="online-finder-footer-actions">
                <button type="button" className="online-finder-btn online-finder-btn--ghost" onClick={clearSelection}>
                  Deselect all
                </button>
                <button type="button" className="online-finder-btn online-finder-btn--primary" onClick={confirm} disabled={!items.length}>
                  {mode === "folder" ? "Attach folder" : "Attach"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
