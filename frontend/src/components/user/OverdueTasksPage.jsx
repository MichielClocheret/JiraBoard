import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUserOverdue } from "../../api/jira";
import { usePageHeader } from "../../state/PageHeaderContext";
import { groupByProject } from "../../lib/issues";
import IssueColumn from "../shared/IssueColumn";

// Ported from renderAlarm()/renderAlarmProjectList()/renderAlarmDetails()
// in legacy/js/userDashboard.js.
export default function OverdueTasksPage({ user }) {
  const [group, setGroup] = useState(null);
  usePageHeader("Overdue Tasks", { avatarUser: user });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["userOverdue", user.accountId],
    queryFn: () => fetchUserOverdue(user.accountId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p className="spinner-text">Loading overdue tasks…</p>;
  if (isError || !data?.ok) return <p className="error-text">Could not load overdue tasks.</p>;

  const groups = groupByProject(data.issues || []);

  if (group) {
    return (
      <div className="section">
        <div style={{ marginBottom: 14 }}>
          <a href="#" className="refresh-btn" onClick={(e) => { e.preventDefault(); setGroup(null); }}>
            ← Back
          </a>
        </div>
        <IssueColumn title="Overdue tasks" dotClass="dot-alarm" issues={group.items} defaultOpen extraClass="alarm-open" />
      </div>
    );
  }

  return (
    <div className="section">
      <div className="issues-col" style={{ maxWidth: 820 }}>
        <div className="issues-col-header alarm-header">
          <span className="col-dot dot-alarm" />
          <span>Overdue projects</span>
        </div>
        <ul className="issue-list">
          {!groups.length ? (
            <li className="alarm-empty">✅ No overdue tasks — all clear!</li>
          ) : (
            groups.map((g) => (
              <li key={g.projectKey} className="issue-item alarm-project-card" onClick={() => setGroup(g)}>
                <div className="issue-body">
                  <span className="issue-sum">{g.projectName}</span>
                </div>
                <span className="alarm-task-count">{g.items.length}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
