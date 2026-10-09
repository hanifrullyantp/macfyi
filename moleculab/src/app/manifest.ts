import type { MetadataRoute } from "next";

import { BRAND } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.appFullName,
    short_name: BRAND.appShortName,
    description:
      "Laboratorium molekul virtual interaktif untuk memahami Teori VSEPR melalui visualisasi pembentukan molekul langkah demi langkah.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
