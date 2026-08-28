import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveDevProject } from "../../api/devTracker";
import { useOnlineFinder } from "../../features/finder/OnlineFinderContext";

const BUILD_TYPES = ["Webflow", "Custom", "Andere"];
const WEBHOSTING_MODES = [
  { id: "arno", label: "Arno login" },
  { id: "customLogin", label: "Custom login" },
  { id: "personal", label: "Personal" },
];

function inferDeployMode(project) {
  if (project.deployMode) return String(project.deployMode).trim();
  if (String(project.deployHost || "").trim()) return "filezilla";
  if (String(project.deployUsername || "").trim() || String(project.deployPassword || "").trim()) return "webhosting";
  return "";
}

function inferWebhostingMode(project, deployMode) {
  if (project.webhostingMode) return String(project.webhostingMode).trim();
  if (deployMode === "webhosting" && String(project.webhostingPersonalNotes || "").trim()) return "personal";
  if (deployMode === "webhosting" && (project.deployUsername || project.deployPassword)) return "customLogin";
  return "arno";
}

function FolderPicker({ label, selection, onPick, onRemove }) {
  return (
    <div>
      <p className="title-step-sub">{label}</p>
      <button type="button" className="btn btn--secondary" onClick={onPick}>
        Open online finder
      </button>
      {selection && (
        <div className="dev-selected-files">
          <span className="dev-selected-file">
            <span className="dev-selected-file-name" title={selection.name}>{selection.name}</span>
            <button type="button" className="dev-selected-file-remove" aria-label="Remove folder" onClick={onRemove}>
              ×
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

// Ported from vdOpenModal()/the "Edit" header button handler/the
// add-web-project-form submit handler in legacy/features/veaudev/veaudev.js.
// Parent renders this with `key={project?.id ?? 'create'}` to reset state
// when switching between "add" and "edit X".
export default function ProjectModal({ project, onClose, onSaved }) {
  const isEdit = !!project;
  const { openFinder } = useOnlineFinder();

  const initialBuildType = isEdit
    ? BUILD_TYPES.includes(project.buildType) ? project.buildType : project.buildType ? "Andere" : ""
    : "";
  const initialAndere = isEdit && initialBuildType === "Andere" ? String(project.buildType || "") : "";
  const initialDeployMode = isEdit ? inferDeployMode(project) : "";

  const [name, setName] = useState(() => (isEdit ? String(project.projectName || "") : ""));
  const [buildType, setBuildType] = useState(initialBuildType);
  const [andereText, setAndereText] = useState(initialAndere);
  const [designSelection, setDesignSelection] = useState(() =>
    isEdit && project.designFilePath ? { path: project.designFilePath, name: project.designFileName || project.designFilePath.split("/").pop() } : null
  );
  const [designLink, setDesignLink] = useState(() => (isEdit ? String(project.designLink || "") : ""));
  const [archiveSelection, setArchiveSelection] = useState(() =>
    isEdit && project.archiveFolderPath ? { path: project.archiveFolderPath, name: project.archiveFolderName || project.archiveFolderPath.split("/").pop() } : null
  );
  const [assetsSelection, setAssetsSelection] = useState(() =>
    isEdit && project.assetsFolderPath ? { path: project.assetsFolderPath, name: project.assetsFolderName || project.assetsFolderPath.split("/").pop() } : null
  );
  const [deployMode, setDeployMode] = useState(initialDeployMode);
  const [webhostingMode, setWebhostingMode] = useState(() => (isEdit ? inferWebhostingMode(project, initialDeployMode) : "arno"));
  const [whUsername, setWhUsername] = useState(() => (isEdit ? String(project.deployUsername || "") : ""));
  const [whPassword, setWhPassword] = useState(() => (isEdit ? String(project.deployPassword || "") : ""));
  const [whLink, setWhLink] = useState(() => (isEdit ? String(project.webhostingLink || "") : ""));
  const [whPersonalNotes, setWhPersonalNotes] = useState(() => (isEdit ? String(project.webhostingPersonalNotes || "") : ""));
  const [deployHost, setDeployHost] = useState(() => (isEdit ? String(project.deployHost || "") : ""));
  const [deployUsername, setDeployUsername] = useState(() => (isEdit ? String(project.deployUsername || "") : ""));
  const [deployPassword, setDeployPassword] = useState(() => (isEdit ? String(project.deployPassword || "") : ""));
  const [deployPort, setDeployPort] = useState(() => (isEdit ? String(project.deployPort || "") : ""));
  const [notes, setNotes] = useState(() => (isEdit ? String(project.projectNotes || "") : ""));
  const [feedback, setFeedback] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: saveDevProject,
    onSuccess: (payload) => {
      if (!payload?.success) {
        setFeedback({ type: "error", message: payload?.message || "Unable to save project." });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["devProjects"] });
      onSaved(payload);
    },
    onError: (err) => setFeedback({ type: "error", message: err?.message || "Unable to save project." }),
  });

  const showDeploySection = buildType === "Webflow" || buildType === "Custom" || buildType === "Andere";
  const isWebflow = buildType === "Webflow";
  const effectiveDeployMode = isWebflow ? "webhosting" : deployMode;

  const pickDesign = async () => {
    const result = await openFinder("file");
    const f = result?.files?.[0];
    if (f?.path) setDesignSelection({ path: f.path, name: f.name });
  };
  const pickArchive = async () => {
    const result = await openFinder("folder");
    const f = result?.folders?.[0];
    if (f?.path) setArchiveSelection({ path: f.path, name: f.name });
  };
  const pickAssets = async () => {
    const result = await openFinder("folder");
    const f = result?.folders?.[0];
    if (f?.path) setAssetsSelection({ path: f.path, name: f.name });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFeedback({ type: "error", message: "Please enter a project name." });
      return;
    }
    if (!buildType) {
      setFeedback({ type: "error", message: "Please choose how you'd like to build this site." });
      return;
    }
    let resolvedBuildType = buildType;
    if (buildType === "Andere") {
      const v = andereText.trim();
      if (!v) {
        setFeedback({ type: "error", message: "Please specify the build method." });
        return;
      }
      resolvedBuildType = v;
    }

    setFeedback({ type: "success", message: isEdit ? "Saving changes…" : "Saving…" });

    const postData = {
      action: isEdit ? "update" : "create",
      projectName: trimmedName,
      buildType: resolvedBuildType,
      designFilePath: designSelection?.path || "",
      designFileName: designSelection?.name || "",
      archiveFolderPath: archiveSelection?.path || "",
      archiveFolderName: archiveSelection?.name || "",
      assetsFolderPath: assetsSelection?.path || "",
      assetsFolderName: assetsSelection?.name || "",
      designLink: designLink.trim(),
      projectNotes: notes.trim(),
    };

    if (effectiveDeployMode === "webhosting") {
      postData.deployHost = "";
      postData.deployUsername = webhostingMode === "customLogin" ? whUsername.trim() : "";
      postData.deployPassword = webhostingMode === "customLogin" ? whPassword.trim() : "";
      postData.webhostingLink = webhostingMode === "customLogin" ? whLink.trim() : "";
      postData.deployMode = "webhosting";
      postData.webhostingMode = webhostingMode;
      postData.webhostingPersonalNotes = webhostingMode === "personal" ? whPersonalNotes.trim() : "";
      postData.deployPort = "";
    } else if (effectiveDeployMode === "filezilla") {
      postData.deployHost = deployHost.trim();
      postData.deployUsername = deployUsername.trim();
      postData.deployPassword = deployPassword.trim();
      postData.webhostingLink = "";
      postData.deployMode = "filezilla";
      postData.webhostingMode = "";
      postData.webhostingPersonalNotes = "";
      postData.deployPort = deployPort.trim();
    } else {
      postData.deployHost = "";
      postData.deployUsername = "";
      postData.deployPassword = "";
      postData.webhostingLink = "";
      postData.deployMode = "";
      postData.webhostingMode = "";
      postData.webhostingPersonalNotes = "";
      postData.deployPort = "";
    }

    if (isEdit) postData.id = project.id;
    mutation.mutate(postData);
  };

  return (
    <>
      <div className="finder-backdrop is-open" onClick={onClose} />
      <div className="finder-modal is-open" role="dialog" aria-modal="true">
        <div className="modal-card dev-modal-card" style={{ width: "min(720px, 94vw)", height: "min(90vh, 900px)" }}>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
          <div className="modal-header">
            <div className="modal-title">{isEdit ? "Edit Web Project" : "Add Web Project"}</div>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="webproject-step">
                <p className="title-step">1) What&apos;s the name of the project?</p>
                <input type="text" className="form-input" maxLength={190} value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
              </div>

              <div className="webproject-step">
                <p className="title-step">2) How would you like to build this site?</p>
                <div className="chip-group" style={{ marginBottom: 10 }}>
                  {BUILD_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`chip-btn ${buildType === t ? "is-selected" : ""}`}
                      onClick={() => {
                        setBuildType(t);
                        setFeedback(null);
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {buildType === "Andere" && (
                  <input type="text" className="form-input" maxLength={100} placeholder="Specify…" value={andereText} onChange={(e) => setAndereText(e.target.value)} />
                )}
              </div>

              <div className="webproject-step">
                <div className="webproject-flex">
                  <FolderPicker label="3) Upload the webdesign." selection={designSelection} onPick={pickDesign} onRemove={() => setDesignSelection(null)} />
                  <div>
                    <p className="title-step-sub">4) What&apos;s the Figma link?</p>
                    <input type="text" className="form-input" placeholder="Webdesign link" value={designLink} onChange={(e) => setDesignLink(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="webproject-step">
                <div className="webproject-flex">
                  <FolderPicker label="5) Upload the archief folder." selection={archiveSelection} onPick={pickArchive} onRemove={() => setArchiveSelection(null)} />
                  <FolderPicker label="6) Upload the assets folder." selection={assetsSelection} onPick={pickAssets} onRemove={() => setAssetsSelection(null)} />
                </div>
              </div>

              {showDeploySection && (
                <div className="webproject-step">
                  <p className="title-step">{isWebflow ? "7) Webflow login" : "7) Login information"}</p>

                  {!isWebflow && (
                    <div className="chip-group" style={{ marginBottom: 14 }}>
                      <button type="button" className={`chip-btn ${deployMode === "webhosting" ? "is-selected" : ""}`} onClick={() => setDeployMode("webhosting")}>
                        Webhosting
                      </button>
                      <button type="button" className={`chip-btn ${deployMode === "filezilla" ? "is-selected" : ""}`} onClick={() => setDeployMode("filezilla")}>
                        Filezilla
                      </button>
                    </div>
                  )}

                  {effectiveDeployMode === "webhosting" && (
                    <div>
                      <p className="title-step">Choose which type:</p>
                      <div className="chip-group" style={{ marginBottom: 14 }}>
                        {WEBHOSTING_MODES.map(({ id, label }) => (
                          <button key={id} type="button" className={`chip-btn ${webhostingMode === id ? "is-selected" : ""}`} onClick={() => setWebhostingMode(id)}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {webhostingMode === "customLogin" && (
                        <div className="webproject-flex">
                          <div>
                            <p className="title-step-sub">Username</p>
                            <input type="text" className="form-input" value={whUsername} onChange={(e) => setWhUsername(e.target.value)} />
                          </div>
                          <div>
                            <p className="title-step-sub">Password</p>
                            <input type="text" className="form-input" value={whPassword} onChange={(e) => setWhPassword(e.target.value)} />
                          </div>
                          <div>
                            <p className="title-step-sub">Webhosting Provider</p>
                            <input type="text" className="form-input" value={whLink} onChange={(e) => setWhLink(e.target.value)} />
                          </div>
                        </div>
                      )}
                      {webhostingMode === "personal" && (
                        <div>
                          <p className="title-step-sub">Personal notes</p>
                          <textarea className="form-textarea" placeholder="Personal login?" value={whPersonalNotes} onChange={(e) => setWhPersonalNotes(e.target.value)} />
                        </div>
                      )}
                    </div>
                  )}

                  {effectiveDeployMode === "filezilla" && (
                    <div className="webproject-flex">
                      <div>
                        <p className="title-step-sub">Host</p>
                        <input type="text" className="form-input" value={deployHost} onChange={(e) => setDeployHost(e.target.value)} />
                      </div>
                      <div>
                        <p className="title-step-sub">Username</p>
                        <input type="text" className="form-input" value={deployUsername} onChange={(e) => setDeployUsername(e.target.value)} />
                      </div>
                      <div>
                        <p className="title-step-sub">Password</p>
                        <input type="text" className="form-input" value={deployPassword} onChange={(e) => setDeployPassword(e.target.value)} />
                      </div>
                      <div>
                        <p className="title-step-sub">Port</p>
                        <input type="text" className="form-input" value={deployPort} onChange={(e) => setDeployPort(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="webproject-step">
                <p className="title-step">Notes</p>
                <textarea className="form-textarea" placeholder="Add notes for this project" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn--secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={mutation.isPending}>
                  Save
                </button>
              </div>
            </form>
            {feedback && <div className={`form-feedback form-feedback--${feedback.type}`}>{feedback.message}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
