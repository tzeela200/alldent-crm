-- ============================================================
-- INC-3123 — זיכרון החלטות שדה ב-Inbox 2
--
-- הבעיה: אותו קונפליקט חזר בכל סנכרון. אם ב-Supabase "חיפה" וב-Google
-- "תל אביב" ונבחרה "חיפה" — הבחירה אינה מייצרת patch, ולכן
-- inbox_merge_actions.updates_applied נשאר ריק ולא נשארה שום עקבה.
--
-- הפתרון: כל החלטה נשמרת עם **שני הערכים שהושוו**, מנורמלים.
--
-- הורץ ואומת: 11.08.2026. אפס שינוי בטבלאות הליבה, במילונים,
-- בטריגרים או ב-RLS הקיים.
-- ============================================================

create table public.inbox_field_decisions (
  decision_id     bigint generated always as identity primary key,

  target_type     text   not null check (target_type in ('contact','account')),
  target_id       bigint not null,

  -- מפתח יציב לרשומת Google. lead_id מתחלף בכל סנכרון ולכן אינו מתאים לזהות.
  google_account_key   text not null,
  google_resource_name text not null,

  field_name      text not null,

  -- ערך ריק הוא מצב לגיטימי שצריך לזכור, לא "חוסר מידע".
  -- NOT NULL DEFAULT '' היא חגורה שנייה מעבר ל-NULLS NOT DISTINCT.
  supabase_value_norm  text not null default '',
  google_value_norm    text not null default '',

  selected_source text not null check (selected_source in ('supabase','google','manual')),
  selected_value  jsonb,

  approved_by     text,
  approved_at     timestamptz not null default now(),
  last_used_at    timestamptz,
  reuse_count     int not null default 0,

  -- ⚠ NULLS NOT DISTINCT (PG 15+; כאן 17.6). בלעדיו שתי החלטות שבהן אחד
  --   הערכים ריק לא נחשבות זהות — כי NULL <> NULL — ואותו קונפליקט
  --   ("Supabase ריק מול מייל מגוגל") היה חוזר לנצח.
  constraint inbox_field_decisions_unique unique nulls not distinct
    (target_type, target_id, google_account_key, google_resource_name,
     field_name, supabase_value_norm, google_value_norm)
);

create index inbox_field_decisions_lookup_idx
  on public.inbox_field_decisions (target_type, target_id, google_resource_name);

alter table public.inbox_field_decisions enable row level security;
create policy "Authenticated users only"
  on public.inbox_field_decisions for all to authenticated
  using (true) with check (true);


-- ------------------------------------------------------------
-- אישור מיזוג — כתיבה עקבית אחת
-- ------------------------------------------------------------
-- ארבע הכתיבות היו עד היום ארבע קריאות נפרדות מהדפדפן. כשל באמצע השאיר
-- את הרשומה מעודכנת בלי שההחלטה נשמרה — ואז אותו קונפליקט חוזר.
-- כאן הכול בטרנזקציה אחת: או הכול, או כלום.
create or replace function public.apply_inbox_merge_decision(
  p_lead_id              bigint,
  p_target_type          text,
  p_target_id            bigint,
  p_patch                jsonb   default '{}'::jsonb,
  p_decisions            jsonb   default '[]'::jsonb,
  p_merge_status         bigint  default 6,
  p_action_type          bigint  default 1,
  p_approved_by          text    default null,
  p_google_account_key   text    default null,
  p_google_resource_name text    default null,
  p_clear_other_match    boolean default false
)
returns jsonb
language plpgsql
security invoker                      -- תחת ה-JWT של המשתמשת, תחת RLS. אין service-role
set search_path = public
as $$
declare
  -- whitelist — עותק מדויק של CONTACT_WRITABLE/ACCOUNT_WRITABLE ב-
  -- src/lib/inbox-v2-merge.ts. עד היום נאכף ב-JS בלבד; פונקציה שמקבלת
  -- patch חופשי בלי אכיפה כאן הייתה חור שמאפשר כתיבה לכל עמודה.
  c_contact_allowed text[] := array['display_name','phone','second_phone','email',
                                    'second_email','role','city_id','facebook_name',
                                    'facebook_id','facebook_url'];
  c_account_allowed text[] := array['account_name','phone','second_phone','email',
                                    'second_email','city_id','facebook_name',
                                    'facebook_id','facebook_url'];
  v_allowed   text[];
  v_key       text;
  v_sets      text[] := '{}';
  v_applied   jsonb  := '{}'::jsonb;
  v_sql       text;
  v_updated   int    := 0;
  v_decision  jsonb;
  v_saved     int    := 0;
begin
  if p_target_type not in ('contact','account') then
    raise exception 'סוג יעד לא חוקי: %', p_target_type;
  end if;

  v_allowed := case when p_target_type = 'account' then c_account_allowed else c_contact_allowed end;

  -- (1) עדכון הליבה — רק עמודות מה-whitelist
  for v_key in select jsonb_object_keys(coalesce(p_patch, '{}'::jsonb))
  loop
    if not (v_key = any(v_allowed)) then
      raise exception 'שדה שאינו מותר לכתיבה: %', v_key;
    end if;
    v_sets    := v_sets || format('%I = ($1->>%L)', v_key, v_key);
    v_applied := v_applied || jsonb_build_object(v_key, p_patch->v_key);
  end loop;

  if array_length(v_sets, 1) > 0 then
    if p_target_type = 'account' then
      v_sql := format('update public.accounts set %s where account_id = $2',
                      array_to_string(v_sets, ', '));
    else
      v_sql := format('update public.contact set %s where contact_id = $2',
                      array_to_string(v_sets, ', '));
    end if;
    execute v_sql using p_patch, p_target_id;
    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      raise exception 'הרשומה לא נמצאה או שלא עודכנה';
    end if;
  end if;

  -- (2) שמירת ההחלטות — כולל "להשאיר את הערך הקיים", שאינה מייצרת patch
  --     ולכן לא הותירה עד היום שום עקבה
  if p_google_account_key is not null and p_google_resource_name is not null then
    for v_decision in select * from jsonb_array_elements(coalesce(p_decisions, '[]'::jsonb))
    loop
      insert into public.inbox_field_decisions (
        target_type, target_id, google_account_key, google_resource_name,
        field_name, supabase_value_norm, google_value_norm,
        selected_source, selected_value, approved_by, last_used_at, reuse_count
      ) values (
        p_target_type, p_target_id, p_google_account_key, p_google_resource_name,
        v_decision->>'field_name',
        coalesce(v_decision->>'supabase_value_norm', ''),
        coalesce(v_decision->>'google_value_norm', ''),
        v_decision->>'selected_source',
        v_decision->'selected_value',
        p_approved_by, now(), 0
      )
      on conflict on constraint inbox_field_decisions_unique do update
        set last_used_at    = now(),
            reuse_count     = public.inbox_field_decisions.reuse_count + 1,
            selected_source = excluded.selected_source,
            selected_value  = excluded.selected_value,
            approved_by     = coalesce(excluded.approved_by, public.inbox_field_decisions.approved_by);
      v_saved := v_saved + 1;
    end loop;
  end if;

  -- (3) סטטוס הרשומה ב-Inbox.
  --     במסלול סתירה חייבת להישאר בדיוק התאמה אחת: GOOGLE-01 רושם שגיאה
  --     ולא יוצר קישור כששתי העמודות מלאות (SSOT §18.5).
  if p_lead_id is not null then
    update public.inbox_v2
       set merge_status  = p_merge_status,
           match_contact = case when p_clear_other_match and p_target_type = 'account'
                                then null else match_contact end,
           match_account = case when p_clear_other_match and p_target_type = 'contact'
                                then null else match_account end,
           updated_at    = now()
     where lead_id = p_lead_id;
  end if;

  -- (4) Audit — נשאר בטבלה הקיימת, ללא שינוי מבנה
  insert into public.inbox_merge_actions
    (lead_id, target_type, target_id, action_type, updates_applied, approved_by)
  values
    (p_lead_id, p_target_type, p_target_id, p_action_type, v_applied, p_approved_by);

  return jsonb_build_object(
    'fields_updated',  coalesce(array_length(v_sets, 1), 0),
    'rows_updated',    v_updated,
    'decisions_saved', v_saved
  );
end;
$$;

-- ------------------------------------------------------------
-- Rollback
-- ------------------------------------------------------------
-- drop function if exists public.apply_inbox_merge_decision(
--   bigint, text, bigint, jsonb, jsonb, bigint, bigint, text, text, text, boolean);
-- drop table if exists public.inbox_field_decisions;
