import { useState } from "react";
import { useTaskModal } from "../../state/TaskModalContext";
import { isOverdue, sortIssues } from "../../lib/issues";

function IssueItem({ issue, showStatus, showAssignee }) {
  const { openIssue } = useTaskModal();
  const overdue = isOverdue(issue.duedate);

  return (
    <li
      className="issue-item"
      data-overdue={overdue ? "1" : undefined}
      onClick={() =>
        openIssue(issue.key, {
          projectKey: issue.projectKey || "",
          projectName: issue.projectName || "",
          summary: issue.summary || issue.key,
        })
      }
    >
      <div className="issue-body">
        <span className="issue-sum">{issue.summary}</span>
        <div className="issue-meta">
          {(issue.projectName || issue.projectKey) && (
            <span className="issue-key">{issue.projectName || issue.projectKey}</span>
          )}
          {showStatus && issue.statusCategory && (
            <span className={`badge ${issue.statusCategory === "In Progress" ? "badge--progress" : "badge--todo"}`}>
              {issue.statusCategory}
            </span>
          )}
          {issue.duedate && <span className="badge badge--muted">Due: {issue.duedate}</span>}
          {(issue.commentCount ?? 0) > 0 && <span className="badge badge--feedback">Feedback</span>}
        </div>
        {showAssignee && issue.assigneeName && (
          <div className="issue-assignee-row">
            <span className="badge badge--muted">{issue.assigneeName}</span>
          </div>
        )}
      </div>
      {overdue && <span className="badge badge--overdue badge-overdue-corner">Overdue</span>}
    </li>
  );
}

export default function IssueColumn({
  title,
  dotClass,
  issues,
  showStatus = false,
  showAssignee = false,
  defaultOpen = false,
  extraClass = "",
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sorted = sortIssues(issues || []);

  return (
    <div className={`issues-col ${open ? "" : "is-collapsed"} ${extraClass}`.trim()}>
      <div className="issues-col-header" onClick={() => setOpen((o) => !o)}>
        <span className={`col-dot ${dotClass}`} />
        <span>{title}</span>
        <span className="column-toggle-indicator">{open ? "▾" : "▸"}</span>
        <span className="col-count">{sorted.length}</span>
      </div>
      <ul className="issue-list">
        {sorted.length === 0 ? (
          <li className="issue-empty">No issues</li>
        ) : (
          sorted.map((issue) => (
            <IssueItem key={issue.key} issue={issue} showStatus={showStatus} showAssignee={showAssignee} />
          ))
        )}
      </ul>
    </div>
  );
}
