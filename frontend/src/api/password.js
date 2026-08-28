// Wrappers for backend/features/password/password_manager.php.
import { getJSON, postForm } from "./http";

const ENDPOINT = "/features/password/password_manager.php";

export const fetchPasswordProjects = () => getJSON(ENDPOINT, { action: "list" });

export const savePasswordProject = (data) => postForm(ENDPOINT, data);

export const deletePasswordProject = (id) => postForm(ENDPOINT, { action: "delete", id });
