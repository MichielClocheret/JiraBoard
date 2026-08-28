// Wrappers for backend/Api/setup.php (first-run configuration).
import { getJSON, postForm } from "./http";

const ENDPOINT = "/Api/setup.php";

export const fetchSetupStatus = () => getJSON(ENDPOINT);

export const submitSetup = (data) => postForm(ENDPOINT, data);
