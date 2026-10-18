import type { Metadata, Viewport } from "next";
import { OfflineCardView } from "@/components/offline/offline-card-view";

export const metadata: Metadata = { title: "Emergency card", referrer: "no-referrer" };
export const viewport: Viewport = { themeColor: "#0b0c0e" };

/** Static shell cached by the service worker; the card itself is read from this device. */
export default function OfflineCardPage() {
  return <OfflineCardView />;
}
