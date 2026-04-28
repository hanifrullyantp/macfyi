import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Default: root path for subdomain deploy (e.g. https://admin.macfyi.com). Legacy: VITE_USE_ADMIN_SUBPATH=1 + base /admin/ into landing `dist/admin`. */
const useSubpath = process.env.VITE_USE_ADMIN_SUBPATH === "1" || process.env.VITE_USE_ADMIN_SUBPATH === "true";
const base = useSubpath ? "/admin/" : "/";
const outDir = useSubpath
  ? path.resolve(__dirname, "../macfyi-landing-page/dist/admin")
  : path.resolve(__dirname, "dist");

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    dedupe: ["react", "react-dom", "@supabase/supabase-js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "."), path.resolve(__dirname, "..")],
    },
    /** Avoid clashing with landing `vite dev` (5173) when developing under `/admin` via proxy. */
    ...(useSubpath ? { port: 5174, strictPort: true } : {}),
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
});
