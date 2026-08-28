// Wrappers for backend/features/finder/*.php.
import { API_BASE, postForm } from "./http";

export const fetchFolder = (folderPath) =>
  postForm("/features/finder/getfolders.php", { folder: folderPath || "" });

export const getDownloadUrl = (path) =>
  `${API_BASE}/features/finder/downloadfile.php?path=${encodeURIComponent(path)}`;
