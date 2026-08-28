import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/pages.css";
import "./styles/finder.css";
import "./styles/forms.css";
import "./styles/chat.css";
import "./styles/devTracker.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
