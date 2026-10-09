# -*- coding: utf-8 -*-
"""Merge page-level i18n keys into en.json and te.json. Run from frontend/src/i18n."""
import json
from pathlib import Path

def deep_merge(base, patch):
    for k, v in patch.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            deep_merge(base[k], v)
        else:
            base[k] = v

def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def save(p, data):
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def L(u: str) -> str:
    return u.encode('utf-8').decode('unicode_escape')

# Telugu via unicode escapes (see merge script in repo history for full TE dict)
if __name__ == '__main__':
    root = Path(__file__).parent
    # Re-run merges from embedded data is optional; keys are already in locale files.
    print('Locale files maintained via merge_pages run; extend build_te_pages.py to add keys.')
