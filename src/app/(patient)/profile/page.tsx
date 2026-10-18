import type { Metadata } from "next";
import { requirePatient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { PageBody, PageHeader, SheetSection } from "@/components/ui/page";
import { AddAllergyForm, AllergyItem, ProfileForm } from "@/components/patient/profile-forms";
import { buttonClass } from "@/components/ui/button";
import { DownloadSimple } from "@phosphor-icons/react/ssr";
import { AddFamilyProfileForm, FamilyProfileList } from "@/components/patient/family-profiles";
import { DeleteAccount } from "@/components/patient/delete-account";
import { MAX_PROFILES } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { patient, profiles } = await requirePatient();
  const { added, removed } = await searchParams;
  const own = patient.id === profiles[0].id;
  const supabase = await createClient();
  const { data: allergies, error } = await supabase
    .from("allergies")
    .select("*")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader
        kicker={own ? undefined : "Family profile"}
        title={own ? "Your profile" : `${patient.name}'s profile`}
        subtitle="Doctors and emergency staff rely on these details. Keep them current."
      />
      <PageBody>
        {added === "1" ? (
          <Alert tone="info" title={`${patient.name}'s profile is ready`} role="status">
            You are now looking at their record. Add their blood group, allergies and an emergency contact below, then upload their prescriptions.
          </Alert>
        ) : removed === "1" ? (
          <Alert tone="info" title="Profile removed" role="status">
            That profile and all its records have been deleted.
          </Alert>
        ) : null}
        <ProfileForm patient={patient} />

        <SheetSection id="allergies" title="Allergies" description="CareTrail warns you if a new medicine matches one of these.">
          {error ? (
            <Alert tone="severe" title="Allergies could not load" role="alert">
              Refresh the page to try again.
            </Alert>
          ) : allergies.length === 0 ? (
            <p className="rounded-control bg-sheet-sunk px-4 py-3 text-ink-2">
              No allergies recorded. If you have none, leave this empty. Your emergency card will say &quot;No known allergies recorded&quot;.
            </p>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {allergies.map((a) => (
                <AllergyItem key={a.id} allergy={a} />
              ))}
            </ul>
          )}
          <div className="mt-6 rounded-card bg-sheet-sunk p-4 sm:p-6">
            <h3 className="mb-4 text-lead font-bold">Add an allergy</h3>
            <AddAllergyForm />
          </div>
        </SheetSection>

        <SheetSection id="export" title="Take your record anywhere" description="Download everything you have saved (allergies, conditions, medicines and results, each with its source) as a FHIR R4 file, the standard format hospital systems and health apps read.">
          <a href="/api/export/fhir" download className={buttonClass("secondary", undefined, "w-full whitespace-normal text-center sm:w-auto")}>
            <DownloadSimple aria-hidden className="size-5" /> Download my record (FHIR)
          </a>
        </SheetSection>

        <SheetSection
          id="family"
          title="Family profiles"
          description="Keep records for a parent or child under your account. Each profile has its own medicines, safety checks, sharing and emergency card."
        >
          <FamilyProfileList profiles={profiles.map((p) => ({ id: p.id, name: p.name, relationship: p.relationship, dob: p.dob }))} activeId={patient.id} />
          <div className="mt-6 rounded-card bg-sheet-sunk p-4 sm:p-6">
            <h3 className="mb-4 text-lead font-bold">Add a family member</h3>
            <AddFamilyProfileForm atLimit={profiles.length >= MAX_PROFILES} />
          </div>
        </SheetSection>

        <SheetSection id="delete" title="Delete your account" description="Permanently remove your login, every profile and every record from CareTrail.">
          <DeleteAccount profileCount={profiles.length} />
        </SheetSection>
      </PageBody>
    </>
  );
}
