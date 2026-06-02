import pdfplumber
import sys
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\Korisnik\Downloads\Maturski\Elektrotehnicar-racunara-MI-Prirucnik-2024-2.pdf"

with pdfplumber.open(pdf_path) as pdf:
    print(f"Ukupno strana: {len(pdf.pages)}")
    # Ispiši strane 20-25 da vidimo format
    for page_num in range(19, 26):  # 0-indexed
        page = pdf.pages[page_num]
        text = page.extract_text()
        print(f"\n{'='*60}")
        print(f"STRANA {page_num + 1}")
        print('='*60)
        print(text[:2000] if text else "(prazna strana)")
