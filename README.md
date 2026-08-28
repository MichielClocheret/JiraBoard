# JiraBoard

A Jira dashboard, team chat, web-project tracker (Dev Tracker), and
password manager for the Veauville team — a React frontend talking to a
plain-PHP backend that proxies the Jira REST API and a small MySQL database.

```
backend/    Plain PHP JSON APIs (see backend/README.md)
frontend/   React + Vite app (see frontend/README.md)
```

## Quick start (Docker)

The fastest way to run this end-to-end, including the database:

```bash
docker compose up
```

Then open **http://localhost:8080**. Nothing is pre-configured — you'll land
on a setup wizard where you enter your Jira URL, email, and API token
([get one here](https://id.atlassian.com/manage-profile/security/api-tokens)).
It verifies those credentials before saving, then the app reloads and you're
in. MySQL is already running and wired up for you; the wizard's database
fields are pre-filled from the `db` service and normally don't need changing.

Everything you enter is written to a Docker volume (`backend_config`), not
into any file that could accidentally get committed, and survives
`docker compose down`/rebuilds. To reconfigure, either edit the value that
was written (`docker compose exec backend sh` → the path in `$CONFIG_PATH`)
or wipe the volume with `docker compose down -v` and go through the wizard
again.

Optional: copy `.env.example` to `.env` to change the MySQL credentials or
host ports; `docker compose up` works fine without it.

## Quick start (manual, no Docker)

For local development you'll usually want the frontend's hot-reload dev
server rather than the Docker build:

```bash
# terminal 1 — backend (needs your own MySQL server running)
php -S localhost:8000 -t backend

# terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Open the printed `localhost` URL — same setup wizard as above appears since
nothing is configured yet. See `backend/README.md` for the manual,
file-based config path if you'd rather skip the wizard.

## Notes

- The setup wizard (`backend/Api/setup.php`) only ever *creates* the config
  — once it exists, the wizard refuses to overwrite it (edit the file, or
  delete it to run setup again).
- MySQL is required by Chat, Dev Tracker, and Password Manager (Jira
  data itself doesn't touch the database). The Docker Compose file runs
  MySQL for you; running manually means pointing the wizard at a MySQL
  server you provide.
- See `backend/README.md` for the security posture carried over from the
  original app (a couple of endpoints are intentionally left unauthenticated
  and store credentials in plaintext, same as before this rewrite).
