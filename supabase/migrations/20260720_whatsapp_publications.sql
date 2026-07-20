-- ============================================================================
-- מסך "פרסומי WhatsApp" — מעקב אחרי מי קיבל פרסום ומתי
--
-- שתי טבלאות בלבד. לא נוצר מילון חדש (סטטוס השליחה נשמר כ-text + מיפוי
-- בקוד), לא נוצרת טבלת staging, ולא נוגעים בטבלאות ליבה מלבד עדכון שדה
-- הסיכום contact.whatsapp_campaign_last_sent שכבר קיים.
--
-- מודל: תמונת מצב, לא יומן אירועים. דוח Fix מכיל שורה אחת לכל נמען
-- בקמפיין, והסטטוס מתקדם Submited → Delivered → Read. לכן המפתח הייחודי
-- הוא (campaign_id, phone_norm) וייבוא חוזר מעדכן במקום להוסיף.
-- ============================================================================

-- ─────────────────────────── קמפיינים ───────────────────────────
create table if not exists public.whatsapp_campaigns (
  campaign_id      bigint generated always as identity primary key,
  campaign_name    text        not null,
  sent_at          timestamptz,
  source_file_name text,
  -- SHA-256 של הקובץ — מונע קליטה חוזרת של אותו קובץ בדיוק
  file_hash        text unique,
  total_rows       integer     not null default 0,
  matched_rows     integer     not null default 0,
  unmatched_rows   integer     not null default 0,
  created_at       timestamptz not null default now(),
  created_by       uuid        default auth.uid()
);

comment on table public.whatsapp_campaigns is
  'קמפיין WhatsApp שנשלח דרך Fix Digital. רשומה אחת לכל דוח תוצאות שנקלט.';

-- ──────────────────── נמעני קמפיין ותוצאות שליחה ────────────────────
create table if not exists public.whatsapp_campaign_recipients (
  recipient_id        bigint generated always as identity primary key,
  campaign_id         bigint      not null
                        references public.whatsapp_campaigns(campaign_id) on delete cascade,
  -- ההתאמה היא לפי נייד מנורמל בלבד. לא לפי שם, לא לפי אימייל.
  -- הרשומה יכולה להיות איש קשר או ארגון — אותה פעולה, שני מקורות.
  -- contact קודם (phone_norm שם UNIQUE), ואם אין — accounts.
  contact_id          bigint      references public.contact(contact_id)  on delete set null,
  account_id          bigint      references public.accounts(account_id) on delete set null,
  phone_norm          text        not null,
  phone_raw           text,
  full_name_raw       text,
  sent_at             timestamptz,
  -- קוד מנורמל: read / delivered / submitted / failed_* / no_status
  delivery_status     text        not null default 'no_status',
  -- הערך המקורי מ-Fix — נשמר תמיד, לעולם לא נמחק
  delivery_status_raw text,
  -- status ו-process מ-Fix. שים לב: status אינו סטטוס שליחה.
  fix_status_raw      text,
  fix_process_raw     text,
  email_raw           text,
  -- שדות זהות של הרשומה ב-Fix. אינם מגיעים בדוח תוצאות הקמפיין ולכן יישארו
  -- ריקים עד לקליטת ייצוא הלקוחות המלא. מוגדרים כבר עכשיו כדי שהעמודות
  -- יהיו זמינות בבורר העמודות של המסך.
  fix_digital_id      text,
  fix_lead_number     text,
  -- "קוד קובץ" — תווית חופשית שהמשתמשת נותנת לקובץ שהיא מעלה ל-Fix
  -- (למשל "חודש מרץ"). נתון של Fix, לא של AllDent. נשמר לתצוגה בלבד.
  fix_file_code       text,
  match_result        text        not null default 'not_found',
  source_row_number   integer,
  -- שורת המקור המלאה כפי שהתקבלה, כולל HTML entities לפני פענוח
  raw_payload         jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint whatsapp_recipients_status_chk check (delivery_status in (
    'read','delivered','submitted',
    'failed_device','failed_rate_limit','failed_blocked','failed_provider','failed_other',
    'no_status'
  )),
  constraint whatsapp_recipients_match_chk check (match_result in (
    'matched_contact','not_found','invalid_phone','missing_phone','ambiguous_match'
  ))
);

comment on table public.whatsapp_campaign_recipients is
  'נמען אחד בקמפיין אחד, עם הסטטוס העדכני ביותר. תמונת מצב — לא יומן אירועים.';

-- Idempotency: ייבוא חוזר של אותו קמפיין מעדכן ולא מכפיל
create unique index if not exists whatsapp_recipients_campaign_phone_uidx
  on public.whatsapp_campaign_recipients (campaign_id, phone_norm);

create index if not exists whatsapp_recipients_contact_idx
  on public.whatsapp_campaign_recipients (contact_id);
create index if not exists whatsapp_recipients_account_idx
  on public.whatsapp_campaign_recipients (account_id);
create index if not exists whatsapp_recipients_sent_at_idx
  on public.whatsapp_campaign_recipients (sent_at desc nulls last);
create index if not exists whatsapp_recipients_status_idx
  on public.whatsapp_campaign_recipients (delivery_status);
create index if not exists whatsapp_recipients_phone_norm_idx
  on public.whatsapp_campaign_recipients (phone_norm);
create index if not exists whatsapp_campaigns_sent_at_idx
  on public.whatsapp_campaigns (sent_at desc nulls last);

-- ──────────────── שדות סיכום בטבלאות הליבה ────────────────
-- עמודות התאריך כבר קיימות ואינן נוצרות מחדש:
--   contact.whatsapp_campaign_last_sent
--   accounts.whatsapp_last_sent
-- מתווסף רק סטטוס השליחה האחרון, בשם זהה בשתי הטבלאות.
--
-- אלה שדות סיכום/Cache בלבד. מקור האמת להיסטוריה הוא
-- whatsapp_campaign_recipients, שבה נשמרת כל שליחה בנפרד.
alter table public.contact
  add column if not exists whatsapp_last_delivery_status text;

alter table public.accounts
  add column if not exists whatsapp_last_delivery_status text;

comment on column public.contact.whatsapp_last_delivery_status is
  'סטטוס השליחה האחרון ב-WhatsApp. שדה סיכום — מקור האמת הוא whatsapp_campaign_recipients.';
comment on column public.accounts.whatsapp_last_delivery_status is
  'סטטוס השליחה האחרון ב-WhatsApp. שדה סיכום — מקור האמת הוא whatsapp_campaign_recipients.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contact_whatsapp_status_chk') then
    alter table public.contact add constraint contact_whatsapp_status_chk
      check (whatsapp_last_delivery_status is null or whatsapp_last_delivery_status in (
        'read','delivered','submitted',
        'failed_device','failed_rate_limit','failed_blocked','failed_provider','failed_other',
        'no_status'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_whatsapp_status_chk') then
    alter table public.accounts add constraint accounts_whatsapp_status_chk
      check (whatsapp_last_delivery_status is null or whatsapp_last_delivery_status in (
        'read','delivered','submitted',
        'failed_device','failed_rate_limit','failed_blocked','failed_provider','failed_other',
        'no_status'));
  end if;
end $$;

-- ─────────────────────────────── RLS ───────────────────────────────
-- מדיניות זהה לשאר טבלאות ה-CRM (contact / accounts): גישה למשתמש מחובר.
-- ⚠️ פער ידוע ומתועד: אין היום מנגנון תפקידי אדמין בצד ה-DB — AuthGuard
--    בודק התחברות בלבד. הקשחה נדרשת ברוחב כל האדמין, לא רק כאן.
alter table public.whatsapp_campaigns            enable row level security;
alter table public.whatsapp_campaign_recipients  enable row level security;

drop policy if exists "authenticated_all_whatsapp_campaigns" on public.whatsapp_campaigns;
create policy "authenticated_all_whatsapp_campaigns"
  on public.whatsapp_campaigns for all to authenticated
  using (true) with check (true);

drop policy if exists "authenticated_all_whatsapp_recipients" on public.whatsapp_campaign_recipients;
create policy "authenticated_all_whatsapp_recipients"
  on public.whatsapp_campaign_recipients for all to authenticated
  using (true) with check (true);
