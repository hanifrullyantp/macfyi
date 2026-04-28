import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Helps Rollup resolve `react/jsx-runtime` when Vercel installs deps only under this package root. */
export default defineConfig({
  // Must match hosting path (e.g. "/" for adm.macfyi.com root, "/admin/" for subpath deploy).
  base: process.env.VITE_BASE_URL ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime.js"),
    },
  },
});
