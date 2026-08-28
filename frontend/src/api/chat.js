// Wrappers for backend/features/chat/chat.php (single action-dispatched
// endpoint). Auth here is the same session-cookie login the top-level
// LoginModal already establishes (see api/auth.js) — this file only adds
// the actions specific to the "All Chats" feature.
import { getJSON, postForm } from "./http";

const ENDPOINT = "/features/chat/chat.php";

export const chatWhoami = () => getJSON(ENDPOINT, { action: "whoami" });

export const chatLogin = (password, accountId) =>
  postForm(ENDPOINT, { action: "login", password, accountId });

export const chatLogout = () => postForm(ENDPOINT, { action: "logout" });

export const fetchPinnedProjects = () => getJSON(ENDPOINT, { action: "pinned_projects" });

export const pinProject = (projectKey, projectName, pinned) =>
  postForm(ENDPOINT, { action: "pin_project", projectKey, projectName, pinned: pinned ? "1" : "0" });

export const fetchMessages = (projectKey, afterId) =>
  getJSON(ENDPOINT, { action: "messages", projectKey, afterId: afterId > 0 ? afterId : undefined });

export const sendMessage = (projectKey, message, replyToMessageId) =>
  postForm(ENDPOINT, {
    action: "send",
    projectKey,
    message,
    ...(replyToMessageId > 0 ? { replyToMessageId } : {}),
  });

export const deleteMessage = (messageId) => postForm(ENDPOINT, { action: "delete_message", messageId });
