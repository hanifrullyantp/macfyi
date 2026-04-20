import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { I18nProvider } from "./i18n/context";
import { AppActivityProvider } from "./context/AppActivityContext";

createRoot(document.getElementById("root")!).render(
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
