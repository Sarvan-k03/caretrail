"use client";

import { useState } from "react";
import { WarningOctagon } from "@phosphor-icons/react";
import { useFormAction } from "@/components/ui/use-form-action";
import { deleteAccount, type FormState } from "@/app/(patient)/profile/actions";
import { Field, inputClass, describedBy } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass } from "@/components/ui/button";
import { clearOfflineCards } from "@/lib/offline-card";

/** Self-serve account deletion: two steps, and the word DELETE typed out, so it never happens by accident. */
export function DeleteAccount({ profileCount }: { profileCount: number }) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending } = useFormAction(async (prev: FormState, form: FormData) => {
    if (String(form.get("confirm") ?? "").trim() === "DELETE") clearOfflineCards();
    return deleteAccount(prev, form);
  }, {} as FormState);
  const err = state.fields?.confirm;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("danger", "dense")}>
        Delete my account
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-severe-rule bg-severe-soft p-4 sm:p-5" noValidate>
      <p className="flex items-center gap-2 text-lead font-bold text-severe">
        <WarningOctagon aria-hidden weight="fill" className="size-6 shrink-0" /> This deletes everything, for good
      </p>
      <ul className="list-disc space-y-1 pl-6 text-ink-2">
        <li>Your login{profileCount > 1 ? ` and all ${profileCount} family profiles` : ""}.</li>
        <li>Every document, medicine, result, note and share link. Doctors lose access at once.</li>
        <li>Your emergency QR stops working.</li>
      </ul>
      <p className="text-dense text-ink-2">
        Download your record (FHIR) first if you want a copy. The access log of who opened your record is kept, as the privacy policy explains.
      </p>
      <Field id="delete-confirm" label="Type DELETE to confirm" error={err}>
        <input id="delete-confirm" name="confirm" autoComplete="off" autoCapitalize="characters" aria-invalid={Boolean(err)} aria-describedby={describedBy("delete-confirm", undefined, err)} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingLabel="Deleting..." variant="danger" size="dense">Delete my account for good</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("quiet", "dense")}>Cancel</button>
      </div>
      {state.message ? <p role="alert" className="font-semibold text-severe">{state.message}</p> : null}
    </form>
  );
}
