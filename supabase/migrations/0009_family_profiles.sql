-- Family profiles: one account can keep records for relatives (a parent, a child). Every patient table is
-- already scoped through owns_patient(), so an extra profile is just another patients row for the same owner.
alter table public.patients add column relationship text not null default 'self'
  check (relationship in ('self', 'parent', 'child', 'spouse', 'sibling', 'other'));

-- Clients may only insert the profile fields; token hashes and the demo flag stay server-written.
revoke insert on public.patients from authenticated;
grant insert (owner_user_id, name, dob, sex, blood_group, relationship) on public.patients to authenticated;
grant update (relationship) on public.patients to authenticated;
-- No delete grant: removing a profile goes through the server, which deletes its stored files first.
