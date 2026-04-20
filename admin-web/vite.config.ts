import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Must match hosting path (e.g. "/" for admin.macfyi.com root, "/admin/" for subpath deploy).
  base: process.env.VITE_BASE_URL ?? "/",
  plugins: [react(), tailwindcss()],
});
