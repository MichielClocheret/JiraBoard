import { useMemo, useState } from "react";
import SearchInput from "../ui/SearchInput";

function ProjectCard({ projectKey, project, inactive, onClick }) {
  const todo = project["To Do"] ?? 0;
  const progress = project["In Progress"] ?? 0;
  const feedback = project["Feedback"] ?? 0;
  const hasActive = todo + progress > 0;

  return (
    <button
      type="button"
      className={`project-card ${inactive ? "project-card--inactive" : ""}`.trim()}
      onClick={onClick}
    >
      <div className="project-card-name">{project.name || projectKey}</div>
      <div className="project-card-counts">
        {todo > 0 && <span className="badge badge--todo">{todo} To Do</span>}
        {progress > 0 && <span className="badge badge--progress">{progress} In Progress</span>}
        {feedback > 0 && <span className="badge badge--feedback">{feedback} Feedback</span>}
        {!hasActive && feedback === 0 && <span className="badge badge--muted">No open tasks</span>}
      </div>
    </button>
  );
}

function ProjectSection({ title, keys, projects, inactive, onSelectProject }) {
  const [expanded, setExpanded] = useState(false);
  if (!keys.length) return null;

  const limit = inactive ? 6 : 12;
  const visible = expanded ? keys : keys.slice(0, limit);

  return (
    <div className="section">
      <div className="section-header-row">
        <h3 className="section-subhead">
          {title} ({keys.length})
        </h3>
      </div>
      <div className="project-grid">
        {visible.map((key) => (
          <ProjectCard
            key={key}
            projectKey={key}
            project={projects[key]}
            inactive={inactive}
            onClick={() => onSelectProject(key, projects[key].name || key)}
          />
        ))}
      </div>
      {keys.length > limit && (
        <div className="show-all-wrap">
          <button type="button" className={`show-all-btn ${expanded ? "open" : ""}`} onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Show less" : `Show all ${keys.length}`}
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectsGrid({ titleText, showSectionTitle = true, projects, onSelectProject }) {
  const [query, setQuery] = useState("");

  const keys = Object.keys(projects || {});
  const isActive = (k) => (projects[k]["To Do"] ?? 0) + (projects[k]["In Progress"] ?? 0) > 0;

  const { activeKeys, inactiveKeys } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? keys.filter((k) => k.toLowerCase().includes(q) || (projects[k].name || "").toLowerCase().includes(q))
      : keys;
    return {
      activeKeys: filtered.filter(isActive),
      inactiveKeys: filtered.filter((k) => !isActive(k)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, keys.join(","), projects]);

  return (
    <div>
      <div className="section-header-row">
        {showSectionTitle && <h2 className="section-title">{titleText}</h2>}
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects…" />
      </div>

      {query.trim() && activeKeys.length + inactiveKeys.length === 0 && (
        <p className="search-no-results">No projects match your search.</p>
      )}

      <ProjectSection title="Active" keys={activeKeys} projects={projects} inactive={false} onSelectProject={onSelectProject} />
      <ProjectSection title="Inactive" keys={inactiveKeys} projects={projects} inactive={true} onSelectProject={onSelectProject} />

      {!keys.length && <p className="issue-empty">No projects found.</p>}
    </div>
  );
}
