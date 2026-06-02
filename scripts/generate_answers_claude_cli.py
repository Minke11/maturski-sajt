"""
Generates answers for all questions using the claude CLI (Pro plan, no API cost).
Usage: python scripts/generate_answers_claude_cli.py
"""
import json
import subprocess
import sys
import os
import time
import re

sys.stdout.reconfigure(encoding='utf-8')

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'pitanja.json')
BATCH_SAVE = 10   # save after every N processed questions
DELAY = 0.5       # seconds between calls


def call_claude(prompt: str) -> str:
    result = subprocess.run(
        ['claude', '-p', prompt],
        capture_output=True,
        text=True,
        encoding='utf-8',
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"claude CLI error: {result.stderr[:300]}")
    return result.stdout.strip()


def build_prompt(q: dict) -> str:
    options_text = ''
    if q['opcije']:
        lines = [f"{i+1}. {opt}" for i, opt in enumerate(q['opcije'])]
        options_text = '\nПонуђени одговори:\n' + '\n'.join(lines)

    tip_hint = ''
    if q['tip'] == 'mc_multi':
        tip_hint = f'\nНапомена: Постоји VIŠE тачних одговора (питање носи {q["bodovi"]} бода).'
    elif q['tip'] == 'open':
        tip_hint = '\nНапомена: Питање отвореног типа — напиши кратак одговор.'

    if q['tip'] == 'mc_multi':
        fmt = '{"tacan_odgovor": ["tekst prvog tačnog", "tekst drugog tačnog"], "objasnjenje": "2-4 rečenice"}'
    elif q['tip'] == 'open':
        fmt = '{"tacan_odgovor": "kratak tačan odgovor", "objasnjenje": "2-4 rečenice"}'
    else:
        fmt = '{"tacan_odgovor": "tekst tačnog odgovora", "objasnjenje": "2-4 rečenice zašto je tačan"}'

    return (
        f"Ti si nastavnik elektrotehnike i informatike koji priprema učenike za maturski ispit — elektrotehničar računara.\n\n"
        f"Pitanje ({q['bodovi']} bod/a): {q['tekst']}{options_text}{tip_hint}\n\n"
        f"Odgovori SAMO u JSON formatu (bez markdown blokova, samo čist JSON):\n{fmt}"
    )


def parse_response(raw: str) -> dict:
    # Strip markdown fences
    text = re.sub(r'^```json?\s*', '', raw.strip(), flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text.strip())
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            return json.loads(m.group(0))
        raise ValueError(f"Ne mogu da parsiram JSON iz: {raw[:200]}")


def main():
    with open(DATA_PATH, encoding='utf-8') as f:
        questions = json.load(f)

    to_process = [q for q in questions if not q['has_image'] and q['tacan_odgovor'] is None]
    print(f"Ukupno pitanja: {len(questions)}")
    print(f"Za obradu: {len(to_process)}")
    print(f"Preskočeno: {len(questions) - len(to_process)} (sa slikom ili već obrađeno)\n")

    by_id = {q['id']: q for q in questions}
    processed = 0
    errors = 0

    for i, q in enumerate(to_process):
        print(f"[{i+1}/{len(to_process)}] #{q['id']} [{q['predmet']}] ... ", end='', flush=True)
        try:
            prompt = build_prompt(q)
            raw = call_claude(prompt)

            # Detect if Claude is refusing because of missing image
            image_phrases = ['слик', 'screenshot', 'listing', 'приказ', 'нису доступн', 'nije dostupn', 'не могу одредит']
            if any(p.lower() in raw.lower() for p in image_phrases) and len(raw) < 600:
                by_id[q['id']]['has_image'] = True
                print('🖼 (označeno kao has_image)')
                processed += 1
                continue

            result = parse_response(raw)
            by_id[q['id']]['tacan_odgovor'] = result.get('tacan_odgovor')
            by_id[q['id']]['objasnjenje'] = result.get('objasnjenje')
            by_id[q['id']]['ai_generated'] = True
            processed += 1
            print('✓')
        except Exception as e:
            print(f'✗ GREŠKA: {e}')
            errors += 1

        # Save periodically
        if (i + 1) % BATCH_SAVE == 0:
            with open(DATA_PATH, 'w', encoding='utf-8') as f:
                json.dump(questions, f, ensure_ascii=False, indent=2)
            print(f'  → Sačuvano ({processed} obrađeno, {errors} grešaka)')

        time.sleep(DELAY)

    # Final save
    with open(DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"\n=== Završeno ===")
    print(f"Obrađeno: {processed}")
    print(f"Grešaka:  {errors}")
    print(f"Sačuvano: {DATA_PATH}")


if __name__ == '__main__':
    main()
