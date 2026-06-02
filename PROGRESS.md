# Maturski Sajt — Progress

**Rok: 6.6.2026.**

---

## Status: 🟢 100% pitanja popunjena, sledeći korak UI/UX

---

## ✅ Urađeno

### 1. Ekstrakcija pitanja iz PDF-a
- Instaliran `pdfplumber` za čitanje PDF-a
- Napisan `scripts/parse_questions.py` koji koristi **X koordinate** iz PDF-a da razlikuje pitanja (x≈65) od opcija (x≈117) i bodova (x≈541)
- Ekstraktovano **251 pitanje** iz strana 20–83
- Automatski detektovana pitanja sa slikama (`has_image: true`) — 31 pitanje

**Raspored po predmetima:**
| Predmet | Pitanja |
|---|---|
| Računarski hardver | 51 |
| Operativni sistemi | 100 |
| Održavanje računarskih sistema | 50 |
| Tehnička dokumentacija | 50 |

### 2. Generisanje odgovora
- Napisan `scripts/generate_answers_claude_cli.py` — koristi `claude -p` CLI (Pro plan, bez API troškova)
- Claude CLI je stigao do **195/220** pitanja pre limita
- Preostali odgovori su dopunjeni ručno iz PDF rendera i stručnog znanja
- `data/pitanja.json` sada ima **251/251 pitanje sa odgovorom i objašnjenjem**
- `has_image` blokeri su uklonjeni za rešena pitanja, pa se odgovori prikazuju i u Study/Test modu
- Čuva napredak svaka 10 pitanja
- Napisan i `scripts/generate_answers.js` kao alternativa sa Anthropic API ključem

### 3. Sajt (`index.html` + `style.css` + `app.js`)

**Dizajn — iOS 26 Glassmorphism:**
- Tamna tema sa ambient gradijentima na pozadini (plava + ljubičasta + zelena)
- `backdrop-filter: blur(20px)` na svim karticama
- Squircle border-radius (`--r-sm: 14px` do `--r-xl: 32px`)
- Top-edge shine efekat (simulacija stakla)
- Gradient tekst u headeru

**Funkcionalnosti:**
- 4 kartice predmeta sa progress barovima — klikabilne kao filter
- Search (real-time filter dok kucaš)
- Filteri: predmet / status (znam/ne znam) / bodovi (1/2/3)
- Accordion kartice — preview tekst se sakriva kada otvoriš pitanje
- Progress tracker u headeru (`Naučeno: X/251`) sa progress barom
- `localStorage` — pamti znam/ne znam između sesija
- **Test mod** (ljubičasto dugme 🎯):
  - Klikneš opciju → zeleno (tačno) ili crveno (pogrešno)
  - Tačan odgovor dobija blagi zeleni glow
  - Objašnjenje se pojavljuje tek NAKON što odgovoriš
  - Dugme `↺ Resetuj` za ponovni pokušaj
- Study mod (default) — tačan odgovor odmah označen zeleno sa `✓ TAČNO`

---

## ⏳ Ostaje

- [x] Dopuniti sve odgovore koji su falili posle Claude limita
- [x] Proveriti da JSON ima 251/251 popunjenih odgovora
- [ ] Brza ručna provera najosetljivijih slikovnih/računskih odgovora
- [ ] Srediti UI/UX

---

## 🗂 Folder struktura

```
C:\Users\Korisnik\Downloads\Maturski\
├── index.html              ← otvori u browseru
├── style.css
├── app.js
├── PROGRESS.md             ← ovaj fajl
├── data/
│   └── pitanja.json        ← 251 pitanje + odgovori
└── scripts/
    ├── parse_questions.py          ← parsira PDF → JSON
    ├── generate_answers_claude_cli.py  ← generiše odgovore (Pro plan)
    ├── generate_answers.js         ← alternativa sa API ključem
    └── generate_log.txt            ← log napretka generisanja
```

---

## 📝 Napomene

- **Generisanje** koristi `claude -p "prompt"` CLI — Pro plan, nema API troškova
- Slikovna pitanja su rešavana iz renderovanih PDF strana u `scripts/rendered_pages/`
- PDF ne sadrži rešenja — sve odgovore generiše AI
- Sajt je čisto statički (vanilla HTML/CSS/JS), radi direktno u browseru bez servera
- Za GitHub Pages hosting: dodati kao public repo i uključiti Pages na `main` grani
