"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowCounterClockwise, Bell, SunHorizon, Sun, CloudSun, MoonStars } from "@phosphor-icons/react";
import { SLOT_LABELS, type SlotDoses } from "@/lib/doses/schedule";
import type { DoseSlot } from "@/lib/normalise/frequency";
import { cn } from "@/lib/cn";

const SLOT_ICONS: Record<DoseSlot, typeof Sun> = { morning: SunHorizon, afternoon: Sun, evening: CloudSun, night: MoonStars };

/** 08:00 -> 8:00 am, the way the patient reads a clock. */
function clock(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Home checklist: tick each dose as it is taken. Marks save at once and can be undone. */
export function TodayDoses({ today, slots: initial, unscheduled }: { today: string; slots: SlotDoses[]; unscheduled: string[] }) {
  const [slots, setSlots] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const all = slots.flatMap((s) => s.items);
  const taken = all.filter((i) => i.status === "taken").length;

  async function mark(slot: DoseSlot, medicationId: string, status: "taken" | "skipped" | null) {
    const before = slots;
    const apply = (s: SlotDoses[]) =>
      s.map((x) => (x.slot !== slot ? x : { ...x, items: x.items.map((i) => (i.medicationId === medicationId ? { ...i, status } : i)) }));
    setSlots(apply);
    setError(null);
    const res = await fetch("/api/doses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ medication_id: medicationId, slot, dose_date: today, status }),
    }).catch(() => null);
    if (!res?.ok) {
      setSlots(before);
      setError("That did not save. Check your connection and try again.");
    }
  }

  return (
    <section id="doses" aria-labelledby="doses-title" className="scroll-mt-24 rounded-card border border-rule bg-sheet p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="doses-title" className="text-title font-bold">Today&apos;s medicines</h2>
          <p className="mt-1 text-ink-2" aria-live="polite">
            {taken === all.length ? "All done for today." : `${taken} of ${all.length} taken`}
          </p>
        </div>
        <Link href="/medicines#reminders" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline">
          <Bell aria-hidden className="size-5" /> Reminders
        </Link>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-pill bg-sheet-sunk" aria-hidden>
        <div className="h-full rounded-pill bg-verified transition-[width] duration-300 ease-out" style={{ width: `${all.length ? (taken / all.length) * 100 : 0}%` }} />
      </div>

      <div className="mt-5 space-y-5">
        {slots.map((s) => {
          const Icon = SLOT_ICONS[s.slot];
          return (
            <div key={s.slot}>
              <h3 className="flex items-center gap-2 font-bold">
                <Icon aria-hidden weight="duotone" className="size-5 text-primary" />
                {SLOT_LABELS[s.slot]} <span className="font-normal text-ink-2">{clock(s.time)}</span>
              </h3>
              <ul className="mt-2 divide-y divide-rule rounded-control border border-rule">
                {s.items.map((i) => (
                  <li key={i.medicationId} className={cn("flex flex-wrap items-center justify-between gap-2 px-3 py-2.5", i.status && "bg-sheet-sunk")}>
                    <div className="min-w-0">
                      <p className={cn("font-semibold", i.status === "skipped" && "text-ink-2 line-through")}>{i.name}</p>
                      {i.detail ? <p className="text-dense text-ink-2">{i.detail}</p> : null}
                    </div>
                    {i.status ? (
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center gap-1 font-semibold", i.status === "taken" ? "text-verified" : "text-ink-2")}>
                          {i.status === "taken" ? <Check aria-hidden weight="bold" className="size-5" /> : null}
                          {i.status === "taken" ? "Taken" : "Skipped"}
                        </span>
                        <button
                          type="button"
                          onClick={() => mark(s.slot, i.medicationId, null)}
                          className="flex size-11 items-center justify-center rounded-pill text-ink-2 hover:bg-sheet"
                          aria-label={`Undo ${i.name}, ${SLOT_LABELS[s.slot].toLowerCase()}`}
                        >
                          <ArrowCounterClockwise aria-hidden className="size-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => mark(s.slot, i.medicationId, "skipped")}
                          className="min-h-11 rounded-pill px-3 font-semibold text-ink-2 hover:bg-sheet-sunk"
                          aria-label={`Skip ${i.name}, ${SLOT_LABELS[s.slot].toLowerCase()}`}
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          onClick={() => mark(s.slot, i.medicationId, "taken")}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-primary px-4 font-semibold text-on-primary hover:bg-primary-strong"
                          aria-label={`Mark ${i.name} taken, ${SLOT_LABELS[s.slot].toLowerCase()}`}
                        >
                          <Check aria-hidden weight="bold" className="size-5" /> Taken
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {unscheduled.length ? (
        <p className="mt-4 text-dense text-ink-2">
          Not in the list because the prescription does not say when to take {unscheduled.length === 1 ? "it" : "them"}: {unscheduled.join(", ")}. Follow your doctor&apos;s instructions.
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-3 font-semibold text-severe">{error}</p> : null}
    </section>
  );
}
