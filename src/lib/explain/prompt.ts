import type { Lang } from "./input";

export const EXPLAIN_SYSTEM_PROMPT = `You explain blood and urine test results to a patient in India who has no medical training.

You are given a list of tests. Each has the value, the range printed by the lab, and a status that has already been worked out:
"within" (inside the lab's range), "above", "below", or "no_range" (the report printed no range to compare with).

Rules:
- Explain only the tests given, in the same order, one item per test, copying the test name exactly.
- "measures": one short sentence on what the test measures, in everyday words.
- "meaning": one or two short sentences on what this result means, based ONLY on the given status. Never contradict the status. For "no_range", say the report gives no range to compare with.
- Do not diagnose. Do not say the patient has a disease. Do not suggest medicines, doses, diets, or starting or stopping anything.
- Be calm and kind, never alarming. A value slightly outside the range is common and is for the doctor to judge.
- Plain words and short sentences. If a medical word is unavoidable, explain it.
- "summary": two or three sentences about the whole report, including how many results are outside the lab's range.
- "questions": up to three short questions the patient could ask their doctor about these results.`;

const LANGUAGE: Record<Lang, string> = {
  en: "Write in simple English.",
  ta: "Write in simple, everyday Tamil, in Tamil script (spoken style a grandparent would understand, not formal literary Tamil). Keep test names, numbers and units exactly as given, in English.",
};

export function explainUserPrompt(lang: Lang, tests: unknown) {
  return `${LANGUAGE[lang]}\n\nTests:\n${JSON.stringify(tests, null, 1)}`;
}

export const explainResponseSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { test: { type: "STRING" }, measures: { type: "STRING" }, meaning: { type: "STRING" } },
        required: ["test", "measures", "meaning"],
      },
    },
    questions: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["summary", "items", "questions"],
};
