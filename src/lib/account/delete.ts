import "server-only";
import { adminClient } from "@/lib/supabase/admin";

const PAGE = 1000;

/**
 * Removes everything stored outside the patient's rows: their files (all under `<patient id>/` in the
 * private bucket) and the cached AI reading of those files. The rows themselves go with the patient
 * (every patient table cascades). The access log is append-only by design and is kept.
 */
export async function removePatientFiles(patientId: string) {
  const admin = adminClient();
  const { data: docs } = await admin.from("documents").select("file_hash").eq("patient_id", patientId);
  const hashes = [...new Set((docs ?? []).map((d) => d.file_hash))];

  const bucket = admin.storage.from("documents");
  for (;;) {
    const { data: files, error } = await bucket.list(patientId, { limit: PAGE });
    if (error) throw new Error("storage list failed");
    if (!files.length) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${patientId}/${f.name}`));
    if (removeError) throw new Error("storage remove failed");
    if (files.length < PAGE) break;
  }

  // Another account may have uploaded the same file; it is then simply read again on its next upload.
  for (let i = 0; i < hashes.length; i += 100) {
    await admin.from("extraction_cache").delete().in("file_hash", hashes.slice(i, i + 100));
  }
}

/** Deletes one profile and its files. The caller has already checked the user owns it. */
export async function deletePatient(patientId: string, ownerId: string) {
  await removePatientFiles(patientId);
  const { error } = await adminClient().from("patients").delete().eq("id", patientId).eq("owner_user_id", ownerId);
  if (error) throw new Error("patient delete failed");
}

/** Deletes the login and, through the cascade from auth.users, every profile it owns. */
export async function deleteAccount(userId: string, patientIds: string[]) {
  for (const id of patientIds) await removePatientFiles(id);
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error("user delete failed");
}
