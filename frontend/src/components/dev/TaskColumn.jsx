import { useState } from "react";
import TaskCard from "./TaskCard";

// One drop-target column of the task board. `kind` is 'default'|'custom' for
// the two pending columns (dropping a task of the wrong kind is rejected,
// matching the original) or 'done' for the done column (accepts either kind).
export default function TaskColumn({ title, kind, tasks, isDone, modifierClass, draggingId, onDragStart, onDragEnd, onDropTask, onTaskClick }) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={`dev-task-column ${modifierClass} ${isOver ? "is-drop-target" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const taskId = Number(draggingId || e.dataTransfer.getData("text/plain") || 0);
        onDropTask(taskId, kind, isDone);
      }}
    >
      <h3 className="dev-tasks-title">{title}</h3>
      <ul className="dev-task-list">
        {!tasks.length ? (
          <li className="dev-task-empty">No tasks here yet.</li>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDone={isDone}
              dragging={draggingId === task.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </ul>
    </div>
  );
}
