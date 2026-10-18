import type { Metadata } from "next";
import { FirstAid, WifiSlash } from "@phosphor-icons/react/ssr";
import { Wordmark } from "@/components/wordmark";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline" };

/** Shown by the service worker when a page cannot load. Health records are never cached, so this is all there is offline. */
export default function OfflinePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-18 max-w-3xl items-center px-5 sm:px-6">
        <Wordmark />
      </header>
      <main className="mx-auto max-w-xl px-5 pt-10 pb-16 sm:px-6">
        <WifiSlash aria-hidden className="size-12 text-ink-2" />
        <h1 className="mt-4 font-serif text-display font-medium">You are offline</h1>
        <p className="mt-3 text-lead text-ink-2">
          Your records need a connection, so they are not stored on this phone. Your emergency card works without one if you saved a copy.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {/* Plain links, not next/link: these must be full page loads the service worker can answer. */}
          <a href="/offline-card" className={buttonClass("primary")}>
            <FirstAid aria-hidden weight="fill" className="size-5" /> Open emergency card
          </a>
          <a href="/home" className={buttonClass("secondary")}>
            Try again
          </a>
        </div>
      </main>
    </div>
  );
}
