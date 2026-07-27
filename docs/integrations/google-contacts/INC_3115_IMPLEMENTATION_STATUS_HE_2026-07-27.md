# סטטוס ביצוע — INC-3115 ושער האישור של Google ב־Inbox 2

**תאריך:** 27.07.2026  
**מקור:** דוח הביצוע שנמסר על ידי Claude Code.  

## מה בוצע

- לוגיקה חדשה `src/lib/inbox-v2-merge.ts`.
- השוואה של 10 שדות לאיש קשר.
- השוואה של 9 שדות לארגון.
- מסלולי `merge_contact`, `merge_account`, `create_contact`, `create_account`, `unclassified`, `match_conflict`.
- `SidePanel` להשוואה ולא מודאל מיזוג רשומות ליבה.
- דדופליקציה לניידים ולמיילים.
- חסימת קווי/077 לאדם ומתן אפשרות לארגון.
- `facebook_id` כמחרוזת ב־JavaScript למניעת אובדן דיוק.
- יצירת ארגון עם `account_status` ברירת מחדל 10.
- `insertAccount` מחזיר את `account_id` החדש.
- `approved_by` נרשם בפעולות.
- 21/21 בדיקות לוגיקה עברו.
- `tsc -b && vite build` עבר לפי הדוח.

## קבצים חדשים שדווחו

- `src/lib/inbox-v2-merge.ts`.
- `src/components/inbox-v2/FieldComparisonRow.tsx`.
- `src/components/inbox-v2/CreateAccountFromLeadDialog.tsx`.
- `src/hooks/useInboxV2Cities.ts`.

## קבצים מעודכנים שדווחו

- `MergePanel.tsx`.
- `InboxV2RowDetail.tsx`.
- `CreateFromLeadDialog.tsx`.
- `InboxV2Page.tsx`.
- `useAccountMutations.ts`.
- `InboxV2QuickActions.tsx`.
- `types/inbox-v2.ts`.
- `docs/inbox-v2-ssot.md`.
- תיעוד Google/n8n בפרויקט.

## מה לא בוצע

- לא בוצע commit.
- לא בוצע push.
- לא הוכנסו שורות בדיקה ל־Supabase.
- לא בוצע אימות ויזואלי/E2E.
- לא בוצע שינוי ב־n8n.
- לא נבנה `GOOGLE-01`.
- לא בוצע חיבור ל־Google.

## משמעות תפעולית

הקוד מכין את שער ההחלטה, אך אינו מזרים אליו נתונים. עד לבניית `GOOGLE-01`, שורות חדשות ללא `parsed_payload.record_type` יוצגו כ־`unclassified` ולא ייווצר אדם אוטומטית.

## צעד שמירה לפני n8n

יש לבצע `git status` ו־`git diff --stat`, לוודא שרק הקבצים המדווחים השתנו, ואז commit/push לענף הנוכחי. אין להשתמש בפקודת commit עיוורת לפני בדיקת diff.
