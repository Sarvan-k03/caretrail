import type { MetadataRoute } from "next";

/** Lets patients install CareTrail on their home screen, which also keeps the offline emergency card one tap away. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareTrail",
    short_name: "CareTrail",
    description: "Your prescriptions and lab reports on one verified timeline, shared safely with the doctors you choose.",
    id: "/home",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f4f2ed",
    theme_color: "#1d2f6f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Emergency card (works offline)", short_name: "Emergency card", url: "/offline-card" },
      { name: "Today's medicines", short_name: "Medicines", url: "/home#doses" },
    ],
  };
}
