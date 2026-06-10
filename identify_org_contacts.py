"""
identify_org_contacts.py
========================
מזהה contacts שהוטמעו ב-role ארגוני (שם ה-role מכיל שם מ-dict_account_types)
ומעביר אותם ל-accounts.

לוגיקה:
1. שולף את כל dict_account_types
2. שולף את כל dict_roles
3. מזהה אילו roles הם "ארגוניים" — שם ה-role מכיל את שם ה-account_type
4. שולף contacts שיש להם role ארגוני
5. יוצר עבורם רשומה ב-accounts + מוחק מ-contact

הרצה:
    python identify_org_contacts.py --dry-run    # תצוגה בלבד
    python identify_org_contacts.py              # ביצוע עם אישור
    python identify_org_contacts.py --yes        # ביצוע אוטומטי
"""

import sys, io, os, argparse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://urcdxdcyiedbdwegcebq.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


def normalize(s: str) -> str:
    """נורמליזציה למחרוזת לצורך השוואה"""
    if not s:
        return ''
    return s.strip().replace('"', '').replace("'", '').replace('-', ' ').lower()


def build_role_to_account_type_map(dict_account_types, dict_roles):
    """
    עבור כל role — בודק האם שמו מכיל את שמו של account_type כלשהו.
    מחזיר: {role_id: (account_type_id, account_type_name, role_name)}
    """
    mapping = {}

    # מיון account_types לפי אורך השם (יורד) — match מדויק יותר קודם
    sorted_types = sorted(dict_account_types, key=lambda t: len(t['שם'] if 'שם' in t else t.get('name', '')), reverse=True)

    for role in dict_roles:
        role_name_norm = normalize(role.get('name', ''))
        if not role_name_norm:
            continue
        for atype in sorted_types:
            atype_name = atype.get('name') or atype.get('שם') or ''
            atype_name_norm = normalize(atype_name)
            if not atype_name_norm:
                continue
            if atype_name_norm in role_name_norm:
                mapping[role['id']] = (atype['id'], atype_name, role['name'])
                break

    return mapping


def main():
    parser = argparse.ArgumentParser(description='זיהוי contacts ארגוניים לפי role')
    parser.add_argument('--dry-run', action='store_true', help='הצגה בלבד')
    parser.add_argument('--yes', action='store_true', help='אישור אוטומטי')
    args = parser.parse_args()

    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_KEY לא מוגדר")
        sys.exit(1)

    s = create_client(SUPABASE_URL, SUPABASE_KEY)

    # === שלב 1: טען dictionaries ===
    print("📋 טוען dictionaries...")
    types_res = s.table('dict_account_types').select('id,name').execute()
    roles_res = s.table('dict_roles').select('id,name').execute()
    types = types_res.data or []
    roles = roles_res.data or []
    print(f"  dict_account_types: {len(types)} סוגים")
    print(f"  dict_roles: {len(roles)} תפקידים")

    # === שלב 2: מיפוי role → account_type ===
    role_map = build_role_to_account_type_map(types, roles)
    print(f"\n🔗 נמצאו {len(role_map)} roles ארגוניים:")
    for role_id, (atype_id, atype_name, role_name) in role_map.items():
        print(f"  role #{role_id} '{role_name}'  →  account_type #{atype_id} '{atype_name}'")

    if not role_map:
        print("\n  ❗ לא נמצאו roles ארגוניים. בדוק את dict_roles ו-dict_account_types.")
        return

    # === שלב 3: contacts עם role ארגוני ===
    org_role_ids = list(role_map.keys())
    print(f"\n📋 שולף contacts עם role ארגוני...")
    contacts_res = s.table('contact').select(
        'contact_id, full_name, display_name, phone, email, region_id, city_id, role, notes'
    ).in_('role', org_role_ids).execute()
    contacts = contacts_res.data or []
    print(f"  נמצאו {len(contacts)} contacts ארגוניים")

    if not contacts:
        print("  ✅ אין מה להעביר.")
        return

    # === שלב 4: תצוגה מקדימה ===
    print(f"\n{'contact_id':>10} {'שם':35} {'role':>5} {'→ account_type':30} {'טלפון':>15}")
    print("-" * 110)
    for c in contacts[:50]:
        atype_id, atype_name, _ = role_map[c['role']]
        name = c.get('full_name') or c.get('display_name') or ''
        print(f"{c['contact_id']:>10} {str(name)[:35]:35} {c['role']:>5} {f'#{atype_id} {atype_name}'[:30]:30} {str(c.get('phone') or ''):>15}")
    if len(contacts) > 50:
        print(f"  ... ועוד {len(contacts) - 50} contacts")

    if args.dry_run:
        print(f"\n  [DRY RUN] לא בוצעו שינויים.")
        return

    if not args.yes:
        answer = input(f"\n⚠️  להעביר {len(contacts)} contacts → accounts ולמחוק מ-contact? (כן/לא): ").strip()
        if answer not in ('כן', 'yes', 'y', 'כ'):
            print("  ביטול.")
            return

    # === שלב 5: ביצוע ===
    moved = 0
    skipped = 0
    errors = []

    for c in contacts:
        atype_id, atype_name, _ = role_map[c['role']]
        name = c.get('full_name') or c.get('display_name') or f"ארגון #{c['contact_id']}"

        payload = {
            'account_name': name,
            'account_type': atype_id,
            'phone': c.get('phone'),
            'email': c.get('email'),
            'region_id': c.get('region_id'),
            'city_id': c.get('city_id'),
            'notes': c.get('notes'),
        }
        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            # בדוק אם account כבר קיים בשם הזה
            existing = s.table('accounts').select('account_id').eq('account_name', name).execute()
            if existing.data:
                # פשוט מחק מ-contact, ה-account כבר קיים
                s.table('contact').delete().eq('contact_id', c['contact_id']).execute()
                skipped += 1
                print(f"  ⚠️  קיים כבר ב-accounts: {name!r} → נמחק מ-contact")
                continue

            s.table('accounts').insert(payload).execute()
            s.table('contact').delete().eq('contact_id', c['contact_id']).execute()
            moved += 1
            print(f"  ✅ {name!r} (contact_id={c['contact_id']}) → account_type {atype_id}")
        except Exception as e:
            errors.append({'contact_id': c['contact_id'], 'name': name, 'error': str(e)})
            print(f"  ❌ שגיאה: {name!r} — {e}")

    print(f"\n=== סיכום ===")
    print(f"הועברו ל-accounts חדש: {moved}")
    print(f"דולגו (כבר קיימים):    {skipped}")
    print(f"שגיאות:                {len(errors)}")
    if errors:
        import json
        with open('identify_org_errors.json', 'w', encoding='utf-8') as f:
            json.dump(errors, f, ensure_ascii=False, indent=2)
        print("  פרטי שגיאות: identify_org_errors.json")


if __name__ == '__main__':
    main()
