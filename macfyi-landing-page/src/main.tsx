import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { ToastProvider } from "./components/ToastProvider";
import { LandingApp } from "./App";
import { DownloadPage } from "./pages/DownloadPage";
import { AuthLoginPage } from "./pages/AuthLoginPage";
import { AuthForgotPasswordPage } from "./pages/AuthForgotPasswordPage";
import { AuthResetPasswordPage } from "./pages/AuthResetPasswordPage";
import { CheckoutSuccessPage } from "./pages/CheckoutSuccessPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LegalPage } from "./pages/LegalPage";
import { DesktopConnectPage } from "./pages/DesktopConnectPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/login" element={<AuthLoginPage />} />
          <Route path="/lupa-password" element={<AuthForgotPasswordPage />} />
          <Route path="/reset-password" element={<AuthResetPasswordPage />} />
          <Route path="/desktop-connect" element={<DesktopConnectPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="/*" element={<LandingApp />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>
);
