import "server-only";
import { serverEnv } from "@/lib/env";
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from "./prompt";
import { geminiResponseSchema } from "./schema";

export type ModelFailure = "timeout" | "unavailable" | "rejected" | "empty";

export class ModelError extends Error {
  constructor(readonly kind: ModelFailure, readonly status?: number) {
    super(kind);
  }
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

/** One generateContent call that must answer in JSON matching `schema`. Returns the raw JSON text. */
export async function generateJson(
  model: string,
  request: { system: string; parts: Part[]; schema: object; temperature?: number },
  timeoutMs: number,
  cancel?: AbortSignal,
) {
  const key = serverEnv().GEMINI_API_KEY;
  if (!key) throw new ModelError("unavailable");
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: request.parts }],
        generationConfig: { responseMimeType: "application/json", responseSchema: request.schema, temperature: request.temperature ?? 0 },
      }),
      signal: cancel ? AbortSignal.any([AbortSignal.timeout(timeoutMs), cancel]) : AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new ModelError(err instanceof DOMException && err.name === "TimeoutError" ? "timeout" : "unavailable");
  }
  if (!res.ok) throw new ModelError(res.status === 429 || res.status >= 500 ? "unavailable" : "rejected", res.status);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new ModelError("empty");
  return text;
}

/** Reads one document. Returns the raw JSON text the model produced. */
export function callGemini(model: string, file: { data: Buffer; mimeType: string }, timeoutMs: number, cancel?: AbortSignal) {
  return generateJson(
    model,
    {
      system: EXTRACTION_SYSTEM_PROMPT,
      parts: [{ inline_data: { mime_type: file.mimeType, data: file.data.toString("base64") } }, { text: EXTRACTION_USER_PROMPT }],
      schema: geminiResponseSchema,
    },
    timeoutMs,
    cancel,
  );
}
