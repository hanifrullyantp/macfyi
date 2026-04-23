import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Served at https://macfyi.com/admin/ — build output copied into landing dist by `macfyi-landing-page` build script.
export default defineConfig({
  base: "/admin/",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "."), path.resolve(__dirname, "..")],
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../macfyi-landing-page/dist/admin"),
    emptyOutDir: true,
  },
});
