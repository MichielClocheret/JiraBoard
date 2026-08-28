import { useOnlineFinder } from "../../features/finder/OnlineFinderContext";
import CopyButton from "../ui/CopyButton";
import TaskBoard from "./TaskBoard";
import { buildTypeBadge, loginChoiceLabel, maskPassword } from "../../lib/devTrackerFormat";

function LoginRow({ label, value, copyable, masked }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <div className="detail-row-content">
        <span className="detail-label">{label}:</span>
        <strong className="detail-value">{masked ? maskPassword(value) : value}</strong>
      </div>
      {copyable && <CopyButton value={value} />}
    </div>
  );
}

function openExternalLink(rawLink) {
  const url = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Ported from vdShowProjectDetail()/vdRenderProjectDetailMeta() in
// legacy/features/veaudev/veaudev.js.
export default function ProjectDetailView({ project, availableUsers, onRequestDelete }) {
  const { openFileBridgePath } = useOnlineFinder();

  const badge = buildTypeBadge(project.buildType);
  const deployMode = String(project.deployMode || "").trim();
  const webhostingMode = String(project.webhostingMode || "").trim();
  const loginChoice = loginChoiceLabel(deployMode, webhostingMode);

  const filePath = String(project.designFilePath || "").trim();
  const fileName = String(project.designFileName || "").trim() || filePath.split("/").pop() || "";
  const designLink = String(project.designLink || "").trim();
  const hasDesign = !!filePath || !!designLink;
  const archivePath = String(project.archiveFolderPath || "").trim();
  const assetsPath = String(project.assetsFolderPath || "").trim();
  const webhostingLink = String(project.webhostingLink || "").trim();

  return (
    <div>
      {badge && (
        <div className="dev-project-detail-label" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span className="build-type-badge">
            <img src={badge.icon} alt={badge.label} className="build-type-icon" />
          </span>
          <span>{badge.label}</span>
          {badge.isOther && <CopyButton value={badge.label} />}
        </div>
      )}

      <div className="dev-project-info" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div>
          <h2 className="section-subhead">Project Notes</h2>
          <p className="detail-notes">{String(project.projectNotes || "").trim() || "No notes yet."}</p>
        </div>

        <div className="detail-card">
          <div className="detail-card-kicker">Project Login</div>
          <LoginRow label="Login" value={loginChoice} />
          <LoginRow label="Host" value={String(project.deployHost || "").trim()} copyable />
          <LoginRow label="Username" value={String(project.deployUsername || "").trim()} copyable />
          <LoginRow label="Password" value={String(project.deployPassword || "").trim()} copyable masked />
          {webhostingLink && (
            <div className="detail-row">
              <div className="detail-row-content">
                <span className="detail-label">Link:</span>
                <strong className="detail-value">{webhostingLink}</strong>
              </div>
              <button type="button" className="third-btn" onClick={() => openExternalLink(webhostingLink)}>
                Open
              </button>
            </div>
          )}
          <LoginRow label="Port" value={String(project.deployPort || "").trim()} copyable />
          {String(project.webhostingPersonalNotes || "").trim() && (
            <div className="detail-row">
              <div className="detail-row-content">
                <strong className="detail-value">{String(project.webhostingPersonalNotes).trim()}</strong>
              </div>
            </div>
          )}
          {!loginChoice && !project.deployHost && !project.deployUsername && !project.deployPassword && !webhostingLink && !project.deployPort && (
            <p className="detail-notes">No login saved yet.</p>
          )}
        </div>
      </div>

      <div className="dev-project-files">
        <div className="dev-project-file-section">
          <h2 className="section-subhead">Webdesign</h2>
          {!hasDesign && <p className="detail-notes">No design yet.</p>}
          {filePath && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span>{fileName}</span>
              <button type="button" className="btn btn--secondary" onClick={() => openFileBridgePath(filePath)}>
                Open in Finder
              </button>
            </div>
          )}
          {designLink && (
            <button type="button" className="btn btn--secondary" style={{ marginTop: 8 }} onClick={() => openExternalLink(designLink)}>
              Open link
            </button>
          )}
        </div>

        {archivePath && (
          <div className="dev-project-file-section">
            <h2 className="section-subhead">Archief folder</h2>
            <button type="button" className="btn btn--secondary" style={{ marginTop: 8 }} onClick={() => openFileBridgePath(archivePath)}>
              Open in Finder
            </button>
          </div>
        )}

        {assetsPath && (
          <div className="dev-project-file-section">
            <h2 className="section-subhead">Assets folder</h2>
            <button type="button" className="btn btn--secondary" style={{ marginTop: 8 }} onClick={() => openFileBridgePath(assetsPath)}>
              Open in Finder
            </button>
          </div>
        )}
      </div>

      <TaskBoard projectId={project.id} availableUsers={availableUsers} />

      <div className="dev-project-danger-zone">
        <button type="button" className="btn btn--danger" onClick={() => onRequestDelete(project)}>
          Delete project
        </button>
      </div>
    </div>
  );
}
