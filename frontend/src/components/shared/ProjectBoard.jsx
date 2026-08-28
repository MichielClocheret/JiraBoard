import { useQuery } from "@tanstack/react-query";
import { fetchProjectIssues } from "../../api/jira";
import { usePageHeader } from "../../state/PageHeaderContext";
import IssueColumn from "./IssueColumn";
import { isOverdue } from "../../lib/issues";

// Ported from renderProjectTasks() in legacy/js/userDashboard.js.
export default function ProjectBoard({ projectKey, projectName, userId, onBack }) {
  usePageHeader(projectName);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projectIssues", projectKey, userId || "all"],
    queryFn: () => fetchProjectIssues(projectKey, userId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p className="spinner-text">Loading project tasks…</p>;
  if (isError || !data?.ok) return <p className="error-text">Could not load project tasks.</p>;

  const todo = data.todo || [];
  const progress = data.progress || [];
  const feedback = data.feedback || [];
  const done = data.done || [];
  const overdue = [...todo, ...progress, ...feedback].filter((it) => isOverdue(it.duedate));

  return (
    <div>
      {onBack && (
        <div style={{ marginBottom: 14 }}>
          <a href="#" className="refresh-btn" onClick={(e) => { e.preventDefault(); onBack(); }}>
            ← Back to projects
          </a>
        </div>
      )}

      <div className="section">
        <div className="section-header-row">
          <h2 className="section-title">{projectName}</h2>
        </div>
        <div className="issues-columns">
          <IssueColumn title="To Do" dotClass="dot-todo" issues={todo} showAssignee />
          <IssueColumn title="In Progress" dotClass="dot-progress" issues={progress} showAssignee />
          <IssueColumn title="Feedback" dotClass="dot-feedback" issues={feedback} showAssignee />
        </div>
        <div className="issues-columns" style={{ marginTop: 14 }}>
          <IssueColumn title="Done (30d)" dotClass="dot-done" issues={done} showAssignee />
          <IssueColumn title="Overdue" dotClass="dot-alarm" issues={overdue} showAssignee />
        </div>
      </div>
    </div>
  );
}
