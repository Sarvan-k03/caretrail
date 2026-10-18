import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { generateJson, ModelError } from "@/lib/extraction/gemini";
import { attachToRows, explainInput, explanationSchema, type LabForExplain, type Lang, type StoredExplanation } from "./input";
import { EXPLAIN_SYSTEM_PROMPT, explainResponseSchema, explainUserPrompt } from "./prompt";

const ATTEMPT_MS = 25_000;

/** The model never sees row ids; answers are matched back by position and test name. */
const facts = (labs: LabForExplain[]) => explainInput(labs).map(({ test, value, unit, range, status }) => ({ test, value, unit, range, status }));

/** Same results and language give the same hash, so an unchanged report is never explained twice. */
export function inputHash(labs: LabForExplain[], lang: Lang) {
  return createHash("sha256").update(JSON.stringify([lang, facts(labs)])).digest("hex");
}

export type ExplainResult = { ok: true; content: StoredExplanation; model: string } | { ok: false };

/** Tries each configured model in turn. Only test names, values and ranges are sent. */
export async function explainLabs(labs: LabForExplain[], lang: Lang): Promise<ExplainResult> {
  const input = explainInput(labs);
  const models = serverEnv().GEMINI_MODELS.split(",").map((m) => m.trim()).filter(Boolean).slice(0, 2);
  for (const model of models) {
    try {
      const text = await generateJson(
        model,
        {
          system: EXPLAIN_SYSTEM_PROMPT,
          parts: [{ text: explainUserPrompt(lang, facts(labs)) }],
          schema: explainResponseSchema,
          temperature: 0.2,
        },
        ATTEMPT_MS,
      );
      const parsed = explanationSchema.safeParse(JSON.parse(text));
      if (parsed.success) return { ok: true, content: attachToRows(input, parsed.data), model };
      console.warn(`explain invalid output model=${model}`);
    } catch (err) {
      console.warn(`explain attempt failed model=${model} kind=${err instanceof ModelError ? err.kind : "error"}`);
    }
  }
  return { ok: false };
}
