-- GOOGLE-01 — READ-ONLY PREFLIGHT
-- Verified live: 27.07.2026
-- This file performs SELECT statements only. No DDL, no DML, no migration.

-- 1. Required inbox fields
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public'
  and table_name='inbox_v2'
  and column_name in (
    'source_type','source_name','source_unique_key','display_name',
    'phone','phone_norm','second_phone','email','second_email',
    'facebook_name','facebook_id','facebook_url',
    'temp_role','temp_city_id','temp_region_id',
    'raw_payload','parsed_payload','suggested_updates',
    'match_contact','match_account','match_reason',
    'has_new_information','merge_status','last_seen_at','seen_count'
  )
order by column_name;

-- 2. Unique source key
select tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as columns
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.table_schema=kcu.table_schema
 and tc.table_name=kcu.table_name
 and tc.constraint_name=kcu.constraint_name
where tc.table_schema='public'
  and tc.table_name='inbox_v2'
  and tc.constraint_type='UNIQUE'
group by tc.constraint_name, tc.constraint_type;

-- 3. Google link contract
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='google_contact_links'
order by ordinal_position;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid='public.google_contact_links'::regclass
order by conname;

-- 4. Required functions
select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'normalize_il_mobile_phone',
    'detect_role_from_text',
    'resolve_city',
    'match_inbox_row'
  )
order by p.proname;

-- 5. Approved role aliases
select a.alias, a.normalized_alias, a.match_mode, a.priority,
       a.confidence, a.is_active, a.role_id, r.name as role_name
from public.dict_role_aliases a
join public.dict_roles r on r.id=a.role_id
where a.alias in ('מועמדת','דנטל')
order by a.alias;

-- 6. Functional verification of aliases
select 'מועמדת אשדוד' as input, *
from public.detect_role_from_text('מועמדת אשדוד')
union all
select 'דנטל אשדוד' as input, *
from public.detect_role_from_text('דנטל אשדוד');

-- 7. Source/status/action dictionaries
select 'source' as kind, id, name
from public.dict_source_types where id=5
union all
select 'status', id, name
from public.dict_inbox_statuses where id in (5,6,7,8,9,11)
union all
select 'action', id, name
from public.dict_inbox_action_types where id in (1,3,8)
order by kind, id;

-- 8. Audit status constraint
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid='public.integration_sync_runs'::regclass
  and conname='integration_sync_runs_status_chk';

-- 9. Relevant triggers
select event_object_table, trigger_name, action_timing,
       event_manipulation, action_statement
from information_schema.triggers
where trigger_schema='public'
  and event_object_table in ('contact','accounts')
  and trigger_name in (
    'trg_contact_set_phone_norm',
    'trg_account_set_phone_norm',
    'trg_contact_fill_region_locality_from_city',
    'trg_accounts_fill_region_from_city_id'
  )
order by event_object_table, trigger_name, event_manipulation;
