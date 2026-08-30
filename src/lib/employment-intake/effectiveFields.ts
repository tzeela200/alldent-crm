/**
 * ערך אפקטיבי אחד לכל שדה עסקי — מקור יחיד לתצוגה בטבלה, בפאנל ובעורך,
 * כדי שלא יהיו שלוש גרסאות שונות של "מה מציגים" (§4, §5, §10 בסבב התיקונים).
 *
 * סדר עדיפות: השדה על השורה עצמה (שהגיע מה-Parser, או נכתב ידנית — שני
 * המקורות האלה כותבים לאותה עמודה ב-employment_intake, אין הבדל אחסון
 * ביניהם) → הרשומה הקנונית שהותאמה ב-Supabase (Contact/Account).
 */

import type { RowWithAction, MatchedContactSummary, MatchedAccountSummary } from '@/hooks/useEmploymentIntakeRows'

export interface EffectiveFields {
  displayName: string | null
  /** true אם השם מגיע מהרשומה הקנונית ולא מהשורה/מהמקור עצמו. */
  displayNameFromMatch: boolean
  orgName: string | null
  phone: string | null
  phoneFromMatch: boolean
  secondPhone: string | null
  email: string | null
  emailFromMatch: boolean
  secondEmail: string | null
  roleId: number | null
  roleFromMatch: boolean
  cityId: number | null
  cityFromMatch: boolean
  regionId: number | null
  facebookId: string | null
  facebookUrl: string | null
  facebookName: string | null
}

function pick<T>(ownValue: T | null | undefined, matchedValue: T | null | undefined): { value: T | null; fromMatch: boolean } {
  if (ownValue != null) return { value: ownValue, fromMatch: false }
  return { value: matchedValue ?? null, fromMatch: matchedValue != null }
}

export function resolveEffectiveFields(
  row: Pick<
    RowWithAction,
    | 'contact_name' | 'org_name' | 'sender_name'
    | 'phone' | 'phone_norm' | 'second_phone' | 'email' | 'second_email'
    | 'sender_phone_norm'
    | 'role_id' | 'city_id' | 'region_id'
    | 'facebook_id' | 'facebook_url' | 'facebook_name'
    | 'matched_contact' | 'matched_account'
  >,
): EffectiveFields {
  const contact: MatchedContactSummary | null = row.matched_contact
  const account: MatchedAccountSummary | null = row.matched_account

  // הנייד של השורה אינו של השולח ⇒ ההודעה על מישהו אחר (מנהלת קבוצה
  // שמעבירה מודעה של מרפאה). במצב כזה **אסור** ליפול חזרה על שם השולח:
  // עדיף "—" מאשר להציג את המעבירה כאילו היא הלקוחה.
  const phoneIsFromMessage = row.phone_norm != null && row.phone_norm !== row.sender_phone_norm
  const matchedName = contact?.display_name ?? account?.account_name ?? null
  const name = pick(row.contact_name, phoneIsFromMessage ? matchedName : (matchedName ?? row.sender_name))
  const phone = pick(row.phone, contact?.phone ?? account?.phone)
  const email = pick(row.email, contact?.email ?? account?.email)
  const role = pick(row.role_id, contact?.role)
  const city = pick(row.city_id, contact?.city_id ?? account?.city_id)
  const region = pick(row.region_id, contact?.region_id ?? account?.region_id)

  return {
    displayName: name.value,
    displayNameFromMatch: name.fromMatch,
    orgName: row.org_name ?? account?.account_name ?? null,
    phone: phone.value,
    phoneFromMatch: phone.fromMatch,
    secondPhone: row.second_phone,
    email: email.value,
    emailFromMatch: email.fromMatch,
    secondEmail: row.second_email,
    roleId: role.value,
    roleFromMatch: role.fromMatch,
    cityId: city.value,
    cityFromMatch: city.fromMatch,
    regionId: region.value,
    facebookId: row.facebook_id,
    facebookUrl: row.facebook_url,
    facebookName: row.facebook_name,
  }
}
