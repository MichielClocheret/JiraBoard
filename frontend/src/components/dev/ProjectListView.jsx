import { useEffect, useMemo, useState } from "react";
import SearchInput from "../ui/SearchInput";
import { buildTypeBadge, matchesProjectTypeFilter, sortProjectsByDate } from "../../lib/devTrackerFormat";

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "webflow", label: "Webflow" },
  { id: "custom", label: "Custom" },
  { id: "other", label: "Other" },
];

function ProjectCard({ project, onClick }) {
  const total = Math.max(Number(project?.totalTasks || 0), 0);
  const done = Math.min(Math.max(Number(project?.doneTasks || 0), 0), total || 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const badge = buildTypeBadge(project.buildType);

  return (
    <li>
      <button type="button" className="dev-project-card" onClick={onClick}>
        <div className="dev-project-card-top">
          <span className="dev-project-card-name">{project.projectName}</span>
          {badge && <img src={badge.icon} alt={badge.label} className="dev-project-type-icon" />}
        </div>
        <div className="dev-project-progress">
          <div className="dev-project-progress-bar" aria-hidden="true">
            <span className="dev-project-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="dev-project-progress-text">{done}/{total} tasks done</span>
        </div>
      </button>
    </li>
  );
}

// Ported from renderProjects()/filterProjects() in
// legacy/features/veaudev/veaudev.js.
export default function ProjectListView({ projects, isLoading, loadError, onSelect, onAdd }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const onDocClick = (e) => {
      if (e.target.closest(".dev-date-filter")) return;
      setSortMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [sortMenuOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter((p) => {
      const name = String(p?.projectName || "").trim().toLowerCase();
      const type = String(p?.buildType || "").trim().toLowerCase();
      return (!q || name.includes(q) || type.includes(q)) && matchesProjectTypeFilter(p, typeFilter);
    });
    return sortProjectsByDate(list, sortOrder);
  }, [projects, query, typeFilter, sortOrder]);

  return (
    <div>
      <div className="section-header-row">
        <h2 className="section-title">Web Projects</h2>
        <div className="build-type-filter-row">
          {TYPE_FILTERS.map(({ id, label }) => (
            <button key={id} type="button" className={`chip-btn ${typeFilter === id ? "is-selected" : ""}`} onClick={() => setTypeFilter(id)}>
              {label}
            </button>
          ))}
          <div className="dev-date-filter" style={{ position: "relative" }}>
            <button type="button" className="third-btn" onClick={() => setSortMenuOpen((o) => !o)}>
              Date: {sortOrder === "oldest" ? "Oldest" : "Newest"}
            </button>
            {sortMenuOpen && (
              <div className="dev-filter-menu">
                <button type="button" className="dev-filter-menu-option" onClick={() => { setSortOrder("newest"); setSortMenuOpen(false); }}>
                  Newest
                </button>
                <button type="button" className="dev-filter-menu-option" onClick={() => { setSortOrder("oldest"); setSortMenuOpen(false); }}>
                  Oldest
                </button>
              </div>
            )}
          </div>
        </div>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          + Add
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search project…" />
      </div>

      <ul className="entity-card-list">
        {isLoading ? (
          <li className="issue-empty">Loading…</li>
        ) : loadError ? (
          <li className="issue-empty">{loadError}</li>
        ) : !filtered.length ? (
          <li className="issue-empty">{projects.length ? "No projects found." : "No projects yet."}</li>
        ) : (
          filtered.map((p) => <ProjectCard key={p.id} project={p} onClick={() => onSelect(p)} />)
        )}
      </ul>
    </div>
  );
}
