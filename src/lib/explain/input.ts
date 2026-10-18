import { z } from "zod";

// What the explainer is given and what it must return. Whether a value is inside the range is worked
// out here, from the lab's own printed range, and never left to the model.

export const LANGS = ["en", "ta"] as const;
export type Lang = (typeof LANGS)[number];

export type LabForExplain = {
  id: string;
  test_name: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_range_text: string | null;
};

export type LabStatus = "below" | "within" | "above" | "no_range";

export function labStatus(l: Pick<LabForExplain, "value" | "ref_low" | "ref_high">): LabStatus {
  if (l.value === null || (l.ref_low === null && l.ref_high === null)) return "no_range";
  if (l.ref_low !== null && l.value < l.ref_low) return "below";
  if (l.ref_high !== null && l.value > l.ref_high) return "above";
  return "within";
}

const rangeText = (l: LabForExplain) =>
  l.ref_range_text ?? (l.ref_low !== null && l.ref_high !== null ? `${l.ref_low}-${l.ref_high}` : l.ref_low !== null ? `>= ${l.ref_low}` : l.ref_high !== null ? `<= ${l.ref_high}` : null);

/** The facts sent to the model: test names, values and ranges only. No name, age or other profile data. */
export function explainInput(labs: LabForExplain[]) {
  return labs.map((l) => ({
    id: l.id,
    test: l.test_name,
    value: l.value_text ?? (l.value !== null ? String(l.value) : null),
    unit: l.unit,
    range: rangeText(l),
    status: labStatus(l),
  }));
}

export const explanationSchema = z.object({
  summary: z.string().trim().min(1).max(900),
  items: z.array(z.object({ test: z.string().max(200), measures: z.string().trim().max(500), meaning: z.string().trim().max(500) })).max(80),
  questions: z.array(z.string().trim().min(1).max(240)).max(3),
});
export type ModelExplanation = z.infer<typeof explanationSchema>;

/** What is stored and shown: each explanation tied back to the lab row it is about. */
export type StoredExplanation = { summary: string; items: { id: string; measures: string; meaning: string }[]; questions: string[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Matches the model's items to the input rows: same position first, then by test name. Unmatched rows get no text. */
export function attachToRows(input: { id: string; test: string }[], out: ModelExplanation): StoredExplanation {
  const items = input.flatMap((row, i) => {
    const hit = (out.items[i] && norm(out.items[i].test) === norm(row.test) ? out.items[i] : undefined) ?? out.items.find((x) => norm(x.test) === norm(row.test));
    return hit ? [{ id: row.id, measures: hit.measures, meaning: hit.meaning }] : [];
  });
  return { summary: out.summary, items, questions: out.questions };
}
