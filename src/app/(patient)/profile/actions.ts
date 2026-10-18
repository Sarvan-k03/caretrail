"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MAX_PROFILES, PROFILE_COOKIE, requirePatient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount as deleteAccountData, deletePatient } from "@/lib/account/delete";
import { allergySchema, familyProfileSchema, profileSchema } from "@/lib/schemas/profile";

export type FormState = { ok?: boolean; message?: string; fields?: Record<string, string> };

const fieldErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
  Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message]));

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { patient } = await requirePatient();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldErrors(parsed.error.issues), message: "Please fix the highlighted fields." };

  const supabase = await createClient();
  const { error } = await supabase.from("patients").update(parsed.data).eq("id", patient.id);
  if (error) return { message: "We could not save your details. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function addAllergy(_prev: FormState, form: FormData): Promise<FormState> {
  const { patient } = await requirePatient();
  const parsed = allergySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("allergies").insert({ ...parsed.data, patient_id: patient.id });
  if (error) return { message: "We could not add this allergy. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: `Added ${parsed.data.substance}.` };
}

const idSchema = z.uuid();

export async function updateAllergy(_prev: FormState, form: FormData): Promise<FormState> {
  const { patient } = await requirePatient();
  const id = idSchema.safeParse(form.get("id"));
  const parsed = allergySchema.safeParse(Object.fromEntries(form));
  if (!id.success) return { message: "This allergy no longer exists." };
  if (!parsed.success) return { fields: fieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("allergies").update(parsed.data).eq("id", id.data).eq("patient_id", patient.id);
  if (error) return { message: "We could not save this change. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function deleteAllergy(form: FormData) {
  const { patient } = await requirePatient();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("allergies").delete().eq("id", id.data).eq("patient_id", patient.id);
  revalidatePath("/", "layout");
}

const profileCookie = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 } as const;

/** Look at another family profile. Goes to Home, since the page open now belongs to the previous profile. */
export async function switchProfile(form: FormData) {
  const { profiles } = await requirePatient();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || !profiles.some((p) => p.id === id.data)) return;
  (await cookies()).set(PROFILE_COOKIE, id.data, profileCookie);
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function addFamilyProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { userId, profiles } = await requirePatient();
  if (profiles.length >= MAX_PROFILES) return { message: `One account can keep up to ${MAX_PROFILES} profiles.` };
  const parsed = familyProfileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: fieldErrors(parsed.error.issues), message: "Please fix the highlighted fields." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").insert({ ...parsed.data, owner_user_id: userId }).select("id").single();
  if (error) return { message: "We could not add this profile. Please try again." };
  (await cookies()).set(PROFILE_COOKIE, data.id, profileCookie);
  revalidatePath("/", "layout");
  redirect("/profile?added=1");
}

/** Removes a relative's profile with all its records. The account's own (first) profile cannot be removed here. */
export async function removeFamilyProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { userId, profiles } = await requirePatient();
  const id = idSchema.safeParse(form.get("id"));
  const target = id.success ? profiles.find((p) => p.id === id.data) : undefined;
  if (!target || target.id === profiles[0].id) return { message: "This profile cannot be removed." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== target.name.trim().toLowerCase()) {
    return { fields: { confirm: `Type ${target.name} to confirm.` } };
  }
  try {
    await deletePatient(target.id, userId);
  } catch {
    return { message: "We could not remove this profile. Please try again." };
  }
  const jar = await cookies();
  if (jar.get(PROFILE_COOKIE)?.value === target.id) jar.delete(PROFILE_COOKIE);
  revalidatePath("/", "layout");
  redirect("/profile?removed=1");
}

/** Deletes the login, every profile, every record and every stored file. Cannot be undone. */
export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const { userId, profiles } = await requirePatient();
  if (String(form.get("confirm") ?? "").trim() !== "DELETE") return { fields: { confirm: "Type DELETE in capital letters to confirm." } };
  try {
    await deleteAccountData(userId, profiles.map((p) => p.id));
  } catch {
    return { message: "We could not finish deleting your account. Please try again; anything already removed stays removed." };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(PROFILE_COOKIE);
  redirect("/?deleted=1");
}
