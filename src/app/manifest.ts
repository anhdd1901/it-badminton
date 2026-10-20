import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ANH EM IT",
    short_name: "ANH EM IT",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    start_url: "/",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
