import { z } from "zod";
import { doseSlots, decodeFrequency, type DoseSlot } from "@/lib/normalise/frequency";
import type { MedGroup } from "@/lib/safety/engine";

// Pure helpers for dose reminders: which doses are due today and how many were taken lately.

export const SLOT_ORDER: DoseSlot[] = ["morning", "afternoon", "evening", "night"];
export const SLOT_LABELS: Record<DoseSlot, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };
export const DEFAULT_TIMES: Record<DoseSlot, string> = { morning: "08:00", afternoon: "14:00", evening: "18:00", night: "21:00" };

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time like 08:00.");
export const reminderTimesSchema = z.object({ morning: time, afternoon: time, evening: time, night: time });
export type ReminderTimes = z.infer<typeof reminderTimesSchema>;

/** The stored times, falling back to the defaults for anything missing or malformed. */
export function readTimes(stored: unknown): ReminderTimes {
  const merged = { ...DEFAULT_TIMES, ...(stored && typeof stored === "object" ? stored : {}) };
  const parsed = reminderTimesSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_TIMES;
}

export type DoseLog = { medication_id: string; dose_date: string; slot: string; status: string };
export type DoseItem = { medicationId: string; name: string; detail: string | null; status: "taken" | "skipped" | null };
export type SlotDoses = { slot: DoseSlot; time: string; items: DoseItem[] };

/** Today's checklist: one entry per slot, each medicine in every slot its written pattern names. */
export function todaysDoses(groups: MedGroup[], logs: DoseLog[], today: string, times: ReminderTimes) {
  const scheduled: SlotDoses[] = SLOT_ORDER.map((slot) => ({ slot, time: times[slot], items: [] }));
  const unscheduled: string[] = [];
  for (const g of groups) {
    const slots = doseSlots(g.current.frequency);
    if (!slots) {
      unscheduled.push(g.current.brand_name);
      continue;
    }
    for (const slot of slots) {
      const log = logs.find((l) => g.ids.includes(l.medication_id) && l.dose_date === today && l.slot === slot);
      scheduled[SLOT_ORDER.indexOf(slot)].items.push({
        medicationId: g.current.id,
        name: g.current.brand_name,
        detail: [g.current.dose, decodeFrequency(g.current.frequency)].filter(Boolean).join(", ") || null,
        status: log?.status === "taken" || log?.status === "skipped" ? log.status : null,
      });
    }
  }
  return { slots: scheduled.filter((s) => s.items.length), unscheduled };
}

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export type Adherence = { key: string; name: string; expected: number; taken: number; skipped: number };

/**
 * Doses taken over the last `days` full days (today is still going, so it is left out). Days before
 * the medicine was started are not counted. Unmarked doses count as neither taken nor skipped.
 */
export function adherence(groups: MedGroup[], logs: DoseLog[], today: string, days = 7): Adherence[] {
  const from = addDays(today, -days);
  return groups.flatMap((g) => {
    const slots = doseSlots(g.current.frequency);
    if (!slots) return [];
    const start = g.history.reduce((min, m) => (m.start_date && m.start_date < min ? m.start_date : min), g.current.start_date ?? from);
    const first = start > from ? start : from;
    let counted = 0;
    for (let day = first; day < today; day = addDays(day, 1)) counted++;
    const mine = logs.filter((l) => g.ids.includes(l.medication_id) && l.dose_date >= first && l.dose_date < today);
    const expected = counted * slots.length;
    if (!expected) return [];
    return [{
      key: g.key,
      name: g.current.brand_name,
      expected,
      taken: mine.filter((l) => l.status === "taken").length,
      skipped: mine.filter((l) => l.status === "skipped").length,
    }];
  });
}
