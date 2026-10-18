import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/db/types";

/** Which family profile the account is looking at. Only a hint: it is checked against the owner's profiles. */
export const PROFILE_COOKIE = "ct_profile";
export const MAX_PROFILES = 6;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Every profile the user owns, oldest (their own) first, and the active one. */
async function loadProfiles(supabase: Supabase, userId: string) {
  const [{ data: profiles }, jar] = await Promise.all([
    supabase.from("patients").select("*").eq("owner_user_id", userId).order("created_at", { ascending: true }).limit(MAX_PROFILES),
    cookies(),
  ]);
  if (!profiles?.length) return null;
  const wanted = jar.get(PROFILE_COOKIE)?.value;
  return { profiles, patient: profiles.find((p) => p.id === wanted) ?? profiles[0] };
}

/** The logged-in user, their active patient profile and all their profiles, or a redirect to login. Cached per request. */
export const requirePatient = cache(async (): Promise<{ userId: string; patient: Row<"patients">; profiles: Row<"patients">[] }> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const loaded = await loadProfiles(supabase, userId);
  if (!loaded) redirect("/login?error=no-profile");
  return { userId, ...loaded };
});

/** For route handlers: null instead of a redirect, so the handler can answer 401. */
export async function patientForRequest() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const loaded = await loadProfiles(supabase, userId);
  return loaded ? { supabase, userId, ...loaded } : null;
}
