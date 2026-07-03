-- Migration: update_v_job_public_visibility_rule
-- Date: 2026-07-01
--
-- Business rule (authoritative):
--   A job is visible on the public site if and only if:
--     job_status = 3  (active — operational)
--     AND public_status = 3  (published — approved for public)
--
--   published_at  → documentary only: when was the job first published
--   unpublished_at → documentary only: when was the job removed from public
--   Neither field gates visibility.
--
-- Previous WHERE also required:
--   AND j.published_at IS NOT NULL
--   AND j.unpublished_at IS NULL
-- Those conditions have been removed per this rule.

CREATE OR REPLACE VIEW v_job_public AS
 SELECT j.job_code,
    j.job_title,
    j.public_excerpt,
    j.public_image_url,
    j.job_url,
    j.job_role,
    r.name AS job_role_name,
    j.job_sub_role,
    ( SELECT array_agg(sr.name ORDER BY sr.id)
           FROM dict_sub_roles sr
          WHERE sr.id = ANY (j.job_sub_role)) AS job_sub_role_names,
    j.region_id,
    rg.name AS region_name,
    j.city_id,
    c.name AS city_name,
    j.scope,
    ( SELECT array_agg(sc.name ORDER BY sc.id)
           FROM dict_scopes sc
          WHERE sc.id = ANY (j.scope)) AS scope_names,
    j.required_experience,
    exp.name AS required_experience_name,
    j.required_languages,
    ( SELECT array_agg(l.name ORDER BY l.id)
           FROM dict_languages l
          WHERE l.id = ANY (j.required_languages)) AS required_languages_names,
    j.systems_used,
    ( SELECT array_agg(sys.name ORDER BY sys.id)
           FROM dict_systems sys
          WHERE sys.id = ANY (j.systems_used)) AS system_names,
    j.mobility_id,
    mob.name AS mobility_name,
    j.tax_type_id,
    tax.name AS tax_type_name,
    j.job_description,
    j.job_requirements,
        CASE
            WHEN j.show_salary_public THEN j.salary_expectation_monthly
            ELSE NULL::numeric
        END AS salary_expectation_monthly,
        CASE
            WHEN j.show_salary_public THEN j.salary_expectation_hourly
            ELSE NULL::numeric
        END AS salary_expectation_hourly,
    j.show_salary_public,
    j.published_at,
    j.salary_type_ids,
    ( SELECT array_agg(st.name ORDER BY st.id)
           FROM dict_salary_types st
          WHERE st.id = ANY (j.salary_type_ids)) AS salary_type_names
   FROM job j
     LEFT JOIN dict_roles r ON r.id = j.job_role
     LEFT JOIN dict_public_statuses ps ON ps.id = j.public_status
     LEFT JOIN dict_regions rg ON rg.id = j.region_id
     LEFT JOIN dict_cities c ON c.id = j.city_id
     LEFT JOIN dict_experience exp ON exp.id = j.required_experience
     LEFT JOIN dict_mobility mob ON mob.id = j.mobility_id
     LEFT JOIN dict_tax_types tax ON tax.id = j.tax_type_id
  WHERE j.job_status = 3
    AND j.public_status = 3;

COMMENT ON VIEW v_job_public IS
  'Public job listings. Visibility rule: job_status=3 (active) AND public_status=3 (published). published_at and unpublished_at are documentary only and do NOT gate visibility.';
