import { useState } from "react";
import { useAppState } from "../../state/AppStateContext";
import UserPicker from "./UserPicker";
import PasswordStep from "./PasswordStep";

// Ported from legacy/js/login.js.
export default function LoginModal() {
  const { availableUsers, usersLoaded, usersError, loginWithPassword, continueAsGuest } = useAppState();
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(usersError || "");
  const [submitting, setSubmitting] = useState(false);

  const selectUser = (user) => {
    setSelectedUser(user);
    setPassword("");
    setMessage("");
  };

  const handleContinue = async () => {
    if (!selectedUser) {
      setMessage("Select a user or continue as guest.");
      return;
    }
    const pw = password.trim();
    if (!pw) {
      setMessage("Enter your chat password to continue.");
      return;
    }
    if (pw.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      await loginWithPassword(selectedUser, pw);
    } catch (err) {
      setMessage(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="modal" className="modal-backdrop">
      <section className="app-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div className="modal-header">
          <h1 id="modalTitle">Choose your account</h1>
          <p className="subtitle">Select your Jira user to continue</p>
        </div>

        <div className="modal-body">
          {message && <div className="message">{message}</div>}

          <UserPicker
            users={availableUsers}
            usersLoaded={usersLoaded}
            usersError={usersError}
            selectedUser={selectedUser}
            onSelect={selectUser}
          />

          {selectedUser && <PasswordStep value={password} onChange={setPassword} onEnter={handleContinue} />}

          <button type="button" className="guest-button" onClick={() => continueAsGuest()}>
            Continue as guest
          </button>

          <div className="actions">
            <button type="button" className="btn btn--primary" disabled={submitting} onClick={handleContinue}>
              Continue →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
