import pdfplumber
import sys
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\Korisnik\Downloads\Maturski\Elektrotehnicar-racunara-MI-Prirucnik-2024-2.pdf"

with pdfplumber.open(pdf_path) as pdf:
    # Check pages 40-50 for subject transitions and multi-answer
    for page_num in range(39, 52):
        page = pdf.pages[page_num]
        text = page.extract_text()
        print(f"\n{'='*60}")
        print(f"STRANA {page_num + 1}")
        print('='*60)
        print(text[:3000] if text else "(prazna strana)")
