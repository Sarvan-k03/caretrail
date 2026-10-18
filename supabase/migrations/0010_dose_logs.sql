-- Medicine reminders: the patient marks each dose taken or skipped. Slots come from the written dosing
-- pattern (1-0-1 = morning and night); the clock time of each slot is the patient's own choice.
create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  dose_date date not null,
  slot text not null check (slot in ('morning', 'afternoon', 'evening', 'night')),
  status text not null check (status in ('taken', 'skipped')),
  created_at timestamptz not null default now(),
  unique (medication_id, dose_date, slot)
);
create index dose_logs_patient_date_idx on public.dose_logs (patient_id, dose_date desc);

alter table public.dose_logs enable row level security;
create policy dose_logs_select on public.dose_logs for select to authenticated using (public.owns_patient(patient_id));
create policy dose_logs_insert on public.dose_logs for insert to authenticated with check (public.owns_patient(patient_id));
create policy dose_logs_update on public.dose_logs for update to authenticated
  using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id));
create policy dose_logs_delete on public.dose_logs for delete to authenticated using (public.owns_patient(patient_id));
-- New tables get Supabase default grants (anon included); reset them to exactly what is needed.
revoke all on public.dose_logs from anon, authenticated;
grant select, insert, update, delete on public.dose_logs to authenticated;
grant all on public.dose_logs to service_role;

alter table public.patients add column reminder_times jsonb not null
  default '{"morning": "08:00", "afternoon": "14:00", "evening": "18:00", "night": "21:00"}';
grant update (reminder_times) on public.patients to authenticated;
