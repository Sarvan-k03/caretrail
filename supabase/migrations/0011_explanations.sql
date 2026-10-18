-- Plain-language explanations of a lab report, for the patient only (never part of the doctor's brief).
-- One per document and language; input_hash is the hash of the results explained, so an edit re-explains.
create table public.explanations (
  document_id uuid not null references public.documents (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  lang text not null check (lang in ('en', 'ta')),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  content jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  primary key (document_id, lang)
);
create index explanations_patient_idx on public.explanations (patient_id);

alter table public.explanations enable row level security;
create policy explanations_select on public.explanations for select to authenticated using (public.owns_patient(patient_id));
create policy explanations_insert on public.explanations for insert to authenticated with check (public.owns_patient(patient_id));
create policy explanations_update on public.explanations for update to authenticated
  using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));
create policy explanations_delete on public.explanations for delete to authenticated using (public.owns_patient(patient_id));
revoke all on public.explanations from anon, authenticated;
grant select, insert, update, delete on public.explanations to authenticated;
grant all on public.explanations to service_role;
