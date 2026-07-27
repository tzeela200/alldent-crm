-- STATUS: ALREADY APPLIED. Verified live on 27.07.2026 against project
--         AllDent_CRM_2026 (urcdxdcyiedbdwegcebq) — both columns exist on
--         public.inbox_v2. Kept here as the historical record of the change.
--         Do NOT re-run as part of any new migration flow.
--
-- Originally generated: 26.07.2026, 23:12 — Asia/Jerusalem
-- Purpose: Add the two selected secondary fields missing from inbox_v2.

begin;

alter table public.inbox_v2
  add column if not exists second_phone text;

alter table public.inbox_v2
  add column if not exists second_email text;

comment on column public.inbox_v2.second_phone is
  'Secondary mobile/phone from source record, pending comparison and approval.';

comment on column public.inbox_v2.second_email is
  'Secondary email from source record, pending comparison and approval.';

commit;
