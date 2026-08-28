import { useState } from "react";
import { useAppState } from "../../state/AppStateContext";

// Ported from the chat-auth-modal in legacy/features/chat/chat.js — a
// defensive re-login prompt for when the chat session cookie has gone
// stale even though the app itself still thinks you're signed in.
// Closing it (there's nothing sensible to fall back to) signs you all
// the way out, same as the original's chatSwitchUser().
export default function ChatAuthModal({ accountId, displayName, onLogin }) {
  const { signOut } = useAppState();
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState(null); // { type, message } | null
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId) {
      setFeedback({ type: "error", message: "Select a user first before signing in." });
      return;
    }
    if (password.trim().length < 6) {
      setFeedback({ type: "error", message: "Enter a password with at least 6 characters." });
      return;
    }
    setSubmitting(true);
    setFeedback({ type: "success", message: "Signing you in…" });
    try {
      await onLogin(password);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Unable to sign in." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="finder-backdrop is-open" onClick={() => signOut()} />
      <div className="finder-modal is-open" role="dialog" aria-modal="true" aria-labelledby="chat-auth-title">
        <div className="modal-card chat-auth-card">
          <button className="modal-close" type="button" aria-label="Close" onClick={() => signOut()}>
            ×
          </button>
          <div className="modal-header" style={{ textAlign: "left" }}>
            <div className="modal-title" id="chat-auth-title">
              All Chats Sign In
            </div>
            <p className="chat-auth-subtitle">{displayName ? `Continue as ${displayName}` : "Enter your chat password"}</p>
          </div>
          <div className="modal-body">
            {feedback && <div className={`form-feedback form-feedback--${feedback.type}`}>{feedback.message}</div>}
            <form className="chat-login-form" onSubmit={handleSubmit} noValidate>
              <div className="chat-field">
                <label htmlFor="chat-auth-password" className="chat-field-label">
                  Password
                </label>
                <input
                  type="password"
                  id="chat-auth-password"
                  className="chat-input"
                  placeholder="Min. 6 characters"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                Sign in / Register
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
