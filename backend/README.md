# JiraBoard — backend

Plain PHP JSON APIs (no framework, no Composer). Proxies the Jira REST API v3
and a small MySQL database (chat, Dev Tracker, Password Manager).

## Setup

The easiest path is `docker compose up` from the repo root (see the root
`README.md`) — it runs MySQL and this backend together, and the app's
first-run setup wizard writes the config for you. What follows is the
manual path, for local development without Docker.

1. Make sure a MySQL server matching whatever `db_host`/`db_user`/
   `db_password` you're about to use is reachable — tables are created
   automatically on first use, you just need a running server + a user with
   privileges to create the database.
2. Run the built-in PHP server from the repo root:

   ```
   php -S localhost:8000 -t backend
   ```

   The `frontend/` dev server proxies `/backend-api/*` to this address (see
   `frontend/vite.config.js`), so during local development you generally
   don't need to think about CORS at all.
3. Open the frontend — since `Api/config.php` doesn't exist yet, you'll land
   on the in-app setup wizard instead of the login screen. Fill in your Jira
   URL/email/API token and DB details there; it verifies the Jira
   credentials and writes `Api/config.php` for you.

   Prefer to skip the wizard and edit a file directly? Copy
   `config.example.php` to `Api/config.php` and fill in the values by hand —
   both paths produce the same file. It's gitignored and must be created on
   every environment individually.

`Api/config.php` is where config.php normally lives; `config_path.php`
lets that be overridden via the `CONFIG_PATH` env var, which is how
`docker-compose.yml` points it at a persistent volume instead — see that
file's comments if you're setting up your own container deployment.

## Layout

- `Api/` — Jira-facing endpoints (overview, projects, per-user views, issue
  detail). `Api/api.helper.php` holds the shared Jira client + file cache
  (`Api/cache/`, gitignored, created on demand). `Api/setup.php` is the
  first-run setup wizard's endpoint — reachable even before `config.php`
  exists (unlike everything else here).
- `features/chat/` — project chat (custom session-cookie auth on top of a
  Jira accountId, MySQL-backed).
- `features/dev/` — Dev Tracker (web project + task CRUD, MySQL).
- `features/password/` — Password Manager (credential CRUD, MySQL).
- `features/finder/` — File Bridge server-side file browser/downloader.
- `cors.php` — shared CORS bootstrap, required by every entrypoint above.
  Only matters for a genuinely cross-origin deployment; see its comments.

## Notes carried over from the original app (not changed in this pass)

- None of these endpoints have their own auth/session gate except
  `features/chat/chat.php` (session-cookie login). `features/dev/**` and
  `features/password/password_manager.php` are open to anyone who can reach
  them, and store credentials (`deploy_password`, `login_password`,
  `licence_key`) in plaintext. This was already true before the split and
  was intentionally left as-is — see the project plan for context.
- `features/finder/*.php` resolve their allowed root directory via
  `finder_root` in `config.php`, the `JIRA_FINDER_ROOT` env var, or a few
  hardcoded fallbacks tied to the original host's mounted volumes. Set
  `finder_root` explicitly on any new environment.
