// Shared fetch client for the PHP backend. In dev this goes through the Vite
// proxy at /backend-api (see vite.config.js), which forwards to the PHP
// built-in server started with `php -S localhost:8000 -t backend`, so
// requests are same-origin and cookies/CORS are a non-issue locally.
const BASE = import.meta.env.VITE_API_BASE || "/backend-api";
export const API_BASE = BASE;

async function request(path, { method = "GET", params, body, formEncoded } = {}) {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const init = {
    method,
    headers: { Accept: "application/json" },
    credentials: "include",
  };

  if (body !== undefined) {
    if (formEncoded) {
      init.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      init.body = new URLSearchParams(body).toString();
    } else {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);
  return data;
}

export function getJSON(path, params) {
  return request(path, { params });
}

export function postForm(path, body) {
  return request(path, { method: "POST", body, formEncoded: true });
}
