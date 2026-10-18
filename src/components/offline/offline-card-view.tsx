"use client";

import { useEffect, useState } from "react";
import { FirstAid, WifiSlash } from "@phosphor-icons/react";
import { EmergencyFacts } from "@/components/emergency/emergency-view";
import { readOfflineCards, type SavedCard } from "@/lib/offline-card";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/** The emergency card saved on this phone, readable with no signal and no login. */
export function OfflineCardView() {
  const [cards, setCards] = useState<[string, SavedCard][] | null>(null);
  const [picked, setPicked] = useState(0);

  useEffect(() => {
    // localStorage only exists in the browser, so the saved cards are read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCards(Object.entries(readOfflineCards()).sort((a, b) => a[1].card.name.localeCompare(b[1].card.name)));
  }, []);

  const current = cards?.[picked]?.[1];

  return (
    <div className="emergency-surface min-h-dvh bg-paper text-ink">
      <header className="flex items-center gap-3 bg-ink px-4 py-3 text-sheet">
        <FirstAid aria-hidden weight="fill" className="size-7 shrink-0" />
        <div>
          <p className="text-lead font-bold">Medical information</p>
          <p className="text-dense">Saved on this phone by the patient</p>
        </div>
      </header>

      {cards === null ? null : !current ? (
        <main className="mx-auto max-w-md px-5 py-12">
          <h1 className="text-display font-bold">No card saved on this phone</h1>
          <p className="mt-3 text-lead text-ink-2">
            Open CareTrail while you have signal, go to <b>Home, Your emergency card</b> and turn on <b>Keep a copy on this phone</b>. After that this page works with no signal.
          </p>
        </main>
      ) : (
        <>
          {cards.length > 1 ? (
            <nav aria-label="Whose card" className="flex gap-2 overflow-x-auto border-b-2 border-ink px-5 py-3">
              {cards.map(([id, saved], i) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={i === picked}
                  onClick={() => setPicked(i)}
                  className={cn("min-h-11 shrink-0 rounded-pill border-2 border-ink px-4 font-bold", i === picked ? "bg-ink text-sheet" : "bg-sheet text-ink")}
                >
                  {saved.card.name}
                </button>
              ))}
            </nav>
          ) : null}
          <p className="flex items-center gap-2 bg-sheet-sunk px-5 py-2 text-dense font-semibold">
            <WifiSlash aria-hidden className="size-5 shrink-0" /> Saved {formatDateTime(current.savedAt)}. Medicines may have changed since.
          </p>
          <EmergencyFacts
            card={current.card}
            footer="The patient saved this copy on their phone through CareTrail. It shows critical information only and may be out of date; confirm with the patient or their contact when you can."
          />
        </>
      )}
    </div>
  );
}
