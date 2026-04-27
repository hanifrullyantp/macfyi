import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { I18nProvider } from "./i18n/context";
import { AppActivityProvider } from "./context/AppActivityContext";

const rootEl = document.getElementById("root");

if (!rootEl) throw new Error("Missing #root element");

createRoot(rootEl).render(
  <StrictMode>
    <I18nProvider>
      <AppActivityProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppActivityProvider>
    </I18nProvider>
  </StrictMode>
);
