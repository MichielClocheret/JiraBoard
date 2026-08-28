import CopyButton from "../ui/CopyButton";
import { entryTypeEmoji, entryTypeName } from "../../lib/passwordFormat";

// Ported from pmShowDetailView() in legacy/features/password/password.js.
export default function PasswordProjectDetail({ project }) {
  const username = String(project.loginUsername || "").trim();
  const password = String(project.loginPassword || "").trim();
  const licence = String(project.licenceKey || "").trim();

  return (
    <div className="detail-card">
      <div className="detail-card-kicker">
        {entryTypeEmoji(project.entryType)} {entryTypeName(project.entryType)}
      </div>

      {username && (
        <div className="detail-row">
          <div className="detail-row-content">
            <span className="detail-label">Username:</span>
            <strong className="detail-value">{username}</strong>
          </div>
          <CopyButton value={username} />
        </div>
      )}

      {password && (
        <div className="detail-row">
          <div className="detail-row-content">
            <span className="detail-label">Password:</span>
            <strong className="detail-value">{password}</strong>
          </div>
          <CopyButton value={password} />
        </div>
      )}

      {licence && (
        <div className="detail-row">
          <div className="detail-row-content">
            <span className="detail-label">Licence:</span>
            <strong className="detail-value">{licence}</strong>
          </div>
          <CopyButton value={licence} />
        </div>
      )}

      {!username && !password && !licence && <p className="detail-notes">No credentials saved yet.</p>}
    </div>
  );
}
