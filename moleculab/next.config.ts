import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isStatic = process.env.MOLECULAB_STATIC === "1";
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  ...(isStatic
    ? {
        output: "export" as const,
        basePath: "/moleculab",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
