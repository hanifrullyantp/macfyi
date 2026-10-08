import type { NextConfig } from "next";

/** Static export under https://macfyi.com/moleculab when MOLECULAB_STATIC=1 */
const isStatic = process.env.MOLECULAB_STATIC === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
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
