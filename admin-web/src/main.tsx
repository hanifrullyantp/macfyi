import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";
import "./index.css";
import { App } from "./App";
import { queryClient } from "./lib/queryClient";
import { AppUiProvider } from "./store/appUi";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider delayDuration={200}>
        <AppUiProvider>
          <BrowserRouter>
            <App />
            <Toaster richColors position="bottom-right" closeButton duration={4000} />
          </BrowserRouter>
        </AppUiProvider>
      </Tooltip.Provider>
    </QueryClientProvider>
  </StrictMode>
);
