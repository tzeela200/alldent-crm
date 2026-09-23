-- INC-3146 ROLLBACK — מחזיר את merge_contacts(master_id, dup_ids, overrides)
-- בדיוק לגרסה שרצה ב-Supabase לפני INC-3146 (נשלפה מ-pg_get_functiondef ב-23/09/2026).
-- להריץ רק אם צריך לבטל את השינוי. ההרשאות נשמרות (CREATE OR REPLACE, אותה חתימה).

CREATE OR REPLACE FUNCTION public.merge_contacts(master_id bigint, dup_ids bigint[], overrides jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_second_phone text;
  v_email text;
  v_second_email text;
BEGIN
  IF master_id = ANY(COALESCE(dup_ids, '{}'::bigint[])) THEN
    RAISE EXCEPTION 'master_id cannot also appear in dup_ids';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contact WHERE contact_id = master_id) THEN
    RAISE EXCEPTION 'master_id % not found', master_id;
  END IF;

  -- Resolve the final primary phone/email before deleting duplicates.
  -- Explicit UI overrides win; otherwise keep the master's existing value;
  -- otherwise complete it from the duplicate records.
  SELECT COALESCE(
           NULLIF(btrim(overrides->>'phone'), ''),
           NULLIF(btrim(m.phone), ''),
           (
             SELECT c.value
             FROM (
               SELECT NULLIF(btrim(d.phone), '') AS value, d.contact_id, 1 AS source_order
               FROM public.contact d
               WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
               UNION ALL
               SELECT NULLIF(btrim(d.second_phone), '') AS value, d.contact_id, 2 AS source_order
               FROM public.contact d
               WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
             ) c
             WHERE c.value IS NOT NULL
             ORDER BY c.source_order, c.contact_id
             LIMIT 1
           )
         ),
         COALESCE(
           NULLIF(btrim(overrides->>'email'), ''),
           NULLIF(btrim(m.email), ''),
           (
             SELECT c.value
             FROM (
               SELECT NULLIF(btrim(d.email), '') AS value, d.contact_id, 1 AS source_order
               FROM public.contact d
               WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
               UNION ALL
               SELECT NULLIF(btrim(d.second_email), '') AS value, d.contact_id, 2 AS source_order
               FROM public.contact d
               WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
             ) c
             WHERE c.value IS NOT NULL
             ORDER BY c.source_order, c.contact_id
             LIMIT 1
           )
         )
  INTO v_phone, v_email
  FROM public.contact m
  WHERE m.contact_id = master_id;

  -- Resolve secondary phone. Preserve an explicit override when supplied.
  v_second_phone := NULLIF(btrim(overrides->>'second_phone'), '');
  IF v_second_phone IS NULL THEN
    SELECT c.value
    INTO v_second_phone
    FROM (
      SELECT NULLIF(btrim(m.second_phone), '') AS value, 1 AS source_order, m.contact_id AS row_order
      FROM public.contact m
      WHERE m.contact_id = master_id

      UNION ALL

      SELECT NULLIF(btrim(m.phone), '') AS value, 2 AS source_order, m.contact_id AS row_order
      FROM public.contact m
      WHERE m.contact_id = master_id

      UNION ALL

      SELECT NULLIF(btrim(d.phone), '') AS value, 3 AS source_order, d.contact_id AS row_order
      FROM public.contact d
      WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))

      UNION ALL

      SELECT NULLIF(btrim(d.second_phone), '') AS value, 4 AS source_order, d.contact_id AS row_order
      FROM public.contact d
      WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
    ) c
    WHERE c.value IS NOT NULL
      AND COALESCE(
            public.normalize_il_mobile_phone(c.value),
            NULLIF(regexp_replace(c.value, '[^0-9]', '', 'g'), '')
          ) IS DISTINCT FROM COALESCE(
            public.normalize_il_mobile_phone(v_phone),
            NULLIF(regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g'), '')
          )
    ORDER BY c.source_order, c.row_order
    LIMIT 1;
  END IF;

  -- Resolve secondary email. Preserve an explicit override when supplied.
  -- If the master already has a primary email and a duplicate has a different one,
  -- the duplicate email is retained as second_email instead of being lost.
  v_second_email := NULLIF(btrim(overrides->>'second_email'), '');
  IF v_second_email IS NULL THEN
    SELECT c.value
    INTO v_second_email
    FROM (
      SELECT NULLIF(btrim(m.second_email), '') AS value, 1 AS source_order, m.contact_id AS row_order
      FROM public.contact m
      WHERE m.contact_id = master_id

      UNION ALL

      SELECT NULLIF(btrim(m.email), '') AS value, 2 AS source_order, m.contact_id AS row_order
      FROM public.contact m
      WHERE m.contact_id = master_id

      UNION ALL

      SELECT NULLIF(btrim(d.email), '') AS value, 3 AS source_order, d.contact_id AS row_order
      FROM public.contact d
      WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))

      UNION ALL

      SELECT NULLIF(btrim(d.second_email), '') AS value, 4 AS source_order, d.contact_id AS row_order
      FROM public.contact d
      WHERE d.contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
    ) c
    WHERE c.value IS NOT NULL
      AND lower(btrim(c.value)) IS DISTINCT FROM lower(btrim(COALESCE(v_email, '')))
    ORDER BY c.source_order, c.row_order
    LIMIT 1;
  END IF;

  UPDATE public.applications SET candidate_link = master_id
  WHERE candidate_link = ANY(COALESCE(dup_ids, '{}'::bigint[]));

  UPDATE public.job SET rel_employer_contact = master_id
  WHERE rel_employer_contact = ANY(COALESCE(dup_ids, '{}'::bigint[]));
  UPDATE public.job SET rel_recruiter_contact = master_id
  WHERE rel_recruiter_contact = ANY(COALESCE(dup_ids, '{}'::bigint[]));

  UPDATE public.inbox_v2 SET match_contact = master_id
  WHERE match_contact = ANY(COALESCE(dup_ids, '{}'::bigint[]));

  UPDATE public.job_recruitment_intake SET matched_contact_id = master_id
  WHERE matched_contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]));
  UPDATE public.job_recruitment_intake SET confirmed_contact_id = master_id
  WHERE confirmed_contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]));

  INSERT INTO public.contact_tags (contact_id, tag)
  SELECT master_id, tag FROM public.contact_tags
  WHERE contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
    AND tag NOT IN (SELECT tag FROM public.contact_tags WHERE contact_id = master_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rel_contact_profiles (contact_id, profile_type_id)
  SELECT master_id, profile_type_id
  FROM public.rel_contact_profiles
  WHERE contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]))
  ON CONFLICT DO NOTHING;

  DELETE FROM public.contact_tags
  WHERE contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]));

  DELETE FROM public.contact
  WHERE contact_id = ANY(COALESCE(dup_ids, '{}'::bigint[]));

  UPDATE public.contact
  SET
    phone          = COALESCE(v_phone, phone),
    second_phone   = COALESCE(v_second_phone, second_phone),
    email          = COALESCE(v_email, email),
    second_email   = COALESCE(v_second_email, second_email),
    full_name      = COALESCE((overrides->>'full_name'), full_name),
    role           = COALESCE((overrides->>'role')::int, role),
    candidate_availability_ids = CASE
      WHEN overrides ? 'candidate_availability_ids'
        THEN ARRAY(SELECT jsonb_array_elements_text(overrides->'candidate_availability_ids'))::bigint[]
      ELSE candidate_availability_ids
    END,
    region_id      = COALESCE((overrides->>'region_id')::int, region_id),
    city_id        = COALESCE((overrides->>'city_id')::int, city_id),
    facebook_id    = COALESCE((overrides->>'facebook_id')::bigint, facebook_id),
    facebook_url   = COALESCE((overrides->>'facebook_url'), facebook_url),
    notes          = COALESCE((overrides->>'notes'), notes),
    updated_timestamp = now()
  WHERE contact_id = master_id;
END;
$function$;
