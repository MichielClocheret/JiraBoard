# JiraBoard — frontend

React (Vite, plain JS/JSX, no TypeScript) talking to the PHP backend in
`../backend`. See the root `README.md` for the full quick-start (Docker or
manual).

## Local development

```bash
npm install
npm run dev
```

The dev server proxies `/backend-api/*` to `http://localhost:8000` (see
`vite.config.js`), so it expects the backend running via
`php -S localhost:8000 -t backend` from the repo root — same-origin in dev,
no CORS to think about.

## Structure

- `src/api/` — one file per backend feature, thin fetch wrappers around
  `backend/**`.
- `src/state/` — app-wide React Context: session/login (`AppStateContext`),
  the shared issue/task modal (`TaskModalContext`), and the page header
  title/actions (`PageHeaderContext`).
- `src/features/finder/` — the File Bridge file-picker (native helper app
  still called VeauFinder), exposed as `useOnlineFinder()`
  (`openFinder('file'|'folder')`, `openFileAction`, `openFileBridgePath`)
  for any component that needs to browse/attach a server-side file.
- `src/features/chat/` — chat-specific hooks (auth, pinned/all projects).
- `src/components/` — one folder per feature area (`overview`, `projects`,
  `user`, `chat`, `dev`, `password`, `finder`, `setup`), plus `layout/`
  (sidebar/shell), `shared/` (issue list, project grid, delete-confirm
  modal, task modal), and `ui/` (small primitives: Avatar, SearchInput,
  CopyButton).
- `src/styles/` — plain CSS, one file per area, all built on the tokens in
  `tokens.css`.

## Build

```bash
npm run build   # → dist/
npm run lint    # oxlint
```
