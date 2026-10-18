"use client";

import { useState } from "react";
import { ArrowsLeftRight, Trash, UserPlus } from "@phosphor-icons/react";
import { useFormAction } from "@/components/ui/use-form-action";
import { addFamilyProfile, removeFamilyProfile, switchProfile, type FormState } from "@/app/(patient)/profile/actions";
import { RELATIONSHIPS, RELATIONSHIP_LABELS } from "@/lib/schemas/profile";
import { ChoiceTiles } from "@/components/ui/choice-tiles";
import { Field, inputClass, describedBy } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass } from "@/components/ui/button";
import { ageFrom } from "@/lib/format";

type Profile = { id: string; name: string; relationship: string; dob: string | null };

function Message({ state }: { state: FormState }) {
  return state.message ? <p role="alert" className="rounded-control bg-severe-soft px-4 py-3 font-semibold text-severe">{state.message}</p> : null;
}

export function AddFamilyProfileForm({ atLimit }: { atLimit: boolean }) {
  const { state, onSubmit, pending } = useFormAction(addFamilyProfile, {} as FormState);
  const err = state.fields ?? {};
  if (atLimit) return <p className="text-ink-2">You have reached the limit of profiles for one account.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-[3fr_2fr]">
        <Field id="family-name" label="Their full name" error={err.name}>
          <input id="family-name" name="name" autoComplete="off" aria-invalid={Boolean(err.name)} aria-describedby={describedBy("family-name", undefined, err.name)} className={inputClass} />
        </Field>
        <Field id="family-dob" label="Date of birth" optional error={err.dob}>
          <input id="family-dob" name="dob" type="date" aria-invalid={Boolean(err.dob)} aria-describedby={describedBy("family-dob", undefined, err.dob)} className={inputClass} />
        </Field>
      </div>
      <ChoiceTiles
        name="relationship"
        legend="They are your"
        columns="grid-cols-2 sm:grid-cols-5"
        error={err.relationship}
        options={RELATIONSHIPS.map((r) => ({ value: r, label: RELATIONSHIP_LABELS[r] }))}
      />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending} pendingLabel="Adding..." variant="secondary">
          <UserPlus aria-hidden className="size-5" /> Add profile
        </SubmitButton>
      </div>
      <Message state={state} />
    </form>
  );
}

function RemoveProfile({ profile }: { profile: Profile }) {
  const [confirming, setConfirming] = useState(false);
  const { state, onSubmit, pending } = useFormAction(removeFamilyProfile, {} as FormState);
  const id = `remove-${profile.id}`;
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={buttonClass("quiet", "dense", "text-severe hover:bg-severe-soft")} aria-label={`Remove ${profile.name}`}>
        <Trash aria-hidden className="size-5" /> Remove
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 w-full space-y-3 rounded-control border border-severe-rule bg-severe-soft p-4" noValidate>
      <input type="hidden" name="id" value={profile.id} />
      <p className="font-bold text-severe">Remove {profile.name} and all their records?</p>
      <p className="text-dense text-ink-2">Their documents, medicines, results, share links and emergency card are deleted for good. This cannot be undone.</p>
      <Field id={id} label={`Type ${profile.name} to confirm`} error={state.fields?.confirm}>
        <input id={id} name="confirm" autoComplete="off" aria-invalid={Boolean(state.fields?.confirm)} aria-describedby={describedBy(id, undefined, state.fields?.confirm)} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={pending} pendingLabel="Removing..." variant="danger" size="dense">Remove for good</SubmitButton>
        <button type="button" onClick={() => setConfirming(false)} className={buttonClass("quiet", "dense")}>Keep</button>
      </div>
      <Message state={state} />
    </form>
  );
}

/** Every profile on the account. The first is the account holder's own and cannot be removed. */
export function FamilyProfileList({ profiles, activeId }: { profiles: Profile[]; activeId: string }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {profiles.map((p, i) => {
        const age = ageFrom(p.dob);
        return (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-lead font-bold">
                {p.name}
                {p.id === activeId ? <span className="ml-2 rounded-pill bg-primary-soft px-2.5 py-0.5 align-middle text-meta font-semibold text-primary">Open now</span> : null}
              </p>
              <p className="text-ink-2">{[i === 0 ? "You" : RELATIONSHIP_LABELS[p.relationship] ?? "Family", age !== null ? `${age} years` : null].filter(Boolean).join(", ")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.id !== activeId ? (
                <form action={switchProfile}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={buttonClass("secondary", "dense")} aria-label={`Open ${p.name}'s record`}>
                    <ArrowsLeftRight aria-hidden className="size-5" /> Open
                  </button>
                </form>
              ) : null}
              {i > 0 ? <RemoveProfile profile={p} /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
