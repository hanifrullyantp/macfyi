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

const ADMIN_PROBE_TTL_MS = 2500;

/** Longer / more specific prefixes first (e.g. `/admin3` before `/admin`). */
const ADMIN_DEV_TARGETS = [
  { pathPrefix: "/admin3", port: 5175, distRel: "dist/admin3" },
  { pathPrefix: "/admin", port: 5174, distRel: "dist/admin" },
] as const;

const adminLiveCacheByPort = new Map<number, { checkedAt: number; live: boolean }>();

function adminPathMatches(pathname: string, pathPrefix: string): boolean {
  return pathname === pathPrefix || pathname === `${pathPrefix}/` || pathname.startsWith(`${pathPrefix}/`);
}

function probeAdminDevLive(port: number): Promise<boolean> {
  const now = Date.now();
  const cached = adminLiveCacheByPort.get(port);
  if (cached && now - cached.checkedAt < ADMIN_PROBE_TTL_MS) {
    return Promise.resolve(cached.live);
  }
  return new Promise((resolve) => {
    let settled = false;
    const settle = (live: boolean) => {
      if (settled) return;
      settled = true;
      adminLiveCacheByPort.set(port, { checkedAt: Date.now(), live });
      resolve(live);
    };
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
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

/** Serve built admin from `dist/<segment>` when dev proxy target is down. */
function tryServeAdminDist(
  distRoot: string,
  pathname: string,
  pathPrefix: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!adminPathMatches(pathname, pathPrefix)) return false;

  const sub =
    pathname === pathPrefix || pathname === `${pathPrefix}/`
      ? "index.html"
      : pathname.startsWith(`${pathPrefix}/`)
        ? pathname.slice(pathPrefix.length + 1)
        : "";
  if (!sub || sub.includes("..")) return false;

  const tryFile = (rel: string) => {
    const abs = path.join(distRoot, rel);
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
      `<p>Jalankan dev admin di port yang sesuai, atau build ke <code>dist/admin</code> / <code>dist/admin3</code>:</p>` +
      `<pre style="background:#111;color:#eee;padding:0.75rem;border-radius:6px;overflow:auto">cd ../macfyi-admin\nVITE_USE_ADMIN_SUBPATH=1 npm run dev</pre>` +
      `<pre style="background:#111;color:#eee;padding:0.75rem;border-radius:6px;overflow:auto;margin-top:0.5rem">cd "../macfyi admin2"\nnpm run dev</pre>` +
      `<p>atau dari folder landing:</p>` +
      `<pre style="background:#111;color:#eee;padding:0.75rem;border-radius:6px;overflow:auto">npm run build:admin &amp;&amp; npm run build:admin3</pre>` +
      `</body></html>`,
  );
}

/**
 * When <code>server.proxy</code> target is down, Vite falls through to the marketing SPA for <code>/admin</code> / <code>/admin3</code>.
 * Intercept those paths first: prefer live dev server; else static <code>dist/…</code>; else 503 (never landing HTML).
 */
function adminSubpathDevPlugin(): Plugin {
  return {
    name: "macfyi-admin-subpath-dev",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        const target = ADMIN_DEV_TARGETS.find((t) => adminPathMatches(pathname, t.pathPrefix));
        if (!target) return next();

        if (String(req.headers.upgrade).toLowerCase() === "websocket") {
          return next();
        }

        if (req.method !== "GET" && req.method !== "HEAD") return next();

        void (async () => {
          try {
            const live = await probeAdminDevLive(target.port);
            if (live) {
              next();
              return;
            }
            const distRoot = path.resolve(__dirname, target.distRel);
            if (tryServeAdminDist(distRoot, pathname, target.pathPrefix, req, res)) {
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
    proxy: {
      "/admin3": {
        target: "http://127.0.0.1:5175",
        changeOrigin: true,
        ws: true,
      },
      "/admin": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
