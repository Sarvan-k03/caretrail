import { z } from "zod";
import { patientForRequest } from "@/lib/auth";
import { allowRequest } from "@/lib/sharing/request";
import { explainLabs, inputHash } from "@/lib/explain/run";
import { LANGS, type StoredExplanation } from "@/lib/explain/input";
import { fail, invalid, ok, tooMany, unauthorized } from "@/lib/api/respond";

// Two models in turn, 25 s each at most.
export const maxDuration = 60;

const body = z.object({ lang: z.enum(LANGS) });
const LAB_COLUMNS = "id, test_name, value, value_text, unit, ref_low, ref_high, ref_range_text";

/**
 * Explains a saved lab report in plain words, for the patient only. Built from the saved (patient-checked)
 * rows, never the file; cached per document and language until the results change.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/documents/[id]/explain">) {
  const session = await patientForRequest();
  if (!session) return unauthorized();
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) return fail(404, "This record was not found.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, patient } = session;
  const { lang } = parsed.data;

  const { data: doc } = await supabase.from("documents").select("id, extraction_status").eq("id", id.data).eq("patient_id", patient.id).maybeSingle();
  if (!doc) return fail(404, "This record was not found.");
  if (doc.extraction_status !== "completed") return fail(409, "Save this record first, then ask for an explanation.");

  const { data: labs, error } = await supabase.from("lab_results").select(LAB_COLUMNS).eq("source_document_id", doc.id).order("created_at");
  if (error) return fail(500, "The results could not load. Please try again.");
  if (!labs.length) return fail(422, "This record has no test results to explain.");

  const hash = inputHash(labs, lang);
  const { data: cached } = await supabase.from("explanations").select("content, input_hash").eq("document_id", doc.id).eq("lang", lang).maybeSingle();
  if (cached?.input_hash === hash) return ok({ lang, content: cached.content as StoredExplanation, cached: true });

  if (!(await allowRequest(request, `explain:${patient.id}`, 10, 60))) return tooMany();
  const result = await explainLabs(labs, lang);
  if (!result.ok) return fail(503, "The explanation service is busy. Please try again in a minute.");

  await supabase
    .from("explanations")
    .upsert({ document_id: doc.id, patient_id: patient.id, lang, input_hash: hash, content: result.content, model: result.model }, { onConflict: "document_id,lang" });
  return ok({ lang, content: result.content, cached: false });
}
