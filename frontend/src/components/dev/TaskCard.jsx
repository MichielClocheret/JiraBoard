export default function TaskCard({ task, isDone, dragging, onDragStart, onDragEnd, onClick }) {
  const hasNotes = String(task?.notes || "").trim() !== "";
  const assigneeName = String(task?.assigneeName || "").trim();

  return (
    <li>
      <div
        className={`dev-task-card ${isDone ? "is-done" : ""} ${dragging ? "is-dragging" : ""}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(task.id));
          onDragStart(task.id);
        }}
        onDragEnd={onDragEnd}
        onClick={onClick}
      >
        <div className="dev-task-card-header">
          <span className="dev-task-card-title">{task.text || "Task"}</span>
          {hasNotes && <span className="dev-task-card-note-indicator" title="Task has notes" aria-label="Task has notes" />}
        </div>
        {assigneeName && (
          <div className="dev-task-card-meta">
            <span>{assigneeName}</span>
          </div>
        )}
      </div>
    </li>
  );
}
