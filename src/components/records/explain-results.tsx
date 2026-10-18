"use client";

import { useState } from "react";
import { ChatCircleText, CircleNotch, Translate, Warning, Info } from "@phosphor-icons/react";
import type { Lang, LabStatus, StoredExplanation } from "@/lib/explain/input";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type ExplainLab = { id: string; test_name: string; value: string | null; unit: string | null; status: LabStatus };

const COPY: Record<Lang, { status: Record<LabStatus, string>; questions: string; note: string; button: string }> = {
  en: {
    status: { within: "Within the lab's range", above: "Above the lab's range", below: "Below the lab's range", no_range: "No range on the report" },
    questions: "Questions you could ask your doctor",
    note: "Written by AI from the results above, for you only. Doctors never see it. It is not a diagnosis: discuss your results with your doctor, and do not change medicines on your own.",
    button: "Explain in simple English",
  },
  ta: {
    status: { within: "ஆய்வக வரம்புக்குள் உள்ளது", above: "ஆய்வக வரம்பை விட அதிகம்", below: "ஆய்வக வரம்பை விட குறைவு", no_range: "அறிக்கையில் வரம்பு இல்லை" },
    questions: "உங்கள் மருத்துவரிடம் கேட்கக்கூடிய கேள்விகள்",
    note: "இந்த விளக்கத்தை AI எழுதியது, உங்களுக்காக மட்டும். மருத்துவர்கள் இதைப் பார்ப்பதில்லை. இது நோயறிதல் அல்ல: உங்கள் முடிவுகளைப் பற்றி மருத்துவரிடம் பேசுங்கள், நீங்களாக மருந்துகளை மாற்ற வேண்டாம்.",
    button: "தமிழில் விளக்கவும்",
  },
};

/** "What do my results mean?" in plain English or Tamil. In or out of range comes from the report, never from the AI. */
export function ExplainResults({ documentId, labs, initial }: { documentId: string; labs: ExplainLab[]; initial: Partial<Record<Lang, StoredExplanation>> }) {
  const [content, setContent] = useState(initial);
  const [lang, setLang] = useState<Lang | null>(initial.en ? "en" : initial.ta ? "ta" : null);
  const [busy, setBusy] = useState<Lang | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function explain(next: Lang) {
    setError(null);
    if (content[next]) return setLang(next);
    setBusy(next);
    const res = await fetch(`/api/documents/${documentId}/explain`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: next }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(null);
    if (!res?.ok || !json?.data) return setError(json?.error?.message ?? "The explanation could not load. Check your connection and try again.");
    setContent((c) => ({ ...c, [next]: json.data.content }));
    setLang(next);
  }

  const shown = lang ? content[lang] : undefined;
  const copy = COPY[lang ?? "en"];

  return (
    <section aria-labelledby="explain-title" className="rounded-card border border-rule bg-sheet p-5 shadow-card sm:p-6">
      <h2 id="explain-title" className="flex items-center gap-2 text-title font-bold">
        <ChatCircleText aria-hidden weight="duotone" className="size-6 text-primary" /> What do these results mean?
      </h2>
      <p className="mt-1 text-ink-2">A short explanation in everyday words, in English or Tamil.</p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Language">
        {(["en", "ta"] as const).map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            disabled={busy !== null}
            aria-pressed={lang === l}
            onClick={() => explain(l)}
            className={buttonClass(lang === l ? "primary" : "secondary", "dense", "whitespace-normal text-center")}
          >
            {busy === l ? <CircleNotch aria-hidden weight="bold" className="size-5 animate-spin" /> : <Translate aria-hidden className="size-5" />}
            {busy === l ? (l === "en" ? "Explaining..." : "விளக்குகிறது...") : COPY[l].button}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-3 font-semibold text-severe">{error}</p> : null}

      {shown && lang ? (
        <div lang={lang} className="mt-5 space-y-5" aria-live="polite">
          <p className="text-lead">{shown.summary}</p>
          <ul className="divide-y divide-rule border-y border-rule">
            {labs.map((l) => {
              const text = shown.items.find((i) => i.id === l.id);
              const outside = l.status === "above" || l.status === "below";
              return (
                <li key={l.id} className="py-3.5">
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span lang="en" className="font-bold">{l.test_name}</span>
                    {l.value ? <span lang="en" className="tabular-nums text-ink-2">{l.value} {l.unit}</span> : null}
                  </p>
                  <p className={cn("mt-1 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-meta font-semibold", outside ? "bg-verify-soft text-verify" : "bg-sheet-sunk text-ink-2")}>
                    {outside ? <Warning aria-hidden weight="fill" className="size-4" /> : <Info aria-hidden className="size-4" />}
                    {copy.status[l.status]}
                  </p>
                  {text ? (
                    <>
                      <p className="mt-2">{text.measures}</p>
                      <p className="mt-1 text-ink-2">{text.meaning}</p>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {shown.questions.length ? (
            <div>
              <h3 className="font-bold">{copy.questions}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                {shown.questions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          ) : null}
          <p className="rounded-control bg-sheet-sunk px-4 py-3 text-dense text-ink-2">{copy.note}</p>
        </div>
      ) : null}
    </section>
  );
}
