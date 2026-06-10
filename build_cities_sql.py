import sys, io, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pandas as pd

df = pd.read_excel(r'C:\Users\Allbi\OneDrive\שולחן העבודה\פרוייקטים\ערים ואזורים עדכני 2026.xlsx', sheet_name='ערים')

RED_IDS = {229, 261, 336, 374, 469, 488}

def map_region(rid):
    return 15 if rid == 17 else int(rid)

def normalize(s):
    s = str(s).strip()
    s = s.replace('-', ' ')
    s = re.sub(r"['\"׳״]", '', s)
    s = s.replace('יי', 'י').replace('וו', 'ו')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def esc(s):
    return str(s).replace("'", "''")

def clean_locality(s):
    if not isinstance(s, str): return None
    s = s.strip()
    if 'ערבי' in s: return 'יישוב ערבי'
    if 'יהודי' in s: return 'יישוב יהודי'
    return s

df = df[df['city_id'].notna() & ~df['city_id'].isin(RED_IDS)].copy()
df['city_id'] = df['city_id'].astype(int)

os.makedirs(r'C:\Users\Allbi\alldent-crm\sql_chunks', exist_ok=True)

lines = []
for _, row in df.iterrows():
    cid = int(row['city_id'])
    name = esc(str(row['city_name']).strip())
    norm = esc(normalize(str(row['city_name']).strip()))
    rid = map_region(row['region_id'])
    loc = clean_locality(row['locality_type'])

    aliases = set()
    variants_raw = row.get('ואריאציות אפשריות - מטרה זיהוי', '')
    if isinstance(variants_raw, str):
        for v in variants_raw.split(','):
            v = v.strip()
            if v:
                aliases.add(v)
    norm_plain = normalize(str(row['city_name']).strip())
    aliases.add(norm_plain)
    aliases.discard(str(row['city_name']).strip())

    if aliases:
        aliases_sql = "ARRAY[" + ",".join(f"'{esc(a)}'" for a in sorted(aliases)) + "]::text[]"
    else:
        aliases_sql = "NULL"

    loc_sql = f"'{esc(loc)}'" if loc else 'NULL'
    lines.append(f"({cid}, '{name}', '{norm}', {rid}, {aliases_sql}, {loc_sql}, true)")

chunks = [lines[i:i+200] for i in range(0, len(lines), 200)]
print(f"Total cities: {len(lines)}, chunks: {len(chunks)}")

for i, chunk in enumerate(chunks):
    rows_sql = ',\n'.join(chunk)
    sql = (
        "INSERT INTO dict_cities (id, name, normalized_name, region_id, aliases, locality_type, is_active)\nVALUES\n"
        + rows_sql
        + "\nON CONFLICT (id) DO UPDATE SET\n"
        + "  name = EXCLUDED.name,\n"
        + "  normalized_name = EXCLUDED.normalized_name,\n"
        + "  region_id = EXCLUDED.region_id,\n"
        + "  aliases = EXCLUDED.aliases,\n"
        + "  locality_type = EXCLUDED.locality_type,\n"
        + "  is_active = EXCLUDED.is_active;"
    )
    fname = fr'C:\Users\Allbi\alldent-crm\sql_chunks\cities_{i+1:02d}.sql'
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f"  Saved {fname} ({len(chunk)} rows)")

print("Done.")
