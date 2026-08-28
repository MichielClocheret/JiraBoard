import { useState } from "react";
import { submitSetup } from "../../api/setup";

// First-run configuration screen — shown instead of the login modal when
// backend/Api/config.php doesn't exist yet (see AppStateContext's setup
// check and Api/setup.php). Writes config.php server-side so nobody has to
// hand-edit a PHP file to get the app running.
export default function SetupWizardPage({ defaults }) {
  const [jiraBaseUrl, setJiraBaseUrl] = useState(defaults?.jira_base_url || "");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [dbHost, setDbHost] = useState(defaults?.db_host || "localhost");
  const [dbName, setDbName] = useState(defaults?.db_name || "jira_chat");
  const [dbUser, setDbUser] = useState(defaults?.db_user || "root");
  const [dbPassword, setDbPassword] = useState(defaults?.db_password || "");
  const [finderRoot, setFinderRoot] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: "success", message: "Checking your Jira credentials…" });
    try {
      const data = await submitSetup({
        jira_base_url: jiraBaseUrl.trim(),
        jira_email: jiraEmail.trim(),
        jira_api_token: jiraApiToken.trim(),
        db_host: dbHost.trim(),
        db_name: dbName.trim(),
        db_user: dbUser.trim(),
        db_password: dbPassword,
        finder_root: finderRoot.trim(),
      });
      if (!data?.ok) throw new Error(data?.error || "Unable to save configuration.");
      setFeedback({ type: "success", message: "All set — loading JiraBoard…" });
      window.location.reload();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Unable to save configuration." });
      setSubmitting(false);
    }
  };

  return (
    <div id="modal" className="modal-backdrop">
      <section className="app-card" style={{ maxWidth: 480 }} role="dialog" aria-modal="true" aria-labelledby="setupTitle">
        <div className="modal-header">
          <h1 id="setupTitle">Set up JiraBoard</h1>
          <p className="subtitle">This runs once — connect your Jira account and database to get started.</p>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {feedback && <div className={`form-feedback form-feedback--${feedback.type}`}>{feedback.message}</div>}

          <div className="form-field">
            <span className="form-field-label">Jira</span>
            <input
              type="text"
              className="form-input"
              placeholder="https://your-domain.atlassian.net"
              value={jiraBaseUrl}
              onChange={(e) => setJiraBaseUrl(e.target.value)}
              style={{ marginBottom: 8 }}
              required
            />
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={jiraEmail}
              onChange={(e) => setJiraEmail(e.target.value)}
              style={{ marginBottom: 8 }}
              required
            />
            <input
              type="password"
              className="form-input"
              placeholder="Jira API token"
              autoComplete="off"
              value={jiraApiToken}
              onChange={(e) => setJiraApiToken(e.target.value)}
              required
            />
            <p className="content-subtitle" style={{ marginTop: 6 }}>
              <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">
                Get an API token from Atlassian →
              </a>
            </p>
          </div>

          <div className="form-field">
            <span className="form-field-label">Database (chat, Dev Tracker, password manager)</span>
            <div className="form-row" style={{ marginBottom: 8 }}>
              <input type="text" className="form-input" placeholder="Host" value={dbHost} onChange={(e) => setDbHost(e.target.value)} required />
              <input type="text" className="form-input" placeholder="Database name" value={dbName} onChange={(e) => setDbName(e.target.value)} required />
            </div>
            <div className="form-row">
              <input type="text" className="form-input" placeholder="Username" value={dbUser} onChange={(e) => setDbUser(e.target.value)} required />
              <input type="password" className="form-input" placeholder="Password" autoComplete="off" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label className="form-field-label" htmlFor="setup-finder-root">
              File Bridge root folder (optional)
            </label>
            <input
              id="setup-finder-root"
              type="text"
              className="form-input"
              placeholder="/path/to/shared/folder"
              value={finderRoot}
              onChange={(e) => setFinderRoot(e.target.value)}
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              Save &amp; continue →
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
