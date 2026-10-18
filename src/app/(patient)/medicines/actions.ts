"use server";

import { revalidatePath } from "next/cache";
import { requirePatient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reminderTimesSchema } from "@/lib/doses/schedule";

export type TimesState = { ok?: boolean; message?: string; fields?: Record<string, string> };

/** The clock time for each part of the day, used by Today's medicines and the reminders. */
export async function saveReminderTimes(_prev: TimesState, form: FormData): Promise<TimesState> {
  const { patient } = await requirePatient();
  const parsed = reminderTimesSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), message: "Please fix the highlighted times." };
  }
  const { morning, afternoon, evening, night } = parsed.data;
  if (!(morning < afternoon && afternoon < evening && evening < night)) {
    return { message: "Keep the times in order: morning, then afternoon, evening and night." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("patients").update({ reminder_times: parsed.data }).eq("id", patient.id);
  if (error) return { message: "We could not save the times. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
