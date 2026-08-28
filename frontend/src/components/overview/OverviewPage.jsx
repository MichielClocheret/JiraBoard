import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOverview, fetchUserToday } from "../../api/jira";
import { usePageHeader } from "../../state/PageHeaderContext";
import { useAppState } from "../../state/AppStateContext";
import IssueColumn from "../shared/IssueColumn";
import Avatar from "../ui/Avatar";
import StatusChart from "./StatusChart";

function OverviewUserCard({ user, isActive, onClick }) {
  return (
    <button type="button" className={`overview-user-card ${isActive ? "is-active" : ""}`} onClick={onClick}>
      <Avatar user={user} className="overview-avatar" />
      <div className="overview-user-meta">
        <div className="overview-user-name">{user.displayName || "Unknown"}</div>
        <div className="overview-counts">
          <span className="overview-count-badge overview-count-todo">{user.todo ?? 0} To Do</span>
          <span className="overview-count-badge overview-count-progress">{user.progress ?? 0} In Progress</span>
        </div>
      </div>
    </button>
  );
}

function UserTodayDetails({ user }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["userToday", user.accountId],
    queryFn: () => fetchUserToday(user.accountId),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="section overview-details-section">
      <div className="section-header-row">
        <h2 className="section-title">{user.displayName || "User"}</h2>
      </div>
      {isLoading ? (
        <p className="issue-empty" style={{ padding: "24px 0" }}>Loading…</p>
      ) : isError || !data?.ok ? (
        <p className="issue-empty" style={{ color: "var(--overdue-color)", padding: "24px 0" }}>Failed to load.</p>
      ) : (
        <div className="issues-columns issues-columns--2">
          <IssueColumn title="To Do" dotClass="dot-todo" issues={data.todo || []} defaultOpen />
          <IssueColumn title="In Progress" dotClass="dot-progress" issues={data.progress || []} defaultOpen />
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  usePageHeader("Overview");
  const { availableUsers } = useAppState();
  const [activeUserId, setActiveUserId] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["overview"],
    queryFn: fetchOverview,
    staleTime: 5 * 60 * 1000,
  });

  const userMap = useMemo(() => {
    const map = {};
    (availableUsers || []).forEach((u) => { map[u.accountId] = u; });
    return map;
  }, [availableUsers]);

  if (isLoading) return <p className="spinner-text">Loading team overview…</p>;
  if (isError || !data?.ok) return <p className="error-text">Could not load overview.</p>;

  const users = data.users || [];
  const allTasks = data.allTasks || { todo: [], progress: [] };
  const chartData = data.chartData || [];
  const everyone = data.everyone || { todo: [], progress: [], feedback: [] };
  const overdue = data.overdue || [];
  const monthName = new Date().toLocaleString(undefined, { month: "long" });
  const activeUser = users.find((u) => u.accountId === activeUserId);

  return (
    <div>
      <div className="section">
        <div className="section-header-row">
          <h2 className="section-title">Counted Tasks From {monthName}</h2>
          <h2 className="section-title">All Tasks For Today</h2>
        </div>
        <div className="overview-top-row">
          <div className="overview-chart-wrap">
            <StatusChart chartData={chartData} />
          </div>
          <div className="overview-today-side">
            <div className="issues-columns issues-columns--2">
              <IssueColumn title="To Do" dotClass="dot-todo" issues={allTasks.todo} showAssignee defaultOpen />
              <IssueColumn title="In Progress" dotClass="dot-progress" issues={allTasks.progress} showAssignee defaultOpen />
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header-row">
          <h2 className="section-title">Today&apos;s Tasks</h2>
        </div>
        {!users.length ? (
          <div className="overview-empty">No active tasks found.</div>
        ) : (
          <div className="overview-grid">
            {users.map((u) => {
              const full = userMap[u.accountId] ? { ...u, ...userMap[u.accountId] } : u;
              return (
                <OverviewUserCard
                  key={u.accountId}
                  user={full}
                  isActive={activeUserId === u.accountId}
                  onClick={() => setActiveUserId((cur) => (cur === u.accountId ? "" : u.accountId))}
                />
              );
            })}
          </div>
        )}
        {activeUser && <UserTodayDetails user={userMap[activeUser.accountId] ? { ...activeUser, ...userMap[activeUser.accountId] } : activeUser} />}
      </div>

      <div className="section">
        <div className="section-header-row">
          <h2 className="section-title">All Project&apos;s Tasks (Everyone)</h2>
        </div>
        <div className="issues-columns">
          <IssueColumn title="To Do" dotClass="dot-todo" issues={everyone.todo} showAssignee />
          <IssueColumn title="In Progress" dotClass="dot-progress" issues={everyone.progress} showAssignee />
          <IssueColumn title="Feedback" dotClass="dot-feedback" issues={everyone.feedback} showAssignee />
        </div>
      </div>

      <div className="section">
        <div className="issues-columns issues-columns--full">
          <IssueColumn title="Overdue" dotClass="dot-alarm" issues={overdue} showAssignee />
        </div>
      </div>
    </div>
  );
}
