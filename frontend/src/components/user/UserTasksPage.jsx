import { useQuery } from "@tanstack/react-query";
import { fetchUserCalendar, fetchUserIssues } from "../../api/jira";
import { usePageHeader } from "../../state/PageHeaderContext";
import IssueColumn from "../shared/IssueColumn";
import UserCalendar from "./UserCalendar";

// Ported from renderUserTasks() in legacy/js/userDashboard.js.
export default function UserTasksPage({ user }) {
  usePageHeader(user.displayName || "User", { avatarUser: user });

  const issuesQuery = useQuery({
    queryKey: ["userIssues", user.accountId],
    queryFn: () => fetchUserIssues(user.accountId),
    staleTime: 5 * 60 * 1000,
  });
  const calendarQuery = useQuery({
    queryKey: ["userCalendar", user.accountId],
    queryFn: () => fetchUserCalendar(user.accountId),
    staleTime: 5 * 60 * 1000,
  });

  if (issuesQuery.isLoading) return <p className="spinner-text">Loading tasks…</p>;
  if (issuesQuery.isError || !issuesQuery.data?.ok) return <p className="error-text">Could not load tasks.</p>;

  const { noDueDateTodo = [], withDueDateTodo = [], progress = [], feedback = [], done = [] } = issuesQuery.data;
  const calEvents = calendarQuery.data?.ok ? calendarQuery.data.events || [] : [];

  return (
    <div>
      <UserCalendar events={calEvents} />

      <div className="section">
        <div className="section-header-row">
          <h2 className="section-title">Open Tasks</h2>
        </div>
        <div className="issues-columns">
          <IssueColumn title="No Due Date" dotClass="dot-todo" issues={noDueDateTodo} showStatus />
          <IssueColumn title="To Do" dotClass="dot-todo" issues={withDueDateTodo} />
          <IssueColumn title="In Progress" dotClass="dot-progress" issues={progress} />
        </div>
      </div>

      <div className="section">
        <div className="issues-columns">
          <IssueColumn title="Feedback" dotClass="dot-feedback" issues={feedback} extraClass="issues-col--span-2" />
          <IssueColumn title="Done (30d)" dotClass="dot-done" issues={done} />
        </div>
      </div>
    </div>
  );
}
