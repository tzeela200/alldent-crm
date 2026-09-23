-- ═══════════════════════════════════════════════════════════════════════════
-- INC-3146 — מיזוג אנשי קשר בלי איבוד נתונים
--
-- מחליף את גוף הפונקציה merge_contacts(master_id, dup_ids, overrides).
-- אותה חתימה ואותו RETURNS void ⇒ CREATE OR REPLACE שומר את ההרשאות הקיימות
-- (postgres / authenticated / service_role, בלי PUBLIC ובלי anon).
-- הגרסה הישנה merge_contacts(keep_id, discard_id) לא נוגעים בה.
--
-- מה השתנה לעומת הגרסה החיה:
--  1. כל עמודות contact נכנסות למיזוג (קודם: 12 בלבד; שם פייסבוק ועוד ~55 שדות
--     של הכפולה נמחקו). שדה בלי בחירה: ערך המאסטר, ואם ריק — הראשון מהכפולות.
--     רשימות מאוחדות, הערות מחוברות, תאריך יצירה המוקדם, קשר אחרון המאוחר.
--  2. overrides[field] יכול להיות:
--       {"from": <id>}   ערך מרשומה מסוימת (המסד מעתיק — facebook_id > 2^53)
--       {"union": true}  איחוד הרשימות
--       {"value": ...}   ערך מפורש
--       ערך רגיל         תאימות לאחור לגרסת המסך הקודמת
--  3. נייד/מייל נוסף ברירת מחדל: הערך הבא שאינו זהה לראשי (כמו קודם).
--  4. רשומות מקושרות עוברות למאסטר במקום להימחק (CASCADE) או להתנתק (SET NULL):
--     google_contact_links, fix_contact_links, contact_profile_history,
--     contact_messages, whatsapp_campaign_recipients, communication_suppressions,
--     employment_intake(_action), contact_requests, inbox (הישן), rel_contact_sub_roles.
--  5. תגיות עוברות עם tag_id (קודם רק הטקסט).
--  6. עותק מלא של כל כפולה נשמר ב-contact_profile_history (source='merge').
--
-- Rollback: 20260923_inc3146_lossless_merge_contacts_ROLLBACK.sql
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.merge_contacts(master_id bigint, dup_ids bigint[], overrides jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dups      bigint[] := ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(dup_ids, '{}'::bigint[])) x WHERE x IS NOT NULL);
  v_all       bigint[];
  v_protected text[] := ARRAY['contact_id','phone_norm','profile_token','updated_timestamp','dup_email_flag','prev_applications_count'];
  v_master    jsonb;
  v_rows      jsonb;   -- רשומות הכפולות, לפי הסדר ב-dup_ids
  v_src       jsonb;   -- מאסטר + כפולות: [{"r": row, "o": order}]
  v_final     jsonb;
  v_col       record;
  v_o         jsonb;
  v_val       jsonb;
  v_from      bigint;
  v_primary   text;
  v_set       text[] := '{}';
  v_key       text;
BEGIN
  overrides := COALESCE(overrides, '{}'::jsonb);

  IF cardinality(v_dups) = 0 THEN
    RAISE EXCEPTION 'dup_ids is empty';
  END IF;
  IF master_id = ANY(v_dups) THEN
    RAISE EXCEPTION 'master_id cannot also appear in dup_ids';
  END IF;
  v_all := master_id || v_dups;

  PERFORM 1 FROM public.contact WHERE contact_id = ANY(v_all) ORDER BY contact_id FOR UPDATE;
  IF (SELECT count(*) FROM public.contact WHERE contact_id = ANY(v_all)) <> cardinality(v_all) THEN
    RAISE EXCEPTION 'one or more contacts in the merge were not found';
  END IF;

  SELECT to_jsonb(c) INTO v_master FROM public.contact c WHERE c.contact_id = master_id;
  SELECT jsonb_agg(to_jsonb(c) ORDER BY array_position(v_dups, c.contact_id))
    INTO v_rows FROM public.contact c WHERE c.contact_id = ANY(v_dups);
  SELECT jsonb_build_array(jsonb_build_object('r', v_master, 'o', 0))
         || COALESCE(jsonb_agg(jsonb_build_object('r', e, 'o', i) ORDER BY i), '[]'::jsonb)
    INTO v_src FROM jsonb_array_elements(v_rows) WITH ORDINALITY x(e, i);
  v_final := v_master;

  -- ── 1. הערך הסופי לכל עמודה ─────────────────────────────────────────────
  FOR v_col IN
    SELECT a.attname::text AS name, (t.typcategory = 'A') AS is_array
    FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
    WHERE a.attrelid = 'public.contact'::regclass AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum
  LOOP
    CONTINUE WHEN v_col.name = ANY(v_protected);
    v_o := overrides -> v_col.name;
    v_val := NULL;

    IF v_o IS NOT NULL AND jsonb_typeof(v_o) = 'object' AND v_o ? 'from' THEN
      v_from := (v_o ->> 'from')::bigint;
      IF v_from IS NULL OR NOT (v_from = ANY(v_all)) THEN
        RAISE EXCEPTION 'override for % points to contact % outside the merge', v_col.name, v_from;
      END IF;
      SELECT s -> 'r' -> v_col.name INTO v_val
        FROM jsonb_array_elements(v_src) s WHERE (s -> 'r' ->> 'contact_id')::bigint = v_from;
      v_final := jsonb_set(v_final, ARRAY[v_col.name], COALESCE(v_val, 'null'::jsonb));

    ELSIF v_o IS NOT NULL AND jsonb_typeof(v_o) = 'object' AND v_o ? 'value' THEN
      v_final := jsonb_set(v_final, ARRAY[v_col.name], v_o -> 'value');

    ELSIF (v_o IS NOT NULL AND jsonb_typeof(v_o) = 'object' AND v_o ? 'union')
          OR (v_o IS NULL AND v_col.is_array) THEN
      -- איחוד רשימות: סדר הופעה ראשון, המאסטר קודם
      SELECT COALESCE(jsonb_agg(el ORDER BY pos), '[]'::jsonb) INTO v_val
      FROM (
        SELECT el, min(((s ->> 'o')::bigint * 100000) + i) AS pos
        FROM jsonb_array_elements(v_src) s
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(s -> 'r' -> v_col.name) = 'array' THEN s -> 'r' -> v_col.name ELSE '[]'::jsonb END
        ) WITH ORDINALITY e(el, i)
        GROUP BY el
      ) u;
      -- NULL שנשאר ריק לא הופך ל-'{}' (אחרת רעש בהיסטוריה)
      IF NOT (v_val = '[]'::jsonb AND COALESCE(jsonb_typeof(v_master -> v_col.name), 'null') = 'null') THEN
        v_final := jsonb_set(v_final, ARRAY[v_col.name], v_val);
      END IF;

    ELSIF v_o IS NOT NULL THEN
      -- תאימות לאחור: ערך רגיל מגרסת המסך הקודמת
      v_final := jsonb_set(v_final, ARRAY[v_col.name], v_o);

    ELSIF v_col.name = 'notes' THEN
      SELECT to_jsonb(string_agg(t, E'\n---\n' ORDER BY o)) INTO v_val
      FROM (
        SELECT btrim(s -> 'r' ->> 'notes') AS t, min((s ->> 'o')::int) AS o
        FROM jsonb_array_elements(v_src) s
        WHERE btrim(COALESCE(s -> 'r' ->> 'notes', '')) <> ''
        GROUP BY 1
      ) n;
      v_final := jsonb_set(v_final, ARRAY['notes'], COALESCE(v_val, 'null'::jsonb));

    ELSIF v_col.name = 'created_timestamp' THEN
      SELECT to_jsonb(min((s -> 'r' ->> 'created_timestamp')::timestamptz)) INTO v_val
        FROM jsonb_array_elements(v_src) s;
      v_final := jsonb_set(v_final, ARRAY[v_col.name], COALESCE(v_val, 'null'::jsonb));

    ELSIF v_col.name IN ('last_contact_date', 'whatsapp_campaign_last_sent') THEN
      SELECT to_jsonb(max((s -> 'r' ->> v_col.name)::timestamptz)) INTO v_val
        FROM jsonb_array_elements(v_src) s;
      v_final := jsonb_set(v_final, ARRAY[v_col.name], COALESCE(v_val, 'null'::jsonb));

    ELSIF v_col.name IN ('second_phone', 'second_email')
          AND (v_master -> v_col.name IS NULL OR jsonb_typeof(v_master -> v_col.name) = 'null'
               OR btrim(v_master ->> v_col.name) = '') THEN
      -- נייד/מייל נוסף: הערך הבא שאינו הראשי הסופי (phone/email כבר חושבו — attnum קטן יותר)
      v_primary := v_final ->> CASE v_col.name WHEN 'second_phone' THEN 'phone' ELSE 'email' END;
      SELECT to_jsonb(c.v) INTO v_val
      FROM (
        SELECT btrim(s -> 'r' ->> f.k) AS v, (s ->> 'o')::int AS o, f.ord
        FROM jsonb_array_elements(v_src) s
        CROSS JOIN (VALUES
          (CASE v_col.name WHEN 'second_phone' THEN 'phone' ELSE 'email' END, 1),
          (v_col.name, 2)) f(k, ord)
      ) c
      WHERE COALESCE(c.v, '') <> ''
        AND CASE WHEN v_col.name = 'second_phone'
              THEN COALESCE(public.normalize_il_mobile_phone(c.v), regexp_replace(c.v, '[^0-9]', '', 'g'))
                   IS DISTINCT FROM COALESCE(public.normalize_il_mobile_phone(v_primary), regexp_replace(COALESCE(v_primary, ''), '[^0-9]', '', 'g'))
              ELSE lower(c.v) IS DISTINCT FROM lower(btrim(COALESCE(v_primary, '')))
            END
      ORDER BY c.o, c.ord
      LIMIT 1;
      IF v_val IS NOT NULL THEN
        v_final := jsonb_set(v_final, ARRAY[v_col.name], v_val);
      END IF;

    ELSIF v_master -> v_col.name IS NULL
          OR v_master -> v_col.name IN ('null'::jsonb, 'false'::jsonb, '[]'::jsonb, '{}'::jsonb, '""'::jsonb)
          OR (jsonb_typeof(v_master -> v_col.name) = 'string' AND btrim(v_master ->> v_col.name) = '') THEN
      -- שדה ריק במאסטר: הערך הלא-ריק הראשון מהכפולות
      SELECT e -> v_col.name INTO v_val
      FROM jsonb_array_elements(v_rows) WITH ORDINALITY x(e, i)
      WHERE NOT (e -> v_col.name IS NULL
                 OR e -> v_col.name IN ('null'::jsonb, 'false'::jsonb, '[]'::jsonb, '{}'::jsonb, '""'::jsonb)
                 OR (jsonb_typeof(e -> v_col.name) = 'string' AND btrim(e ->> v_col.name) = ''))
      ORDER BY i
      LIMIT 1;
      IF v_val IS NOT NULL THEN
        v_final := jsonb_set(v_final, ARRAY[v_col.name], v_val);
      END IF;
    END IF;
  END LOOP;

  -- ── 2. עותק מלא של כל כפולה, לפני שנוגעים בה ─────────────────────────────
  -- changed_fields ריק בכוונה: פאנל ההיסטוריה לא יציע "שחזר" לשדות של רשומה אחרת
  INSERT INTO public.contact_profile_history (contact_id, source, changed_fields, old_data, new_data)
  SELECT master_id, 'merge', '{}'::text[], e,
         jsonb_build_object('merged_into', master_id, 'merged_from', (e ->> 'contact_id')::bigint, 'overrides', overrides)
  FROM jsonb_array_elements(v_rows) e;

  -- ── 3. העברת כל מה שמקושר לכפולות ────────────────────────────────────────
  UPDATE public.applications SET candidate_link = master_id WHERE candidate_link = ANY(v_dups);
  UPDATE public.job SET rel_employer_contact = master_id WHERE rel_employer_contact = ANY(v_dups);
  UPDATE public.job SET rel_recruiter_contact = master_id WHERE rel_recruiter_contact = ANY(v_dups);
  UPDATE public.inbox SET match_contact = master_id WHERE match_contact = ANY(v_dups);
  UPDATE public.inbox_v2 SET match_contact = master_id WHERE match_contact = ANY(v_dups);
  UPDATE public.job_recruitment_intake SET matched_contact_id = master_id WHERE matched_contact_id = ANY(v_dups);
  UPDATE public.job_recruitment_intake SET confirmed_contact_id = master_id WHERE confirmed_contact_id = ANY(v_dups);
  UPDATE public.contact_requests SET linked_contact_id = master_id, updated_at = now() WHERE linked_contact_id = ANY(v_dups);
  UPDATE public.whatsapp_campaign_recipients SET contact_id = master_id, updated_at = now() WHERE contact_id = ANY(v_dups);
  UPDATE public.communication_suppressions SET contact_id = master_id, updated_at = now() WHERE contact_id = ANY(v_dups);
  UPDATE public.employment_intake SET canonical_contact_id = master_id WHERE canonical_contact_id = ANY(v_dups);
  UPDATE public.employment_intake SET match_contact = master_id WHERE match_contact = ANY(v_dups);
  UPDATE public.employment_intake_action SET contact_id = master_id WHERE contact_id = ANY(v_dups);
  UPDATE public.contact_messages SET contact_id = master_id WHERE contact_id = ANY(v_dups);
  UPDATE public.contact_profile_history SET contact_id = master_id WHERE contact_id = ANY(v_dups);

  -- Google: קישור פעיל אחד לכל חשבון Google (אינדקס ייחודי). השאר נשמרים כלא-פעילים.
  WITH ranked AS (
    SELECT id, row_number() OVER (
      PARTITION BY google_account_key
      ORDER BY (contact_id = master_id) DESC, array_position(v_dups, contact_id), last_synced_at DESC NULLS LAST, id
    ) AS rn
    FROM public.google_contact_links
    WHERE contact_id = ANY(v_all) AND is_active
  )
  UPDATE public.google_contact_links g SET is_active = false, updated_at = now()
  FROM ranked r WHERE g.id = r.id AND r.rn > 1;
  UPDATE public.google_contact_links SET contact_id = master_id, updated_at = now() WHERE contact_id = ANY(v_dups);

  -- Fix: קישור ראשי פעיל אחד לאיש קשר (אינדקס ייחודי). השאר נשארים כקישורים משניים.
  WITH ranked AS (
    SELECT id, row_number() OVER (
      ORDER BY (contact_id = master_id) DESC, array_position(v_dups, contact_id), id
    ) AS rn
    FROM public.fix_contact_links
    WHERE contact_id = ANY(v_all) AND is_primary AND is_active
  )
  UPDATE public.fix_contact_links f SET is_primary = false, updated_at = now()
  FROM ranked r WHERE f.id = r.id AND r.rn > 1;
  UPDATE public.fix_contact_links SET contact_id = master_id, updated_at = now() WHERE contact_id = ANY(v_dups);

  -- תגיות: כולל tag_id (המודל הקנוני), בלי כפילות מול תגיות המאסטר
  INSERT INTO public.contact_tags (contact_id, tag, tag_id)
  SELECT master_id, t.tag, t.tag_id
  FROM public.contact_tags t
  WHERE t.contact_id = ANY(v_dups)
    AND NOT EXISTS (
      SELECT 1 FROM public.contact_tags m
      WHERE m.contact_id = master_id
        AND ((t.tag_id IS NOT NULL AND m.tag_id = t.tag_id) OR (t.tag IS NOT NULL AND m.tag = t.tag))
    )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rel_contact_profiles (contact_id, profile_type_id)
  SELECT master_id, profile_type_id FROM public.rel_contact_profiles WHERE contact_id = ANY(v_dups)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rel_contact_sub_roles (contact_id, sub_role_id)
  SELECT master_id, sub_role_id FROM public.rel_contact_sub_roles WHERE contact_id = ANY(v_dups)
  ON CONFLICT DO NOTHING;

  -- ── 4. מחיקת הכפולות (לפני העדכון — phone_norm ייחודי) ───────────────────
  DELETE FROM public.contact WHERE contact_id = ANY(v_dups);

  -- ── 5. עדכון המאסטר — רק עמודות שהשתנו ───────────────────────────────────
  FOR v_key IN SELECT jsonb_object_keys(v_final) LOOP
    CONTINUE WHEN v_key = ANY(v_protected);
    IF (v_final -> v_key) IS DISTINCT FROM (v_master -> v_key) THEN
      v_set := v_set || format('%I = r.%I', v_key, v_key);
    END IF;
  END LOOP;

  IF cardinality(v_set) > 0 THEN
    EXECUTE format(
      'UPDATE public.contact c SET %s, updated_timestamp = now()
         FROM jsonb_populate_record(NULL::public.contact, $1) r
        WHERE c.contact_id = $2',
      array_to_string(v_set, ', ')
    ) USING v_final, master_id;
  ELSE
    UPDATE public.contact SET updated_timestamp = now() WHERE contact_id = master_id;
  END IF;
END;
$function$;
