import { useMemo, useState } from "react";
import SearchInput from "../ui/SearchInput";
import { entryTypeEmoji, entryTypeName } from "../../lib/passwordFormat";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "licence", label: "Licence" },
  { id: "login", label: "Login" },
];

// Ported from pmRenderProjects()/pmFilterProjects() in
// legacy/features/password/password.js.
export default function PasswordProjectList({ projects, isLoading, loadError, onSelect, onAdd }) {
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((p) => {
      const name = String(p?.projectName || "").trim().toLowerCase();
      const type = String(p?.entryType || "").trim().toLowerCase();
      return (!query || name.includes(query) || type.includes(query)) && (filterType === "all" || type === filterType);
    });
  }, [projects, search, filterType]);

  return (
    <div>
      <div className="section-header-row">
        <div className="pill-filter">
          {FILTERS.map(({ id, label }) => (
            <button key={id} type="button" className={`pill-filter__btn ${filterType === id ? "is-active" : ""}`} onClick={() => setFilterType(id)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          + Add
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search a password…" />
      </div>

      <ul className="entity-card-list">
        {isLoading ? (
          <li className="issue-empty">Loading…</li>
        ) : loadError ? (
          <li className="issue-empty">{loadError}</li>
        ) : !filtered.length ? (
          <li className="issue-empty">No password projects yet.</li>
        ) : (
          filtered.map((p) => (
            <li key={p.id} className="entity-card" onClick={() => onSelect(p)}>
              <div className="entity-card-top">
                <span className="entity-card-name">{p.projectName}</span>
                <span className="entity-type-badge" aria-label={entryTypeName(p.entryType)}>
                  {entryTypeEmoji(p.entryType)}
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
