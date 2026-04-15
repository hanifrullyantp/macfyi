import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { ToastProvider } from "./components/ToastProvider";
import { LandingApp } from "./App";
import { DownloadPage } from "./pages/DownloadPage";
import { CheckoutSuccessPage } from "./pages/CheckoutSuccessPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/*" element={<LandingApp />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>
);
