import sys, io, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
import openpyxl
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://urcdxdcyiedbdwegcebq.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

EXCEL_PATH = r'C:\Users\Allbi\OneDrive\שולחן העבודה\אנשי קשר לסופרבייס חודש 6 מאוחדים3.xlsx'
ERROR_OUTPUT = r'C:\Users\Allbi\alldent-crm\import_errors.xlsx'

# Roles that map to org → accounts table
ORG_ROLES = {'מרפאה', 'מרפאת שיניים', 'מעבדה', 'מעבדת שיניים', 'מכון-צילום', 'מכון צילום'}

# Role name → (dict_roles name, gender override)
ROLE_MAP = {
    'דנטל': ('עובד/ת דנטלי', 'זכר'),
    'מועמדת': ('עובד/ת דנטלי', 'נקבה'),
    'מרפאה': ('מרפאת שיניים', None),
    'מעבדה': ('מעבדת שיניים', None),
    'מכון-צילום': ('מכון-צילום', None),
    'מכון צילום': ('מכון-צילום', None),
}

def normalize_heb(s):
    if not s or not isinstance(s, str): return ''
    s = s.strip().replace('-', ' ')
    s = re.sub(r"['\"׳״]", '', s)
    s = s.replace('יי', 'י').replace('וו', 'ו')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def detect_red_rows(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    red_rows = set()
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            if cell.font and cell.font.color and cell.font.color.type == 'rgb':
                if cell.font.color.rgb in ('FFFF0000', 'FF FF0000'):
                    red_rows.add(cell.row)
                    break
    wb.close()
    return red_rows

def load_city_lookup(supabase):
    result = supabase.table('dict_cities').select('id,name,normalized_name,aliases,region_id').execute()
    lookup = {}
    for r in result.data:
        key = normalize_heb(r['name'])
        lookup[key] = r
        if r.get('normalized_name'):
            lookup[normalize_heb(r['normalized_name'])] = r
        if r.get('aliases'):
            for a in r['aliases']:
                lookup[normalize_heb(a)] = r
    return lookup

def load_region_lookup(supabase):
    result = supabase.table('dict_regions').select('id,name').execute()
    lookup = {}
    for r in result.data:
        lookup[normalize_heb(r['name'])] = r['id']
    # special
    lookup['ארצי'] = 16
    lookup['כללי'] = 16
    return lookup

def load_role_lookup(supabase):
    result = supabase.table('dict_roles').select('id,name').execute()
    lookup = {}
    for r in result.data:
        lookup[normalize_heb(r['name'])] = r['id']
    return lookup

def load_account_type_lookup(supabase):
    # Try to get account types; fallback to None if table doesn't exist or is empty
    try:
        result = supabase.table('dict_account_types').select('id,name').execute()
        lookup = {}
        for r in result.data:
            lookup[normalize_heb(r['name'])] = r['id']
        return lookup
    except Exception:
        return {}

def get_val(row, col):
    v = row.get(col)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    return str(v).strip() if str(v).strip() else None

def clean_phone(row, col):
    v = row.get(col)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, (int, float)):
        v = str(int(v))  # 501234567.0 → "501234567"
    else:
        v = str(v).strip()
    if not v:
        return None
    # Remove non-digit chars except leading +
    v = re.sub(r'[^\d+]', '', v)
    if not v:
        return None
    # Add leading 0 for 9-digit Israeli mobiles
    if len(v) == 9 and v[0] == '5':
        v = '0' + v
    return v

def main():
    if not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_SERVICE_KEY environment variable")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Loading lookups...")
    city_lookup = load_city_lookup(supabase)
    region_lookup = load_region_lookup(supabase)
    role_lookup = load_role_lookup(supabase)

    print("Detecting red rows...")
    red_rows = detect_red_rows(EXCEL_PATH)
    print(f"  {len(red_rows)} red rows to skip")

    print("Reading Excel...")
    df = pd.read_excel(EXCEL_PATH)
    df.columns = [c.strip() for c in df.columns]
    print(f"  Total rows: {len(df)}")

    # Map column names
    COL_NAME   = 'שם מלא'
    COL_ROLE   = 'תפקיד'
    COL_TYPE   = 'סוג'
    COL_CITY   = 'עיר'
    COL_REGION = 'אזור'
    COL_PHONE1 = 'נייד 1'
    COL_PHONE2 = 'נייד 2'
    COL_EMAIL1 = 'מייל 1'
    COL_EMAIL2 = 'מייל 2'
    COL_FBNAME = 'שם פייסבוק'
    COL_FBID   = 'ID פייסבוק'
    COL_FBURL  = 'URL פייסבוק'

    accounts_inserted = 0
    contacts_inserted = 0
    errors = []

    contact_batch = []   # batch של אנשי קשר
    account_batch = []   # batch של ארגונים
    contact_rows  = []   # מספרי שורות לכל payload בbatch
    account_rows  = []
    BATCH_SIZE = 500

    def flush_contacts():
        nonlocal contacts_inserted
        if not contact_batch:
            return
        try:
            supabase.table('contact').insert(contact_batch).execute()
            contacts_inserted += len(contact_batch)
        except Exception as e:
            # batch נכשל — נסה אחד אחד
            for i, payload in enumerate(contact_batch):
                try:
                    supabase.table('contact').insert(payload).execute()
                    contacts_inserted += 1
                except Exception as e2:
                    errors.append({'row': contact_rows[i], 'name': payload.get('full_name',''), 'reason': str(e2)})
        contact_batch.clear()
        contact_rows.clear()

    def flush_accounts():
        nonlocal accounts_inserted
        if not account_batch:
            return
        try:
            supabase.table('accounts').insert(account_batch).execute()
            accounts_inserted += len(account_batch)
        except Exception as e:
            for i, payload in enumerate(account_batch):
                try:
                    supabase.table('accounts').insert(payload).execute()
                    accounts_inserted += 1
                except Exception as e2:
                    errors.append({'row': account_rows[i], 'name': payload.get('account_name',''), 'reason': str(e2)})
        account_batch.clear()
        account_rows.clear()

    print("Processing rows...")
    for excel_row_idx, row in df.iterrows():
        excel_row_num = excel_row_idx + 2

        if excel_row_num in red_rows:
            continue

        name   = get_val(row, COL_NAME)
        role   = get_val(row, COL_ROLE)
        rtype  = get_val(row, COL_TYPE)
        city   = get_val(row, COL_CITY)
        region = get_val(row, COL_REGION)
        phone1 = clean_phone(row, COL_PHONE1)
        phone2 = clean_phone(row, COL_PHONE2)
        email1 = get_val(row, COL_EMAIL1)
        email2 = get_val(row, COL_EMAIL2)
        fb_name = get_val(row, COL_FBNAME)
        fb_id   = get_val(row, COL_FBID)
        fb_url  = get_val(row, COL_FBURL)

        if not name:
            errors.append({'row': excel_row_num, 'name': '', 'reason': 'שם ריק'})
            continue

        city_id = None
        city_region_id = None
        if city:
            city_norm = normalize_heb(city)
            match = city_lookup.get(city_norm)
            if match:
                city_id = match['id']
                city_region_id = match['region_id']

        region_id = city_region_id
        if region:
            region_norm = normalize_heb(region)
            if 'ארצי' in region_norm or 'כללי' in region_norm:
                region_id = 16
            elif region_norm in region_lookup:
                region_id = region_lookup[region_norm]

        is_org = (rtype == 'ארגון') or (role and role in ORG_ROLES)

        if is_org:
            payload = {
                'account_name': name,
                'phone': phone1,
                'email': email1,
                'city_id': city_id,
                'region_id': region_id,
                'facebook_url': fb_url,
            }
            payload = {k: v for k, v in payload.items() if v is not None}
            account_batch.append(payload)
            account_rows.append(excel_row_num)
            if len(account_batch) >= BATCH_SIZE:
                flush_accounts()
        else:
            is_lead = not phone1 and not email1 and not fb_id and not fb_url

            role_id = None
            gender = None
            if role:
                mapped = ROLE_MAP.get(role)
                if mapped:
                    role_name_mapped, gender_str = mapped
                    role_id = role_lookup.get(normalize_heb(role_name_mapped))
                    if gender_str == 'זכר':
                        gender = 1
                    elif gender_str == 'נקבה':
                        gender = 2
                else:
                    role_id = role_lookup.get(normalize_heb(role))

            fb_id_int = None
            if fb_id:
                try:
                    fb_id_int = int(float(fb_id))
                except (ValueError, TypeError):
                    fb_id_int = None

            payload = {
                'full_name': name,
                'display_name': name,
                'phone': phone1,
                'second_phone': phone2,
                'email': email1,
                'second_email': email2,
                'role': role_id,
                'gender': gender,
                'city_id': city_id,
                'region_id': region_id,
                'facebook_name': fb_name,
                'facebook_id': fb_id_int,
                'facebook_url': fb_url,
                # לידים (ללא פרטי קשר) → ממתין לבדיקה באינבוקס
                'check_status': 1 if is_lead else None,
            }
            payload = {k: v for k, v in payload.items() if v is not None}
            contact_batch.append(payload)
            contact_rows.append(excel_row_num)
            if len(contact_batch) >= BATCH_SIZE:
                flush_contacts()

        total_done = contacts_inserted + accounts_inserted
        if total_done > 0 and total_done % 2000 == 0:
            print(f"  Progress: {contacts_inserted} contacts, {accounts_inserted} accounts, {len(errors)} errors")

    # flush שאריות
    flush_contacts()
    flush_accounts()

    print(f"\n=== סיכום ===")
    print(f"אנשי קשר הוכנסו: {contacts_inserted}")
    print(f"ארגונים הוכנסו:   {accounts_inserted}")
    print(f"שגיאות:           {len(errors)}")

    if errors:
        err_df = pd.DataFrame(errors)
        err_df.to_excel(ERROR_OUTPUT, index=False)
        print(f"קובץ שגיאות נשמר: {ERROR_OUTPUT}")

if __name__ == '__main__':
    main()
