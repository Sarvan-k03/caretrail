"use client";

import { useEffect, useState } from "react";
import { Bell, BellSlash, CheckCircle } from "@phosphor-icons/react";
import { saveReminderTimes, type TimesState } from "@/app/(patient)/medicines/actions";
import { SLOT_LABELS, SLOT_ORDER, type Adherence, type ReminderTimes } from "@/lib/doses/schedule";
import { remindersOn, setReminders } from "@/lib/doses/reminders-client";
import { useFormAction } from "@/components/ui/use-form-action";
import { Field, inputClass, describedBy } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Permission = "loading" | "unsupported" | "denied" | "off" | "on";

function NotificationSwitch() {
  const [state, setState] = useState<Permission>("loading");

  useEffect(() => {
    // Notification permission and the per-device switch only exist in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(!("Notification" in window) ? "unsupported" : Notification.permission === "denied" ? "denied" : remindersOn() ? "on" : "off");
  }, []);

  async function turnOn() {
    const result = await Notification.requestPermission();
    if (result !== "granted") return setState(result === "denied" ? "denied" : "off");
    setReminders(true);
    setState("on");
  }

  if (state === "loading") return null;
  if (state === "unsupported") return <p className="text-ink-2">This browser cannot show reminders. Add CareTrail to your home screen, or set an alarm on your phone.</p>;
  if (state === "denied") return <p className="text-ink-2">Notifications are blocked for CareTrail. Allow them in your browser&apos;s site settings, then come back here.</p>;
  return state === "on" ? (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="flex items-center gap-2 font-semibold text-verified">
        <CheckCircle aria-hidden weight="fill" className="size-5" /> Reminders are on for this device
      </p>
      <button type="button" onClick={() => (setReminders(false), setState("off"))} className={buttonClass("quiet", "dense")}>
        <BellSlash aria-hidden className="size-5" /> Turn off
      </button>
    </div>
  ) : (
    <button type="button" onClick={turnOn} className={buttonClass("primary", "dense")}>
      <Bell aria-hidden className="size-5" /> Turn on reminders
    </button>
  );
}

function TimesForm({ times, used }: { times: ReminderTimes; used: Set<string> }) {
  const { state, onSubmit, pending } = useFormAction(saveReminderTimes, {} as TimesState);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SLOT_ORDER.map((slot) => {
          const id = `time-${slot}`;
          const err = state.fields?.[slot];
          return (
            <Field key={slot} id={id} label={SLOT_LABELS[slot]} error={err}>
              <input id={id} name={slot} type="time" defaultValue={times[slot]} aria-invalid={Boolean(err)} aria-describedby={describedBy(id, undefined, err)} className={cn(inputClass, !used.has(slot) && "text-ink-2")} />
            </Field>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending} pendingLabel="Saving..." variant="secondary" size="dense">Save times</SubmitButton>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={cn("font-semibold", state.ok ? "text-verified" : "text-severe")}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}

function AdherenceList({ rows }: { rows: Adherence[] }) {
  if (!rows.length) return null;
  const marked = rows.some((r) => r.taken + r.skipped > 0);
  return (
    <div>
      <h3 className="text-lead font-bold">Last 7 days</h3>
      {marked ? (
        <ul className="mt-3 space-y-3">
          {rows.map((r) => {
            const pct = Math.round((r.taken / r.expected) * 100);
            return (
              <li key={r.key}>
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-dense text-ink-2">
                    {r.taken} of {r.expected} doses taken{r.skipped ? `, ${r.skipped} skipped` : ""}
                  </span>
                </p>
                <div className="mt-1 h-2 overflow-hidden rounded-pill bg-sheet-sunk" role="img" aria-label={`${pct}% of doses taken`}>
                  <div className="h-full rounded-pill bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-ink-2">Tick doses on Home as you take them, and you will see here how the week went. It helps to show your doctor.</p>
      )}
    </div>
  );
}

/** Medicines page: reminder switch (per device), the time of each part of the day, and the week's doses. */
export function RemindersPanel({ times, usedSlots, adherence }: { times: ReminderTimes; usedSlots: string[]; adherence: Adherence[] }) {
  return (
    <section id="reminders" aria-labelledby="reminders-title" className="scroll-mt-24 space-y-6 rounded-card border border-rule bg-sheet p-5 shadow-card sm:p-7">
      <div>
        <h2 id="reminders-title" className="text-title font-bold">Reminders</h2>
        <p className="mt-1 text-ink-2">
          CareTrail reminds you while it is open in a tab or added to your home screen. Phones may hold reminders back when CareTrail has been closed for a while, so keep an alarm for anything critical.
        </p>
      </div>
      <NotificationSwitch />
      <TimesForm times={times} used={new Set(usedSlots)} />
      <AdherenceList rows={adherence} />
    </section>
  );
}
