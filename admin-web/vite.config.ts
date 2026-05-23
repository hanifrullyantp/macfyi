import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Force resolution from this package's node_modules (Vercel can fail hoisting for scoped packages). */
const PKG_ALIASES = [
  "@tanstack/react-query",
  "@tanstack/react-table",
  "@tanstack/react-virtual",
  "@dnd-kit/core",
  "@dnd-kit/sortable",
  "@dnd-kit/utilities",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-slot",
  "@radix-ui/react-tooltip",
  "@supabase/supabase-js",
] as const;

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
      ...Object.fromEntries(PKG_ALIASES.map((pkg) => [pkg, path.resolve(__dirname, "node_modules", pkg)])),
    },
  },
});
