import csv
import json
import re
from seller_map import EMAIL_TO_SELLER

def norm(text):
    if not text: return ''
    t = text.upper()
    t = re.sub(r'[.,;\"\'()]', ' ', t)
    t = re.sub(r'\b(C\s*A|S\s*A|F\s*P|E\s*I\s*R\s*L|S\s*R\s*L)\b', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# Load Cartera
with open('src/data/carteraClientes.json') as f:
    cartera = json.load(f)

cartera_norm_map = {}
for c in cartera:
    cartera_norm_map[norm(c.get('nombre', ''))] = c
    if c.get('rif'):
        cartera_norm_map[norm(c['rif'])] = c

# Load existing raw CSV if any
all_rows = []
try:
    with open('scripts/raw_survey_complete.csv') as f:
        all_rows = list(csv.DictReader(f))
except Exception as e:
    print('No existing complete csv:', e)

print(f"Initially loaded {len(all_rows)} rows from existing raw_survey_complete.csv")
