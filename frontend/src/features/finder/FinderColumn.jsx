import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFolder } from "../../api/finder";
import { formatBytes, getFileIcon } from "../../lib/finderFormat";

function FinderFileItem({ file, isSelected, onToggle, onOpenAction }) {
  const clickCountRef = useRef(0);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = () => {
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      timerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        onToggle();
      }, 250);
    } else {
      clearTimeout(timerRef.current);
      clickCountRef.current = 0;
      onOpenAction();
    }
  };

  return (
    <div className={`finder-item finder-item--file ${isSelected ? "is-selected" : ""}`} onClick={handleClick}>
      <span className="finder-item-icon">{getFileIcon(file.ext)}</span>
      <span className="finder-item-name">{file.name}</span>
      <span className="finder-item-size">{formatBytes(file.size)}</span>
      <span className="finder-check">✓</span>
    </div>
  );
}

function FinderFolderItem({ folder, isActive, isSelected, onClick }) {
  return (
    <div
      className={`finder-item finder-item--folder ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""}`}
      onClick={onClick}
    >
      <span className="finder-item-icon">📁</span>
      <span className="finder-item-name">{folder.name}</span>
      <span className="finder-item-chevron">›</span>
    </div>
  );
}

// One column of the macOS-Finder-style browser. Ported from addColumn() in
// legacy/features/finder/finder.js, but driven by React Query instead of a
// hand-rolled fetch/race-condition guard.
export default function FinderColumn({ path, depth, selectionMode, selectedFiles, selectedFolder, activeChildPath, onDrill, onToggleFile, onOpenFileAction }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["finderFolder", path],
    queryFn: () => fetchFolder(path),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="finder-column">
        <div className="finder-col-status">Loading…</div>
      </div>
    );
  }

  if (isError || !data?.ok) {
    return (
      <div className="finder-column">
        <div className="finder-col-status finder-col-error">Error: {data?.error || error?.message || "Unknown error"}</div>
      </div>
    );
  }

  const folders = data.folders || [];
  const files = data.files || [];

  if (!folders.length && !files.length) {
    return (
      <div className="finder-column">
        <div className="finder-col-status">Empty folder</div>
      </div>
    );
  }

  return (
    <div className="finder-column">
      {folders.map((folder) => (
        <FinderFolderItem
          key={folder.path}
          folder={folder}
          isActive={activeChildPath === folder.path}
          isSelected={selectionMode === "folder" && selectedFolder?.path === folder.path}
          onClick={() => onDrill(depth, folder)}
        />
      ))}
      {folders.length > 0 && files.length > 0 && <div className="finder-col-divider" />}
      {files.map((file) => (
        <FinderFileItem
          key={file.path}
          file={file}
          isSelected={!!selectedFiles[file.path]}
          onToggle={() => onToggleFile(depth, file)}
          onOpenAction={() => onOpenFileAction(file)}
        />
      ))}
    </div>
  );
}
