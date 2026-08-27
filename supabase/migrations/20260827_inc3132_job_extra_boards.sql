-- ═══════════════════════════════════════════════════════════════════════════
-- INC-3132 — פרסום משרה בכמה לוחות ציבוריים
--
-- הלוח הציבורי חתוך לשבעה לוחות תפקיד, וכל אחד שולף לפי job.job_role
-- היחיד. לכן משרה משולבת ("רופא שיניים עם ניסיון בשיקום או מומחה שיקום",
-- "סייעת לתפקיד מזכירה או מזכירה בלבד") נראית רק בחצי מקהל היעד שלה.
--
-- הפתרון: עמודת מערך נוספת של לוחות. job_role נשאר בדיוק כפי שהוא —
-- 32 קבצים בקוד קוראים אותו (SmartMatch, ATS, הגשות, דוחות), והפיכתו
-- למערך הייתה שוברת את כולם.
--
-- ⚠️ למה slugs ולא מזהי תפקיד: הבחירה באדמין היא ברמת הלוח ("מומחים"),
--    ולוח המומחים מכסה שבעה מזהים (2–8). שמירת מזהים הייתה מחייבת לבחור
--    איזו מומחיות, או לשכפל שבעה ערכים לכל בחירה.
--
-- ⚠️ למה לא job_sub_role הקיים: כל תת-תפקיד כבול לתפקיד-אב יחיד
--    (65–69 שייכים רק לסייעות), ולכן הוא לא יכול לבטא "גם מזכירות".
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.job
  add column if not exists public_extra_boards text[] not null default '{}';

comment on column public.job.public_extra_boards is
  'INC-3132 — לוחות ציבוריים נוספים שבהם המשרה מוצגת, מעבר ללוח הנגזר '
  'מ-job_role. הלוח של התפקיד עצמו נכלל תמיד ואינו נשמר כאן. '
  'הערכים הם ה-slugs מ-src/lib/publicRolePages.ts.';

-- ‎<@ מקבל מערך ריק ופוסל כל slug שאינו אחד משבעת הלוחות. בלי האילוץ,
-- שגיאת כתיב הייתה נשמרת בשקט ופשוט לא מוסיפה שום לוח — כשל שקט.
alter table public.job
  drop constraint if exists job_extra_boards_ck;
alter table public.job
  add constraint job_extra_boards_ck check (
    public_extra_boards <@ array[
      'dentists','specialists','hygienists','assistants',
      'secretaries','management-sales','technicians'
    ]::text[]
  );

create index if not exists job_extra_boards_idx
  on public.job using gin (public_extra_boards);

-- ───────────────────────────────────────────────────────────────────────────
-- v_job_public — אותה הגדרה בדיוק, עם public_extra_boards בסוף.
-- Postgres מרשה הוספת עמודה ל-view רק בסוף הרשימה, ולכן היא אחרונה.
-- ה-WHERE לא נוגע: כלל הנראות (job_status = 3 AND public_status = 3)
-- נשאר המקור היחיד לציבוריות, ומשרה מוסתרת נשארת מוסתרת בכל הלוחות.
-- ההרשאה על ה-view היא table-level (relacl כולל anon), ולכן העמודה
-- החדשה נקראית אוטומטית ואין צורך ב-GRANT נוסף.
-- ───────────────────────────────────────────────────────────────────────────
create or replace view public.v_job_public as
 SELECT j.job_code,
    j.job_title,
    j.public_excerpt,
    j.public_image_url,
    j.job_url,
    j.job_role,
    r.name AS job_role_name,
    j.job_sub_role,
    ( SELECT array_agg(sr.name ORDER BY sr.id) AS array_agg
           FROM dict_sub_roles sr
          WHERE sr.id = ANY (j.job_sub_role)) AS job_sub_role_names,
    j.region_id,
    rg.name AS region_name,
    j.city_id,
    c.name AS city_name,
    j.scope,
    ( SELECT array_agg(sc.name ORDER BY sc.id) AS array_agg
           FROM dict_scopes sc
          WHERE sc.id = ANY (j.scope)) AS scope_names,
    j.required_experience,
    exp.name AS required_experience_name,
    j.required_languages,
    ( SELECT array_agg(l.name ORDER BY l.id) AS array_agg
           FROM dict_languages l
          WHERE l.id = ANY (j.required_languages)) AS required_languages_names,
    j.systems_used,
    ( SELECT array_agg(sys.name ORDER BY sys.id) AS array_agg
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
    ( SELECT array_agg(st.name ORDER BY st.id) AS array_agg
           FROM dict_salary_types st
          WHERE st.id = ANY (j.salary_type_ids)) AS salary_type_names,
    j.description_image_url,
    j.public_extra_boards
   FROM job j
     LEFT JOIN dict_roles r ON r.id = j.job_role
     LEFT JOIN dict_public_statuses ps ON ps.id = j.public_status
     LEFT JOIN dict_regions rg ON rg.id = j.region_id
     LEFT JOIN dict_cities c ON c.id = j.city_id
     LEFT JOIN dict_experience exp ON exp.id = j.required_experience
     LEFT JOIN dict_mobility mob ON mob.id = j.mobility_id
     LEFT JOIN dict_tax_types tax ON tax.id = j.tax_type_id
  WHERE j.job_status = 3 AND j.public_status = 3;
