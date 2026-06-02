import pdfplumber
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = r"C:\Users\Korisnik\Downloads\Maturski\Elektrotehnicar-racunara-MI-Prirucnik-2024-2.pdf"
OUTPUT_PATH = r"C:\Users\Korisnik\Downloads\Maturski\data\pitanja.json"

START_PAGE = 19   # 0-indexed, page 20
END_PAGE = 82     # 0-indexed, page 83

SUBJECT_MAP = {
    "Рачунарски хардвер": ("hardver", "Računarski hardver"),
    "Рачунарски Хардвер": ("hardver", "Računarski hardver"),
    "Оперативни системи": ("operativni_sistemi", "Operativni sistemi"),
    "Одржавање рачунарских система": ("odrzavanje", "Održavanje računarskih sistema"),
    "Одржавање Рачунарских система": ("odrzavanje", "Održavanje računarskih sistema"),
    "Техничка документација": ("tehnicka_dokumentacija", "Tehnička dokumentacija"),
    "Техничка Документација": ("tehnicka_dokumentacija", "Tehnička dokumentacija"),
}

IMAGE_KEYWORDS = [
    "на слици", "са слике", "на основу слике", "приказаном на слици",
    "приказано на слици", "приказан на слици", "приказаним на слици",
    "дат на слици", "дату на слици", "листингу нар", "листинга нар",
    "приказаном листингом", "приказаним листингом",
]

def has_image_ref(text):
    t = text.lower()
    for kw in IMAGE_KEYWORDS:
        if kw.lower() in t:
            return True
    return False

def extract_lines_from_page(page):
    """Extract lines with type annotations using word x-coordinates."""
    words = page.extract_words(keep_blank_chars=False, x_tolerance=3, y_tolerance=3)
    if not words:
        return []

    # Group words into lines by y coordinate (within 3px)
    lines = []
    current_line_y = None
    current_line_words = []

    for w in words:
        y = w['top']
        if current_line_y is None or abs(y - current_line_y) > 4:
            if current_line_words:
                lines.append(current_line_words)
            current_line_words = [w]
            current_line_y = y
        else:
            current_line_words.append(w)

    if current_line_words:
        lines.append(current_line_words)

    return lines

def classify_line(words):
    """
    Returns (line_type, number, text, bodovi_on_line) where line_type is:
    - 'question': question number line (x of first word < 85)
    - 'option': option line (x of first word 90-145 and starts with digit-dot)
    - 'bodovi': points number on far right (x > 490), standalone line
    - 'subject': subject header
    - 'header'/'footer': page chrome
    - 'text': plain continuation text
    bodovi_on_line: int or None if bodovi digit found embedded in this line
    """
    if not words:
        return ('empty', None, '', None)

    # Strip out any bodovi word (x > 490, single digit 1/2/3) from the line
    bodovi_on_line = None
    main_words = []
    for w in words:
        if w['x0'] > 490 and re.match(r'^[123]$', w['text']):
            bodovi_on_line = int(w['text'])
        else:
            main_words.append(w)

    # If the entire line was just a bodovi marker
    if not main_words and bodovi_on_line is not None:
        return ('bodovi', bodovi_on_line, '', None)

    words = main_words
    if not words:
        return ('empty', None, '', None)

    first_x = words[0]['x0']
    text = ' '.join(w['text'] for w in words)

    # Check for far-right bodovi (points marker) — standalone
    if len(words) == 1 and words[0]['x0'] > 490 and re.match(r'^[123]$', words[0]['text']):
        return ('bodovi', int(words[0]['text']), '', None)

    # Footer lines
    footer_keywords = ['Завод за унапређивање', 'Центар за стручно']
    for kw in footer_keywords:
        if kw in text:
            return ('footer', None, text, bodovi_on_line)

    # Page header "Матурски испит"
    if 'Матурски испит' in text:
        return ('header', None, text, bodovi_on_line)

    # Section header — subject name (roughly centered, x around 150-350)
    for subj in SUBJECT_MAP:
        if subj in text and 100 < first_x < 400:
            return ('subject', None, subj, bodovi_on_line)

    # Question number: first word is "N." at x < 85
    first_word = words[0]['text']
    q_match = re.match(r'^(\d+)\.$', first_word)
    if q_match and first_x < 85:
        num = int(q_match.group(1))
        rest_words = words[1:]
        rest_text = ' '.join(w['text'] for w in rest_words)
        return ('question', num, rest_text, bodovi_on_line)

    # Option number: first word is "N." at x between 90 and 145
    if q_match and 90 <= first_x <= 145:
        num = int(q_match.group(1))
        rest_words = words[1:]
        rest_text = ' '.join(w['text'] for w in rest_words)
        return ('option', num, rest_text, bodovi_on_line)

    # Instruction lines (e.g. "У следећим задацима заокружите...")
    if 'заокружите' in text or 'заокружи ' in text:
        return ('instruction', None, text, bodovi_on_line)

    # Anything else
    return ('text', None, text, bodovi_on_line)

def parse_all(pdf_path):
    questions = []
    current_subject_code = "hardver"
    current_subject_name = "Računarski hardver"

    current_q_num = None
    current_q_text_parts = []
    current_bodovi = None
    current_options = []
    in_options = False

    def finalize():
        nonlocal current_q_num, current_q_text_parts, current_bodovi, current_options, in_options
        if current_q_num is None:
            return

        q_text = ' '.join(current_q_text_parts).strip()
        # Fix PDF artifact: single letter separated by space, e.g. "П риликом" → "Приликом"
        # This happens for the first word of questions
        if len(q_text) > 2 and q_text[1] == ' ' and q_text[0].isalpha() and q_text[2].islower():
            q_text = q_text[0] + q_text[2:]

        has_img = has_image_ref(q_text)
        for opt in current_options:
            if has_image_ref(opt):
                has_img = True

        tip = "mc_single"
        if not current_options:
            tip = "open"
        elif current_bodovi and current_bodovi >= 2:
            # Check instruction context — we approximate based on points
            # 3-point questions are typically multi-select
            if current_bodovi == 3:
                tip = "mc_multi"

        questions.append({
            "id": current_q_num,
            "predmet": current_subject_code,
            "predmet_naziv": current_subject_name,
            "tekst": q_text,
            "tip": tip,
            "bodovi": current_bodovi or 1,
            "opcije": list(current_options),
            "tacan_odgovor": None,
            "objasnjenje": None,
            "has_image": has_img,
            "ai_generated": False,
        })

        current_q_num = None
        current_q_text_parts = []
        current_bodovi = None
        current_options = []
        in_options = False

    with pdfplumber.open(pdf_path) as pdf:
        for page_idx in range(START_PAGE, END_PAGE + 1):
            page = pdf.pages[page_idx]
            line_words_list = extract_lines_from_page(page)

            for words in line_words_list:
                ltype, num, text, bodovi_embedded = classify_line(words)

                # Handle embedded bodovi found on the same line as other content
                if bodovi_embedded is not None and current_bodovi is None:
                    current_bodovi = bodovi_embedded

                if ltype == 'subject':
                    finalize()
                    current_subject_code, current_subject_name = SUBJECT_MAP[text]

                elif ltype == 'question':
                    finalize()
                    current_q_num = num
                    current_q_text_parts = [text] if text else []
                    current_bodovi = bodovi_embedded  # may be set from same line
                    current_options = []
                    in_options = False

                elif ltype == 'option':
                    in_options = True
                    current_options.append(text)

                elif ltype == 'bodovi':
                    if current_bodovi is None:
                        current_bodovi = num

                elif ltype == 'text':
                    if current_q_num is not None:
                        if in_options and current_options:
                            # Continuation of last option
                            current_options[-1] += ' ' + text
                        elif not in_options:
                            current_q_text_parts.append(text)

                # header, footer, instruction, empty → skip

    finalize()
    return questions

def main():
    print("Ekstraktujem i parsiram pitanja iz PDF-a...")
    questions = parse_all(PDF_PATH)
    print(f"Pronađeno {len(questions)} pitanja.")

    subjects = {}
    for q in questions:
        s = q['predmet']
        subjects[s] = subjects.get(s, 0) + 1
    print("\nPitanja po predmetu:")
    for s, count in subjects.items():
        print(f"  {s}: {count}")

    has_img = sum(1 for q in questions if q['has_image'])
    print(f"\nPitanja sa slikom: {has_img}")
    print(f"Pitanja bez slike (za API): {len(questions) - has_img}")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"\nSačuvano u: {OUTPUT_PATH}")

    print("\n--- Prvih 5 pitanja ---")
    for q in questions[:5]:
        print(f"\n#{q['id']} [{q['predmet']}] {q['bodovi']}bod | has_image={q['has_image']}")
        print(f"  Tekst: {q['tekst'][:80]}...")
        for i, opt in enumerate(q['opcije'][:3]):
            print(f"    {i+1}. {opt[:60]}")
        if len(q['opcije']) > 3:
            print(f"    ... ({len(q['opcije'])} opcija ukupno)")

if __name__ == "__main__":
    main()
