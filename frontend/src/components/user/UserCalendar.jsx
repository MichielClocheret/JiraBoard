import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useTaskModal } from "../../state/TaskModalContext";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "tasks", label: "Tasks" },
  { id: "done", label: "Done" },
];

const normalizeStatus = (s) => {
  s = String(s || "").toLowerCase();
  if (s === "progress") return "progress";
  if (s === "done") return "done";
  if (s === "todo") return "todo";
  return "";
};

const statusOrder = { done: 0, todo: 1, progress: 2 };

// Ported from initCalendar() in legacy/js/userDashboard.js.
export default function UserCalendar({ events }) {
  const { openIssue } = useTaskModal();
  const [activeFilter, setActiveFilter] = useState("tasks");

  const filteredEvents = useMemo(() => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    const includesToday = (event) => {
      const start = String(event.start || "").slice(0, 10);
      const end = String(event.end || "").slice(0, 10);
      if (!start) return false;
      if (!end) return start === todayKey;
      return start <= todayKey && todayKey < end;
    };
    const matches = (event) => {
      const status = normalizeStatus(event.extendedProps?.status || "");
      if (activeFilter === "all") return true;
      if (activeFilter === "tasks") {
        return status === "todo" || status === "progress" || (status === "done" && includesToday(event));
      }
      return status === activeFilter;
    };

    return events
      .filter(matches)
      .slice()
      .sort((a, b) => {
        const sa = statusOrder[normalizeStatus(a.extendedProps?.status || "")] ?? 1;
        const sb = statusOrder[normalizeStatus(b.extendedProps?.status || "")] ?? 1;
        return sa - sb;
      });
  }, [events, activeFilter]);

  return (
    <div className="section">
      <div className="section-header-row">
        <h2 className="section-title">Calendar</h2>
        <div className="calendar-filter-buttons">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`filter-calender-btn ${activeFilter === id ? "is-active" : ""}`}
              onClick={() => setActiveFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="calendar-wrap">
        <div className="calendar-legend">
          <span className="calendar-legend-item"><span className="calendar-legend-dot calendar-legend-dot--todo" />Todo</span>
          <span className="calendar-legend-item"><span className="calendar-legend-dot calendar-legend-dot--progress" />In Progress</span>
          <span className="calendar-legend-item"><span className="calendar-legend-dot calendar-legend-dot--feedback" />In Feedback</span>
          <span className="calendar-legend-item"><span className="calendar-legend-dot calendar-legend-dot--done" />Done</span>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          firstDay={1}
          nowIndicator
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth" }}
          events={filteredEvents}
          eventClick={(info) => {
            const props = info.event.extendedProps || {};
            const issueKey = props.issueKey || info.event.id || "";
            if (!issueKey) return;
            openIssue(issueKey, {
              projectKey: props.projectKey || "",
              projectName: props.projectName || "",
              summary: props.summary || info.event.title || issueKey,
            });
          }}
        />
      </div>
    </div>
  );
}
