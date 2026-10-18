"use client";

import { useEffect } from "react";
import { SLOT_LABELS, type SlotDoses } from "@/lib/doses/schedule";
import { REMINDERS_CHANGED, remindersOn, showReminder } from "@/lib/doses/reminders-client";

type Today = { today: string; name: string; own: boolean; slots: SlotDoses[] };

const LATE_MS = 60 * 60 * 1000; // a reminder missed while the app was closed is still shown within the hour
const at = (today: string, time: string) => new Date(`${today}T${time}:00+05:30`).getTime();

async function loadToday(): Promise<Today | null> {
  const res = await fetch("/api/doses", { cache: "no-store" }).catch(() => null);
  return res?.ok ? (await res.json()).data : null;
}

function alreadyShown(tag: string) {
  try {
    if (localStorage.getItem(tag)) return true;
    localStorage.setItem(tag, "1");
  } catch {
    // Without storage a reminder may repeat on reload; better than none.
  }
  return false;
}

/**
 * Schedules today's dose reminders while CareTrail is open (in a tab or as an installed app). Before
 * showing one it checks again, so a dose already ticked never triggers a reminder.
 */
export function DoseReminders() {
  useEffect(() => {
    let timers: number[] = [];
    let cancelled = false;

    async function fire(slot: SlotDoses["slot"]) {
      const data = await loadToday();
      const pending = data?.slots.find((s) => s.slot === slot)?.items.filter((i) => !i.status) ?? [];
      if (!data || !pending.length || !remindersOn()) return;
      const tag = `ct_reminded_${data.today}_${slot}`;
      if (alreadyShown(tag)) return;
      const who = data.own ? "your" : `${data.name.split(" ")[0]}'s`;
      await showReminder(`Time for ${who} ${SLOT_LABELS[slot].toLowerCase()} medicines`, `${pending.map((i) => i.name).join(", ")}. Tap to mark them taken.`, tag);
    }

    async function plan() {
      timers.forEach(clearTimeout);
      timers = [];
      if (!remindersOn()) return;
      const data = await loadToday();
      if (!data || cancelled) return;
      const now = Date.now();
      for (const s of data.slots) {
        if (!s.items.some((i) => !i.status)) continue;
        const wait = at(data.today, s.time) - now;
        if (wait > 0) timers.push(window.setTimeout(() => void fire(s.slot), wait));
        else if (wait > -LATE_MS) void fire(s.slot);
      }
      // Plan tomorrow's reminders just after midnight IST.
      const midnight = at(data.today, "23:59") + 2 * 60 * 1000 - now;
      timers.push(window.setTimeout(() => void plan(), Math.max(midnight, 60_000)));
    }

    const onVisible = () => document.visibilityState === "visible" && void plan();
    void plan();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(REMINDERS_CHANGED, plan);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(REMINDERS_CHANGED, plan);
    };
  }, []);
  return null;
}
