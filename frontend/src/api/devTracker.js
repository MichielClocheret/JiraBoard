// Wrappers for backend/features/dev/{create_web_project,manage_tasks}.php.
import { getJSON, postForm } from "./http";

const PROJECTS_ENDPOINT = "/features/dev/create_web_project.php";
const TASKS_ENDPOINT = "/features/dev/manage_tasks.php";

export const fetchDevProjects = () => getJSON(PROJECTS_ENDPOINT, { action: "list" });

export const saveDevProject = (data) => postForm(PROJECTS_ENDPOINT, data);

export const deleteDevProject = (id) => postForm(PROJECTS_ENDPOINT, { action: "delete", id });

export const fetchDevTasks = (projectId) => getJSON(TASKS_ENDPOINT, { action: "get_tasks", projectId });

export const saveTaskDoneState = (taskId, isDone) =>
  postForm(TASKS_ENDPOINT, { action: "save_task_state", taskId, isDone: isDone ? 1 : 0 });

export const createTask = (data) => postForm(TASKS_ENDPOINT, { action: "create_task", ...data });

export const updateTask = (data) => postForm(TASKS_ENDPOINT, { action: "update_task", ...data });

export const deleteTask = (taskId) => postForm(TASKS_ENDPOINT, { action: "delete_task", taskId });
