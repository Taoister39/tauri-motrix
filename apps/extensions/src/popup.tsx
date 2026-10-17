import "@tauri-motrix/ux-base/styles.css";
import "./popup.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { isExtension } from "./client";
const root = document.getElementById("root");
if (!root) throw new Error("The extension root element is missing.");
document.documentElement.classList.toggle("browser-preview", !isExtension);
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
