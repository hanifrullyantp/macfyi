import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Default: root path for subdomain deploy (e.g. https://admin.macfyi.com). Legacy: VITE_USE_ADMIN_SUBPATH=1 + base `/${segment}/` into landing `dist/${segment}`. */
const useSubpath = process.env.VITE_USE_ADMIN_SUBPATH === "1" || process.env.VITE_USE_ADMIN_SUBPATH === "true";
const rawSegment = (process.env.VITE_ADMIN_PATH_SEGMENT ?? "admin").trim().replace(/^\/+|\/+$/g, "");
if (!/^[a-z0-9-]{1,32}$/i.test(rawSegment)) {
  throw new Error(`Invalid VITE_ADMIN_PATH_SEGMENT: ${rawSegment} (use letters, numbers, hyphen; max 32)`);
}
const base = useSubpath ? `/${rawSegment}/` : "/";
const outDir = useSubpath
  ? path.resolve(__dirname, `../macfyi-landing-page/dist/${rawSegment}`)
  : path.resolve(__dirname, "dist");
const adminDevPort = Number(process.env.VITE_ADMIN_DEV_PORT ?? "5174") || 5174;

/** Bundling `../admin-web` sources: resolve from macfyi-admin/node_modules when admin-web has no install. */
const BRIDGE_PKG_ALIASES = [
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

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom", "@supabase/supabase-js", "@tanstack/react-query", "@tanstack/react-table"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      ...Object.fromEntries(BRIDGE_PKG_ALIASES.map((pkg) => [pkg, path.resolve(__dirname, "node_modules", pkg)])),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "."), path.resolve(__dirname, "..")],
    },
    watch: {
      ignored: ["**/dist/**"],
    },
    /** Second instance (e.g. `/admin3` via macfyi-admin2): `VITE_ADMIN_DEV_PORT=5175`. */
    ...(useSubpath ? { port: adminDevPort, strictPort: true } : {}),
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
});
