import pdfplumber
import sys
sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = r"C:\Users\Korisnik\Downloads\Maturski\Elektrotehnicar-racunara-MI-Prirucnik-2024-2.pdf"

# Look at page 21 (index 20) word coordinates
with pdfplumber.open(PDF_PATH) as pdf:
    page = pdf.pages[20]  # page 21
    words = page.extract_words()
    # Show first 60 words with x position
    for w in words[:80]:
        print(f"x={w['x0']:6.1f} y={w['top']:6.1f}  '{w['text']}'")
