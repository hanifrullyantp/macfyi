import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
function refPathRewritePlugin() {
  return {
    name: "macfyi-ref-spa-rewrite",
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, _res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url?.split("?")[0] ?? "";
        if (/^\/ref\/[a-z0-9-]{2,48}\/?$/i.test(raw)) {
          const qs = req.url?.includes("?") ? `?${req.url!.split("?")[1]}` : "";
          req.url = `/${qs}`;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), refPathRewritePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
