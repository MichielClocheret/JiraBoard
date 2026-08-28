// Wrappers for backend/features/chat/chat.php's session-cookie auth actions
// (login.js's flow, kept unchanged: chat.php doubles as the app-wide login).
import { getJSON, postForm } from "./http";

export const whoami = () => getJSON("/features/chat/chat.php", { action: "whoami" });

export const login = (password, accountId, displayName) =>
  postForm("/features/chat/chat.php", { action: "login", password, accountId, displayName });

export const logout = () => postForm("/features/chat/chat.php", { action: "logout" });
