import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchDevTasks, saveTaskDoneState } from "../../api/devTracker";
import TaskColumn from "./TaskColumn";
import TaskModal from "./TaskModal";

const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

// Ported from vdRenderBuildTasks() + the drag-and-drop listeners in
// legacy/features/veaudev/veaudev.js.
export default function TaskBoard({ projectId, availableUsers }) {
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', task }
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["devTasks", projectId],
    queryFn: () => fetchDevTasks(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (!assigneeMenuOpen && !priorityMenuOpen) return;
    const onDocClick = (e) => {
      if (e.target.closest(".dev-task-actions")) return;
      setAssigneeMenuOpen(false);
      setPriorityMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [assigneeMenuOpen, priorityMenuOpen]);

  const doneStateMutation = useMutation({
    mutationFn: ({ taskId, isDone }) => saveTaskDoneState(taskId, isDone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devTasks", projectId] }),
  });

  const { pendingDefault, pendingCustom, done, allTasks } = useMemo(() => {
    const matchesAssignee = (t) => !assigneeFilter || String(t?.assigneeAccountId || "").toLowerCase() === assigneeFilter.toLowerCase();
    const matchesPriority = (t) => !priorityFilter || String(t?.priority || "medium").toLowerCase() === priorityFilter;

    const defTasks = (data?.defaultTasks || []).filter((t) => matchesAssignee(t) && matchesPriority(t));
    const custTasks = (data?.customTasks || []).filter((t) => matchesAssignee(t) && matchesPriority(t));
    const all = [...(data?.defaultTasks || []), ...(data?.customTasks || [])];

    return {
      pendingDefault: defTasks.filter((t) => !t?.isDone),
      pendingCustom: custTasks.filter((t) => !t?.isDone),
      done: [...defTasks.filter((t) => t?.isDone), ...custTasks.filter((t) => t?.isDone)],
      allTasks: all,
    };
  }, [data, assigneeFilter, priorityFilter]);

  const assigneeOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ accountId: "", displayName: "All" }];
    availableUsers
      .slice()
      .sort((a, b) => String(a.displayName || "").localeCompare(String(b.displayName || "")))
      .forEach((u) => {
        const id = String(u.accountId || "").trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        opts.push({ accountId: id, displayName: u.displayName });
      });
    return opts;
  }, [availableUsers]);

  const handleDropTask = (taskId, targetKind, targetIsDone) => {
    setDraggingId(null);
    const task = allTasks.find((t) => Number(t?.id || 0) === taskId);
    if (!task) return;
    const taskKind = task.isCustom ? "custom" : "default";
    if (!targetIsDone && targetKind !== taskKind) return; // wrong pending column
    if (Boolean(task.isDone) === targetIsDone) return; // no-op
    doneStateMutation.mutate({ taskId, isDone: targetIsDone });
  };

  if (isLoading) return <p className="spinner-text">Loading tasks…</p>;

  const assigneeLabel = assigneeFilter ? assigneeOptions.find((u) => u.accountId === assigneeFilter)?.displayName || "All" : "All";
  const priorityLabel = priorityFilter ? PRIORITY_LABELS[priorityFilter] || "All" : "All";

  return (
    <div className="dev-tasks-card">
      <div className="dev-tasks-header-main">
        <h3 className="dev-tasks-title-main">Tasks</h3>
        <div className="dev-task-actions">
          <div style={{ position: "relative" }}>
            <button type="button" className="third-btn" onClick={() => setAssigneeMenuOpen((o) => !o)}>
              Assigned to: {assigneeLabel}
            </button>
            {assigneeMenuOpen && (
              <div className="dev-filter-menu">
                {assigneeOptions.map((u) => (
                  <button
                    key={u.accountId || "all"}
                    type="button"
                    className="dev-filter-menu-option"
                    onClick={() => {
                      setAssigneeFilter(u.accountId);
                      setAssigneeMenuOpen(false);
                    }}
                  >
                    {u.displayName || "All"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button type="button" className="third-btn" onClick={() => setPriorityMenuOpen((o) => !o)}>
              Priority: {priorityLabel}
            </button>
            {priorityMenuOpen && (
              <div className="dev-filter-menu">
                <button type="button" className="dev-filter-menu-option" onClick={() => { setPriorityFilter(""); setPriorityMenuOpen(false); }}>
                  All
                </button>
                {Object.entries(PRIORITY_LABELS).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className="dev-filter-menu-option"
                    onClick={() => {
                      setPriorityFilter(id);
                      setPriorityMenuOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="dev-add-custom-task-btn" aria-label="Add custom task" onClick={() => setModalState({ mode: "create" })}>
            +
          </button>
        </div>
      </div>

      <div className="dev-tasks-columns">
        <TaskColumn
          title="Default Tasks"
          kind="default"
          modifierClass="dev-task-column--default"
          tasks={pendingDefault}
          isDone={false}
          draggingId={draggingId}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
          onDropTask={handleDropTask}
          onTaskClick={(task) => setModalState({ mode: "edit", task })}
        />
        <TaskColumn
          title="Custom Tasks"
          kind="custom"
          modifierClass="dev-task-column--custom"
          tasks={pendingCustom}
          isDone={false}
          draggingId={draggingId}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
          onDropTask={handleDropTask}
          onTaskClick={(task) => setModalState({ mode: "edit", task })}
        />
        <TaskColumn
          title="Done"
          kind="done"
          modifierClass="dev-task-column--done"
          tasks={done}
          isDone
          draggingId={draggingId}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
          onDropTask={handleDropTask}
          onTaskClick={(task) => setModalState({ mode: "edit", task })}
        />
      </div>

      {modalState && (
        <TaskModal
          key={modalState.mode === "edit" ? modalState.task.id : "create"}
          task={modalState.mode === "edit" ? modalState.task : null}
          projectId={projectId}
          availableUsers={availableUsers}
          onClose={() => setModalState(null)}
          onSaved={() => setModalState(null)}
        />
      )}
    </div>
  );
}
