import { useState } from "react";
import SearchInput from "../ui/SearchInput";
import { useTogglePinMutation } from "../../features/chat/useChatProjects";

// Ported from chatRenderProjectList() in legacy/features/chat/chat.js.
export default function ProjectListPane({ projects, isLoading, isError, onOpen }) {
  const [query, setQuery] = useState("");
  const toggleMutation = useTogglePinMutation();

  const q = query.trim().toLowerCase();
  const filtered = !q ? projects : projects.filter((p) => p.key.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));

  return (
    <aside className="all-chats-projects-pane">
      <div className="chats-search-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects…" />
      </div>

      <ul className="all-chats-project-list chats-project-list">
        {isLoading ? (
          <li className="issue-empty">Loading projects…</li>
        ) : isError ? (
          <li className="issue-empty">Failed to load projects.</li>
        ) : !filtered.length ? (
          <li className="issue-empty">No projects found.</li>
        ) : (
          filtered.map((p) => (
            <li
              key={p.key}
              className="chats-project-item"
              onClick={() => onOpen(p.key, p.name)}
            >
              <span className="chats-project-name">{p.name}</span>
              <span
                className={`chat-pin-toggle ${p.pinned ? "is-pinned" : ""}`}
                title={p.pinned ? "Unpin project" : "Pin project"}
                aria-label={p.pinned ? "Unpin project" : "Pin project"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMutation.mutate({ project: p });
                }}
              >
                📌
              </span>
            </li>
          ))
        )}
      </ul>
      {q && !filtered.length && !isLoading && <p className="chats-no-results">No projects match your search.</p>}
    </aside>
  );
}
