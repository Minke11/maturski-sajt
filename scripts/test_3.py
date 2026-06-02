import json, subprocess, sys, re, time
sys.stdout.reconfigure(encoding='utf-8')

with open('data/pitanja.json', encoding='utf-8') as f:
    questions = json.load(f)

def call_claude(prompt):
    r = subprocess.run(['claude', '-p', prompt], capture_output=True, text=True, encoding='utf-8', timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:200])
    return r.stdout.strip()

def parse_resp(raw):
    text = raw.strip()
    text = re.sub(r'^```json?\s*', '', text, flags=re.I)
    text = re.sub(r'\s*```$', '', text).strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            return json.loads(m.group(0))
        raise ValueError(f"Nije JSON: {raw[:100]}")

test_qs = [q for q in questions if not q['has_image'] and q['tacan_odgovor'] is None][:3]
for q in test_qs:
    opts = '\n'.join(f'{i+1}. {o}' for i, o in enumerate(q['opcije']))
    prompt = (
        "Ti si nastavnik elektrotehnike koji priprema ucenike za maturski ispit.\n\n"
        f"Pitanje: {q['tekst']}\n"
        f"Opcije:\n{opts}\n\n"
        'Odgovori SAMO u JSON formatu (bez markdown):\n'
        '{"tacan_odgovor": "tekst tacnog odgovora", "objasnjenje": "2-3 recenice zasto"}'
    )
    print(f"#{q['id']} [{q['predmet']}] ... ", end='', flush=True)
    try:
        raw = call_claude(prompt)
        res = parse_resp(raw)
        print('OK')
        print(f"  Odgovor: {res.get('tacan_odgovor', '?')}")
        print(f"  Obj: {res.get('objasnjenje', '?')[:120]}")
    except Exception as e:
        print(f'GRESKA: {e}')
    print()
    time.sleep(0.5)
