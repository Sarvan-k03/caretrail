import { z } from "zod";
import { patientForRequest } from "@/lib/auth";
import { loadMedicines } from "@/lib/safety/load";
import { readTimes, SLOT_ORDER, todaysDoses } from "@/lib/doses/schedule";
import { todayIST } from "@/lib/format";
import { fail, invalid, ok, unauthorized } from "@/lib/api/respond";

const body = z.object({
  medication_id: z.uuid(),
  slot: z.enum(SLOT_ORDER),
  dose_date: z.iso.date(),
  // null clears the mark (an accidental tap).
  status: z.enum(["taken", "skipped"]).nullable(),
});

const yesterday = (today: string) => new Date(new Date(`${today}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);

/** Today's dose checklist and the patient's reminder times (also read by the reminder scheduler). */
export async function GET() {
  const session = await patientForRequest();
  if (!session) return unauthorized();
  const { supabase, patient } = session;
  const today = todayIST();
  try {
    const [{ groups }, logs] = await Promise.all([
      loadMedicines(supabase, patient.id),
      supabase.from("dose_logs").select("medication_id, dose_date, slot, status").eq("patient_id", patient.id).eq("dose_date", today),
    ]);
    if (logs.error) throw logs.error;
    const times = readTimes(patient.reminder_times);
    return ok({ today, times, name: patient.name, own: patient.relationship === "self", ...todaysDoses(groups, logs.data, today, times) });
  } catch {
    return fail(500, "Today's medicines could not load. Please try again.");
  }
}

/** Mark one dose taken or skipped, or clear the mark. Only today and yesterday can be marked. */
export async function POST(request: Request) {
  const session = await patientForRequest();
  if (!session) return unauthorized();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, patient } = session;
  const { medication_id, slot, dose_date, status } = parsed.data;
  const today = todayIST();
  if (dose_date !== today && dose_date !== yesterday(today)) return fail(422, "Only today's and yesterday's doses can be marked.");

  // RLS limits this to the patient's own medicines; the explicit patient check keeps the active profile honest.
  const { data: med } = await supabase.from("medications").select("id").eq("id", medication_id).eq("patient_id", patient.id).maybeSingle();
  if (!med) return fail(404, "This medicine was not found.");

  const { error } = status
    ? await supabase.from("dose_logs").upsert({ patient_id: patient.id, medication_id, dose_date, slot, status }, { onConflict: "medication_id,dose_date,slot" })
    : await supabase.from("dose_logs").delete().eq("medication_id", medication_id).eq("dose_date", dose_date).eq("slot", slot);
  return error ? fail(500, "That did not save. Please try again.") : ok({ medication_id, slot, dose_date, status });
}
