// Wrappers for backend/Api/** — mirrors the endpoints/shapes used by the
// original js/userDashboard.js and js/sideDashboard.js 1:1.
import { getJSON } from "./http";

export const clearServerCache = () => getJSON("/Api/clear-cache.php");

export const fetchUsers = () => getJSON("/Api/user.php");

export const fetchProjectManagers = () => getJSON("/Api/projects.php");

export const fetchOverview = () => getJSON("/Api/overview.php");

export const fetchUserToday = (userId) => getJSON("/Api/user/today.php", { userId });

export const fetchUserIssues = (userId) => getJSON("/Api/user/issues.php", { userId });

export const fetchUserCalendar = (userId) => getJSON("/Api/user/calendar.php", { userId });

export const fetchUserProjects = (userId) => getJSON("/Api/user/projects.php", { userId });

export const fetchUserOwnerProjects = (userId) => getJSON("/Api/user/owner-projects.php", { userId });

export const fetchUserOverdue = (userId) => getJSON("/Api/user/overdue.php", { userId });

export const fetchAllProjects = () => getJSON("/Api/all-projects.php");

export const fetchProjectIssues = (projectKey, userId) =>
  getJSON("/Api/project/issues.php", { projectKey, userId });

export const fetchIssue = (key) => getJSON("/Api/issue.php", { key });
