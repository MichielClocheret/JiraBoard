import { useEffect, useRef, useState } from "react";
import Avatar from "../ui/Avatar";

export default function UserPicker({ users, usersLoaded, usersError, selectedUser, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const label = usersLoaded
    ? selectedUser
      ? selectedUser.displayName || "Unknown user"
      : "Select your username..."
    : usersError
      ? "Could not load users"
      : "Loading users...";

  return (
    <div className="picker" ref={rootRef}>
      <button
        type="button"
        id="userPickerButton"
        className="picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => usersLoaded && setOpen((o) => !o)}
      >
        <span className="picker-icon">
          {selectedUser ? <Avatar user={selectedUser} className="picker-icon-image" /> : "?"}
        </span>
        <span className={`picker-label ${!selectedUser ? "is-placeholder" : ""}`}>{label}</span>
        <span className="picker-chevron" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="picker-dropdown">
          <ul className="picker-options" role="listbox" aria-label="Jira users">
            {users.map((user) => (
              <li key={user.accountId} role="presentation">
                <button
                  type="button"
                  className="picker-option"
                  role="option"
                  onClick={() => {
                    onSelect(user);
                    setOpen(false);
                  }}
                >
                  <span className="picker-avatar"><Avatar user={user} className="picker-avatar-image" /></span>
                  <span className="picker-option-name">{user.displayName || "Unknown user"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
