-- INC-3118: contact merge always failed; employer hat granted without an org link.
--
-- 1) merge_contacts(master_id, dup_ids, overrides) — the signature the admin UI
--    actually calls (src/pages/AdminContactsPage.tsx handleMerge) — wrote to
--    contact.availability, a column that no longer exists (replaced by
--    candidate_availability_ids). That made EVERY merge fail, unconditionally.
--    Also reordered: FK re-routing + duplicate deletion now happen BEFORE the
--    master's own field update, so a duplicate's phone_norm is freed before the
--    master claims it (previously, picking a duplicate's phone as the winning
--    value in the merge UI collided with the UNIQUE(phone_norm) constraint,
--    since the duplicate row hadn't been deleted yet). Added job_recruitment_intake
--    FK re-routing (matched_contact_id/confirmed_contact_id), which was missing
--    and would otherwise block the final DELETE with a FK violation. Added
--    candidate_availability_ids handling since the merge UI already sends it.
--
-- 2) ensure_org_roles_from_job() — granted the employer hat (profile_type_id=2)
--    on any job with rel_employer_contact set, regardless of whether the job had
--    an account_link. That produced contacts with an employer hat but no org
--    relationship. Now the hat (and the account_link backfill) only happen when
--    the job itself carries an account_link. The recruiter branch is unchanged
--    (no equivalent org-link expectation).

CREATE OR REPLACE FUNCTION public.merge_contacts(master_id bigint, dup_ids bigint[], overrides jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. Re-route FKs from duplicates to master FIRST — before deleting duplicates
  --    and before writing the master's own fields below, so a duplicate's
  --    phone_norm is freed before the master claims it.
  UPDATE applications SET candidate_link = master_id
  WHERE candidate_link = ANY(dup_ids);

  UPDATE job SET rel_employer_contact = master_id
  WHERE rel_employer_contact = ANY(dup_ids);
  UPDATE job SET rel_recruiter_contact = master_id
  WHERE rel_recruiter_contact = ANY(dup_ids);

  UPDATE inbox_v2 SET match_contact = master_id
  WHERE match_contact = ANY(dup_ids);

  UPDATE job_recruitment_intake SET matched_contact_id = master_id
  WHERE matched_contact_id = ANY(dup_ids);
  UPDATE job_recruitment_intake SET confirmed_contact_id = master_id
  WHERE confirmed_contact_id = ANY(dup_ids);

  -- 2. Merge tags (union, no duplicates)
  INSERT INTO contact_tags (contact_id, tag)
  SELECT master_id, tag FROM contact_tags
  WHERE contact_id = ANY(dup_ids)
    AND tag NOT IN (SELECT tag FROM contact_tags WHERE contact_id = master_id)
  ON CONFLICT DO NOTHING;

  -- 3. Merge profile hats (union, no duplicates)
  INSERT INTO rel_contact_profiles (contact_id, profile_type_id)
  SELECT master_id, profile_type_id
  FROM rel_contact_profiles
  WHERE contact_id = ANY(dup_ids)
  ON CONFLICT DO NOTHING;

  -- 4. Delete duplicates now — their phone_norm is freed before the master
  --    update below claims it.
  DELETE FROM contact_tags WHERE contact_id = ANY(dup_ids);
  DELETE FROM contact WHERE contact_id = ANY(dup_ids);

  -- 5. Update master record with winning field values (safe now: no duplicate
  --    rows remain to collide with a winning phone_norm).
  UPDATE contact SET
    phone          = COALESCE((overrides->>'phone'),          phone),
    second_phone   = COALESCE((overrides->>'second_phone'),   second_phone),
    email          = COALESCE((overrides->>'email'),          email),
    second_email   = COALESCE((overrides->>'second_email'),   second_email),
    full_name      = COALESCE((overrides->>'full_name'),      full_name),
    role           = COALESCE((overrides->>'role')::int,      role),
    candidate_availability_ids = CASE
      WHEN overrides ? 'candidate_availability_ids'
        THEN ARRAY(SELECT jsonb_array_elements_text(overrides->'candidate_availability_ids'))::bigint[]
      ELSE candidate_availability_ids
    END,
    region_id      = COALESCE((overrides->>'region_id')::int, region_id),
    city_id        = COALESCE((overrides->>'city_id')::int,   city_id),
    facebook_id    = COALESCE((overrides->>'facebook_id'),    facebook_id),
    facebook_url   = COALESCE((overrides->>'facebook_url'),   facebook_url),
    notes          = COALESCE((overrides->>'notes'),          notes),
    updated_timestamp = now()
  WHERE contact_id = master_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_org_roles_from_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.rel_employer_contact is not null and new.account_link is not null then
    insert into public.rel_contact_profiles (contact_id, profile_type_id)
      values (new.rel_employer_contact, 2) on conflict do nothing;
    update public.contact set account_link = new.account_link, updated_timestamp = now()
      where contact_id = new.rel_employer_contact and account_link is null;
  end if;
  if new.rel_recruiter_contact is not null then
    insert into public.rel_contact_profiles (contact_id, profile_type_id)
      values (new.rel_recruiter_contact, 3) on conflict do nothing;
    if new.account_link is not null then
      update public.contact set account_link = new.account_link, updated_timestamp = now()
        where contact_id = new.rel_recruiter_contact and account_link is null;
    end if;
  end if;
  return new;
end;
$function$;
