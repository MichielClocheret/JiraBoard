import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchIssue } from "../../api/jira";
import { useTaskModal } from "../../state/TaskModalContext";

export default function TaskModal() {
  const { state, closeIssue } = useTaskModal();
  const issueKey = state?.issueKey || null;
  const fallback = state?.fallback || {};
  const isOpen = !!issueKey;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["issue", issueKey],
    queryFn: () => fetchIssue(issueKey),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.ok ? data.feedback || [] : [];
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) setIndex(items.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueKey, items.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeIssue();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeIssue]);

  const projectTitle = data?.ok
    ? `${data.project?.name || fallback.projectName || "Project"} (${data.project?.key || fallback.projectKey || ""})`
    : `${fallback.projectName || "Project"}${fallback.projectKey ? ` (${fallback.projectKey})` : ""}`;

  const todoTitle = (data?.ok && data.summary) || fallback.summary || issueKey || "";

  let feedbackNode;
  if (!isOpen) {
    feedbackNode = null;
  } else if (isLoading) {
    feedbackNode = <div className="tm-feedback-text">Loading feedback…</div>;
  } else if (isError || !data?.ok) {
    feedbackNode = <div className="tm-feedback-text">Failed to load feedback.</div>;
  } else if (!items.length) {
    feedbackNode = <div className="tm-feedback-text">No feedback yet.</div>;
  } else {
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    const cur = items[clamped] || {};
    feedbackNode = (
      <>
        <div className="tm-feedback-meta">
          {items.length} comment{items.length === 1 ? "" : "s"} • {cur.author || "Unknown"} •{" "}
          {String(cur.created || "").slice(0, 10) || "Unknown date"}
        </div>
        <div className="tm-feedback-text">{cur.text || "(empty comment)"}</div>
        <div className="tm-feedback-nav">
          <button type="button" className="tm-feedback-arrow" disabled={clamped === 0} onClick={() => setIndex(clamped - 1)} aria-label="Previous feedback">
            ←
          </button>
          <span className="tm-feedback-pos">{clamped + 1} / {items.length}</span>
          <button type="button" className="tm-feedback-arrow" disabled={clamped === items.length - 1} onClick={() => setIndex(clamped + 1)} aria-label="Next feedback">
            →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`tm-backdrop ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen} onClick={closeIssue} />
      <div className={`tm-dialog ${isOpen ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!isOpen}>
        <div className="tm-card">
          <button className="tm-close" type="button" aria-label="Close" onClick={closeIssue}>
            ×
          </button>
          <div className="tm-header">
            <div className="tm-title">{projectTitle}</div>
            <div className="tm-subtitle">{issueKey}</div>
          </div>
          <div className="tm-body">
            <div className="tm-section">
              <div className="tm-label">TODO</div>
              <div className="tm-task-title">{todoTitle}</div>
            </div>
            <div className="tm-section tm-section--feedback">
              <div className="tm-label tm-label--feedback">FEEDBACK</div>
              {feedbackNode}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
