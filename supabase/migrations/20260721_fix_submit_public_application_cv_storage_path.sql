-- INC-3109: existing-contact CV path never reached the 360 card.
--
-- submit_public_application, in the "existing contact" branch, updated the
-- contact's has_cv / cv_link / cv_received_date but NOT cv_storage_path — so a
-- CV uploaded by a returning candidate showed "has CV" on the 360 card while the
-- view button failed ("no CV file"). Evidence: 31 of 32 has_cv contacts had no
-- file pointer at all. This adds the missing cv_storage_path copy. Only that one
-- line changed vs. the previous definition.

CREATE OR REPLACE FUNCTION public.submit_public_application(p_job_code text, p_full_name text, p_phone text, p_email text DEFAULT NULL::text, p_cv_link text DEFAULT NULL::text, p_cv_storage_path text DEFAULT NULL::text, p_candidate_notes text DEFAULT NULL::text, p_consent boolean DEFAULT false)
 RETURNS TABLE(status text, application_id bigint, job_code text, candidate_link bigint, is_new_candidate boolean, application_status bigint, source bigint, has_cv boolean, cv_link text, cv_storage_path text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_phone_digits text;
  v_phone_norm text;
  v_email_norm text;
  v_contact_id bigint;
  v_contact public.contact%rowtype;
  v_job public.job%rowtype;
  v_application_id bigint;
  v_existing_application_id bigint;
  v_has_cv boolean;
  v_cv_received_date date;
  v_master_role text;
  v_master_city text;
  v_master_region text;
begin
  if coalesce(p_consent, false) is not true then
    raise exception 'consent_required';
  end if;

  if nullif(trim(coalesce(p_job_code, '')), '') is null then
    raise exception 'job_code_required';
  end if;

  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    raise exception 'full_name_required';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is null then
    raise exception 'phone_required';
  end if;

  select * into v_job
  from public.job j
  where j.job_code = trim(p_job_code)
  limit 1;

  if not found then
    raise exception 'job_not_found';
  end if;

  -- Normalize Israeli mobile to contact.phone_norm format: 9725XXXXXXXX
  v_phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if left(v_phone_digits, 3) = '972' then
    v_phone_norm := v_phone_digits;
  elsif left(v_phone_digits, 1) = '0' then
    v_phone_norm := '972' || substring(v_phone_digits from 2);
  elsif left(v_phone_digits, 1) = '5' and length(v_phone_digits) = 9 then
    v_phone_norm := '972' || v_phone_digits;
  else
    v_phone_norm := v_phone_digits;
  end if;

  v_email_norm := lower(nullif(trim(coalesce(p_email, '')), ''));

  -- ===== NEW: duplicate check (same job + same phone within 30 days) =====
  select a.application_id into v_existing_application_id
  from public.applications a
  where a.job_code = trim(p_job_code)
    and a.phone_norm = v_phone_norm
    and a.submission_date >= now() - interval '30 days'
  order by a.submission_date desc
  limit 1;

  if v_existing_application_id is not null then
    return query
    select
      'duplicate'::text as status,
      a.application_id,
      a.job_code,
      a.candidate_link,
      a.is_new_candidate,
      a.application_status,
      a.source,
      a.has_cv,
      a.cv_link,
      a.cv_storage_path
    from public.applications a
    where a.application_id = v_existing_application_id;
    return;
  end if;
  -- ===== END NEW =====

  -- First match by normalized phone. Phone is the strongest identifier.
  select c.contact_id into v_contact_id
  from public.contact c
  where c.phone_norm = v_phone_norm
     or (
       case
         when left(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 3) = '972'
           then regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
         when left(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 1) = '0'
           then '972' || substring(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') from 2)
         when left(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 1) = '5'
              and length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) = 9
           then '972' || regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
         else regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
       end
     ) = v_phone_norm
  order by c.updated_timestamp desc nulls last, c.contact_id desc
  limit 1;

  -- If phone did not match, match by email as a secondary identifier.
  if v_contact_id is null and v_email_norm is not null then
    select c.contact_id into v_contact_id
    from public.contact c
    where lower(trim(coalesce(c.email, ''))) = v_email_norm
       or lower(trim(coalesce(c.second_email, ''))) = v_email_norm
    order by c.updated_timestamp desc nulls last, c.contact_id desc
    limit 1;
  end if;

  if v_contact_id is not null then
    select * into v_contact
    from public.contact c
    where c.contact_id = v_contact_id;

    select r.name into v_master_role
    from public.dict_roles r
    where r.id = v_contact.role;

    select c.name into v_master_city
    from public.dict_cities c
    where c.id = v_contact.city_id;

    select rg.name into v_master_region
    from public.dict_regions rg
    where rg.id = v_contact.region_id;
  end if;

  v_has_cv := nullif(trim(coalesce(p_cv_link, '')), '') is not null
           or nullif(trim(coalesce(p_cv_storage_path, '')), '') is not null;
  v_cv_received_date := case when v_has_cv then current_date else null end;

  insert into public.applications (
    submission_date,
    form_title,
    job_code,
    job_link,
    account_name,
    job_role,
    job_city,
    job_region,
    candidate_phone,
    candidate_name,
    candidate_email,
    cv_link,
    cv_storage_path,
    has_cv,
    cv_received_date,
    candidate_link,
    candidate_notes,
    check_status,
    application_status,
    master_role,
    master_city,
    master_region,
    phone_norm,
    job_city_id,
    job_region_id,
    source,
    is_manual,
    is_new_candidate,
    account_link
  )
  values (
    now(),
    'הגשת מועמדות מהאתר',
    v_job.job_code,
    v_job.job_url,
    (select a.account_name from public.accounts a where a.account_id = v_job.account_link),
    (select r.name from public.dict_roles r where r.id = v_job.job_role),
    (select c.name from public.dict_cities c where c.id = v_job.city_id),
    (select rg.name from public.dict_regions rg where rg.id = v_job.region_id),
    trim(p_phone),
    trim(p_full_name),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_cv_link, '')), ''),
    nullif(trim(coalesce(p_cv_storage_path, '')), ''),
    v_has_cv,
    v_cv_received_date,
    v_contact_id,
    nullif(trim(coalesce(p_candidate_notes, '')), ''),
    case when v_contact_id is null then 1 else null end,
    1,
    v_master_role,
    v_master_city,
    v_master_region,
    v_phone_norm,
    v_job.city_id,
    v_job.region_id,
    6,
    false,
    (v_contact_id is null),
    v_job.account_link
  )
  returning applications.application_id into v_application_id;

  -- If this is an existing profile and a new CV was uploaded, update the contact CV fields too.
  if v_contact_id is not null and v_has_cv then
    update public.contact
    set cv_link = coalesce(nullif(trim(coalesce(p_cv_link, '')), ''), contact.cv_link),
        cv_storage_path = coalesce(nullif(trim(coalesce(p_cv_storage_path, '')), ''), contact.cv_storage_path),
        has_cv = true,
        cv_received_date = current_date,
        updated_timestamp = now()
    where contact_id = v_contact_id;
  end if;

  return query
  select
    'success'::text as status,
    a.application_id,
    a.job_code,
    a.candidate_link,
    a.is_new_candidate,
    a.application_status,
    a.source,
    a.has_cv,
    a.cv_link,
    a.cv_storage_path
  from public.applications a
  where a.application_id = v_application_id;
end;
$function$;
