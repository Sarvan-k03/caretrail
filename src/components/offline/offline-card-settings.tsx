"use client";

import { useEffect, useState } from "react";
import { CheckCircle, DeviceMobile, DownloadSimple, FirstAid } from "@phosphor-icons/react";
import type { EmergencyCard } from "@/lib/emergency/card";
import { readOfflineCards, refreshOfflineCache, removeOfflineCard, saveOfflineCard } from "@/lib/offline-card";
import { buttonClass } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Keep a copy of this profile's emergency card on the phone, so it opens with no signal. Once on,
 * the copy is refreshed every time this page is opened online.
 */
export function OfflineCardSettings({ patientId, card }: { patientId: string; card: EmergencyCard }) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const kept = readOfflineCards()[patientId];
    if (kept && saveOfflineCard(patientId, card)) {
      refreshOfflineCache();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
      setSavedAt(new Date().toISOString());
    }
    setReady(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [patientId, card]);

  function keep() {
    if (!saveOfflineCard(patientId, card)) return setFailed(true);
    refreshOfflineCache();
    setFailed(false);
    setSavedAt(new Date().toISOString());
  }

  function remove() {
    removeOfflineCard(patientId);
    setSavedAt(null);
  }

  if (!ready) return null;
  return (
    <div className="space-y-4">
      {savedAt ? (
        <p role="status" className="flex items-start gap-2 font-semibold text-verified">
          <CheckCircle aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0" />
          Saved on this phone, updated {formatDateTime(savedAt)}. It opens even with no signal.
        </p>
      ) : (
        <p className="text-ink-2">
          In a basement, a lift or a village with no signal, the online card cannot load. A copy on this phone always opens: blood group, allergies, medicines, conditions and who to call. Only turn this on for a phone you keep with you.
        </p>
      )}
      {failed ? <p role="alert" className="font-semibold text-severe">This browser would not save the copy. Private browsing blocks it; try a normal window.</p> : null}
      <div className="flex flex-wrap gap-2">
        {savedAt ? (
          <>
            <a href="/offline-card" className={buttonClass("primary", "dense")}>
              <FirstAid aria-hidden weight="fill" className="size-5" /> Open offline card
            </a>
            <button type="button" onClick={remove} className={buttonClass("quiet", "dense")}>Remove from this phone</button>
          </>
        ) : (
          <button type="button" onClick={keep} className={buttonClass("primary", "dense")}>
            <DeviceMobile aria-hidden className="size-5" /> Keep a copy on this phone
          </button>
        )}
        {install ? (
          <button
            type="button"
            onClick={async () => {
              await install.prompt();
              await install.userChoice;
              setInstall(null);
            }}
            className={buttonClass("secondary", "dense")}
          >
            <DownloadSimple aria-hidden className="size-5" /> Add CareTrail to home screen
          </button>
        ) : null}
      </div>
    </div>
  );
}
