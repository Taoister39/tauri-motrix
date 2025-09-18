import "@/services/i18n";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";

import Application from "@/layout/Application";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <Application />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
