import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tank Copilot",
    short_name: "Tank Copilot",
    description: "Aquarium triage, water-test tracking, and safe report sharing.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef8f3",
    theme_color: "#0f3d38",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
