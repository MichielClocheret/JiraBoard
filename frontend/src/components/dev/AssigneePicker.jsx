import { useEffect, useRef, useState } from "react";
import Avatar from "../ui/Avatar";

// Ported from the dev-user-picker (task assignee dropdown) in
// legacy/features/veaudev/veaudev.js.
export default function AssigneePicker({ users, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const options = [{ accountId: "", displayName: "Unassigned" }, ...users]
    .filter((u, i, arr) => arr.findIndex((x) => x.accountId === u.accountId) === i);

  const current = options.find((u) => u.accountId === value) || options[0];

  return (
    <div className={`user-picker ${open ? "is-open" : ""}`} ref={rootRef}>
      <button type="button" className="user-picker-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="user-picker-current">
          <Avatar user={current} />
          <span className="user-picker-text">{current.displayName || "Unassigned"}</span>
        </span>
        <span className="user-picker-chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="user-picker-menu" role="listbox">
          {options.map((u) => (
            <button
              key={u.accountId || "unassigned"}
              type="button"
              className={`user-picker-item ${u.accountId === value ? "is-selected" : ""}`}
              role="option"
              aria-selected={u.accountId === value}
              onClick={() => {
                onChange(u);
                setOpen(false);
              }}
            >
              <Avatar user={u} />
              <span className="user-picker-item-name">{u.displayName || "Unassigned"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
