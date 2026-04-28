import fs from "node:fs";
import net from "node:net";
import path from "path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_DEV = { host: "127.0.0.1", port: 5174 };
const ADMIN_PROBE_TTL_MS = 2500;

let adminLiveCache: { checkedAt: number; live: boolean } | null = null;

function probeAdminDevLive(): Promise<boolean> {
  const now = Date.now();
  if (adminLiveCache && now - adminLiveCache.checkedAt < ADMIN_PROBE_TTL_MS) {
    return Promise.resolve(adminLiveCache.live);
  }
  return new Promise((resolve) => {
    let settled = false;
    const settle = (live: boolean) => {
      if (settled) return;
      settled = true;
      adminLiveCache = { checkedAt: Date.now(), live };
      resolve(live);
    };
    const socket = net.connect(ADMIN_DEV, () => {
      socket.setTimeout(0);
      socket.end();
      settle(true);
    });
    socket.setTimeout(120);
    socket.on("timeout", () => {
      socket.destroy();
      settle(false);
    });
    socket.on("error", () => {
      socket.destroy();
      settle(false);
    });
  });
}

function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

/** Serve built admin from `dist/admin` when dev proxy target is down. */
function tryServeAdminDist(
  distAdmin: string,
  pathname: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!pathname.startsWith("/admin")) return false;

  const sub =
    pathname === "/admin" || pathname === "/admin/" ? "index.html" : pathname.startsWith("/admin/") ? pathname.slice("/admin/".length) : "";
  if (!sub || sub.includes("..")) return false;

  const tryFile = (rel: string) => {
    const abs = path.join(distAdmin, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
    return null;
  };

  let abs = tryFile(sub);
  if (!abs) abs = tryFile("index.html");
  if (!abs) return false;

  const ext = path.extname(abs);
  const ct = mimeForExt(ext);
  res.statusCode = 200;
  res.setHeader("Content-Type", ct);
  if (req.method === "HEAD") {
    res.setHeader("Content-Length", String(fs.statSync(abs).size));
    res.end();
    return true;
  }
  res.end(fs.readFileSync(abs));
  return true;
}

function sendAdminDevUnavailable(res: ServerResponse) {
  res.statusCode = 503;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Admin dev</title></head><body style="font-family:system-ui,sans-serif;padding:1.5rem;max-width:42rem;line-height:1.5">` +
      `<h1>Konsol admin tidak tersedia</h1>` +
      `<p>Jalankan app admin di port <strong>5174</strong>, atau build sekali ke <code>dist/admin</code>:</p>` +
      `<pre style="background:#111;color:#eee;padding:0.75rem;border-radius:6px;overflow:auto">cd ../macfyi-admin\nVITE_USE_ADMIN_SUBPATH=1 npm run dev</pre>` +
      `<p>atau dari folder landing:</p>` +
      `<pre style="background:#111;color:#eee;padding:0.75rem;border-radius:6px;overflow:auto">npm run build:admin</pre>` +
      `</body></html>`,
  );
}

/**
 * When <code>server.proxy</code> target is down, Vite falls through to the marketing SPA for <code>/admin</code>.
 * Intercept <code>/admin</code> first: prefer live dev server; else static <code>dist/admin</code>; else 503 (never landing HTML).
 */
function adminSubpathDevPlugin(): Plugin {
  const distAdmin = path.resolve(__dirname, "dist/admin");

  return {
    name: "macfyi-admin-subpath-dev",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        if (!pathname.startsWith("/admin")) return next();

        if (String(req.headers.upgrade).toLowerCase() === "websocket") {
          return next();
        }

        if (req.method !== "GET" && req.method !== "HEAD") return next();

        void (async () => {
          try {
            const live = await probeAdminDevLive();
            if (live) {
              next();
              return;
            }
            if (tryServeAdminDist(distAdmin, pathname, req, res)) {
              return;
            }
            sendAdminDevUnavailable(res);
          } catch (err) {
            next(err as Error);
          }
        })();
      });
    },
  };
}

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
  plugins: [adminSubpathDevPlugin(), react(), tailwindcss(), viteSingleFile(), refPathRewritePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // Proxies to `macfyi-admin` with `VITE_USE_ADMIN_SUBPATH=1` (default port 5174 in that mode).
    proxy: {
      "/admin": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
