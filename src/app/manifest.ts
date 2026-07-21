import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Playlist Player", short_name: "Playlist", description: "Player PWA para digital signage", start_url: "/player", display: "fullscreen", background_color: "#000000", theme_color: "#10b981", orientation: "any", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
