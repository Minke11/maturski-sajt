# Maturski Ispit — Sajt za Pripremu

## Šta treba napraviti

Statički sajt za pripremu maturskog ispita — elektrotehničar računara.
Sajt prikazuje pitanja sa tačnim odgovorima i objašnjenjima kako se dolazi do rešenja.

**Rok: 6.6.2026. — hitno.**

---

## Korak 1 — Ekstrakcija pitanja iz PDF-a

PDF je: `Elektrotehnicar-racunara-MI-Prirucnik-2024-2.pdf`

Instaliraj poppler ako treba:
```bash
# macOS
brew install poppler
# Ubuntu/Debian
apt install poppler-utils
```

Ekstraktuj teorijska pitanja (Aneks 2, strane 20–83):
```bash
pdftotext -f 20 -l 83 Elektrotehnicar-racunara-MI-Prirucnik-2024-2.pdf pitanja_raw.txt
```

### Struktura PDF-a

```
Strane 1–18   → uvod, koncept ispita (preskoči)
Strane 20–83  → ANEKS 2: Teorijska pitanja (~251 pitanje)
Strane 83–191 → ANEKS 3: Praktični radni zadaci
```

### Predmeti u teorijskom delu (Aneks 2)

| Predmet | Srpski naziv |
|---|---|
| `hardver` | Рачунарски хардвер |
| `operativni_sistemi` | Оперативни системи |
| `odrzavanje` | Одржавање рачунарских система |
| `tehnicka_dokumentacija` | Техничка документација |

> **Napomena:** Programiranje i Mikrokontroleri su u Aneksu 3 (praktični deo) — drugačiji format, bavi se njima posebno ako bude trebalo.

### Format pitanja u PDF-u

Pitanja su mešavina:

**Multiple choice (MC) — 1 tačan odgovor:**
```
1.   Prilikom uklanjanja procesora sa matične ploče, prvi korak je:   1

     1. otključati podnožje procesora
     2. ukloniti hladnjak sa matične ploče
     3. ukloniti procesor sa matične ploče
```

**Multiple choice — više tačnih odgovora:**
```
120.  Osobine jezgra operativnog sistema su:    3

      1. Jezgro ne koristi rutine već ih predaje aplikacijama
      2. U slojevitom modelu jezgro je najbliže hardveru
      ...
```

**Broj posle teksta pitanja = broj bodova (1, 2 ili 3)**

**Pitanja sa slikom** — neka pitanja referišu na screenshot/dijagram koji nije u PDF-u:
```
122.  Na osnovu podataka koji su dati u listingu naredbe prikazanom na slici, tačno je:
```
→ Ova pitanja označi `"has_image": true` u JSON-u i preskoči generisanje odgovora za njih (korisnik će ručno dodati).

---

## Korak 2 — Python skript za parsiranje

Napravi `parse_questions.py` koji čita `pitanja_raw.txt` i generiše `data/pitanja.json`.

### JSON struktura za svako pitanje:

```json
{
  "id": 1,
  "predmet": "hardver",
  "predmet_naziv": "Računarski hardver",
  "tekst": "Prilikom uklanjanja procesora sa matične ploče, prvi korak je:",
  "tip": "mc_single",
  "bodovi": 1,
  "opcije": [
    "otključati podnožje procesora",
    "ukloniti hladnjak sa matične ploče",
    "ukloniti procesor sa matične ploče"
  ],
  "tacan_odgovor": null,
  "objasnjenje": null,
  "has_image": false,
  "ai_generated": false
}
```

`tip` vrednosti:
- `"mc_single"` — zaokruži jedan odgovor
- `"mc_multi"` — zaokruži više odgovora
- `"open"` — opisno/esejsko pitanje

---

## Korak 3 — Generisanje odgovora via Claude API

Nakon parsiranja, za svako pitanje gde `has_image: false`, pozovi Claude API da generiše `tacan_odgovor` i `objasnjenje`.

```javascript
// Primer API poziva (Node.js)
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `Ti si profesor elektrotehnike koji sprema učenike za maturski ispit - elektrotehničar računara.

Pitanje: ${pitanje.tekst}
Ponuđeni odgovori: ${pitanje.opcije.map((o, i) => `${i+1}. ${o}`).join('\n')}
Broj bodova: ${pitanje.bodovi}

Odgovori SAMO u JSON formatu (bez markdown backtick-a):
{
  "tacan_odgovor": "tekst tačnog odgovora ili lista ako je više tačnih",
  "objasnjenje": "jasno objašnjenje zašto je taj odgovor tačan, 2-4 rečenice"
}`
    }]
  })
});
```

**Rate limiting:** Dodaj 300ms delay između poziva da ne udariš u API limit.

**Batch po predmetu** — ne šalji sve odjednom, radi po 20 pitanja pa sačuvaj međurezultat.

Rezultat upiši nazad u `data/pitanja.json`.

---

## Korak 4 — Sajt

**Stack:** Vanilla HTML + CSS + JS (bez framework-a). Jedan `index.html`, jedan `style.css`, jedan `app.js`. Hosting na GitHub Pages ili direktno otvori u browseru.

### Dizajn

- **Tamna tema** (dark mode) — `#0f0f0f` pozadina, `#1a1a2e` kartice
- **Akcentna boja:** električna plava `#4fc3f7` ili ljubičasta `#7c4dff`
- Font: `Inter` ili `JetBrains Mono` za kod
- Moderan, clean — ne školski sajt iz 2010.

### Stranice / sekcije

**Glavna strana (`index.html`):**

```
[Header: "Maturski 2026 — Elektrotehničar računara"]

[4 kartice predmeta sa brojem pitanja]
  📦 Računarski hardver     (XX pitanja)
  🖥️  Operativni sistemi    (XX pitanja)
  🔧 Održavanje sistema     (XX pitanja)
  📄 Tehnička dokumentacija (XX pitanja)

[Search bar: "Pretraži pitanja..."]

[Filter: Predmet | Tip | Tačno / Netačno / Sve]

[Lista pitanja — accordion]
```

### Accordion kartica pitanja

Zatvorena:
```
┌─────────────────────────────────────────────────┐
│  #1 · Računarski hardver · 1 bod           [▼]  │
│  Prilikom uklanjanja procesora sa matične...    │
└─────────────────────────────────────────────────┘
```

Otvorena:
```
┌─────────────────────────────────────────────────┐
│  #1 · Računarski hardver · 1 bod           [▲]  │
│  Prilikom uklanjanja procesora sa matične ploče,│
│  prvi korak je:                                 │
│                                                 │
│  ○ otključati podnožje procesora   ← ✅ TAČNO  │
│  ○ ukloniti hladnjak...                        │
│  ○ ukloniti procesor...                        │
│                                                 │
│  💡 Objašnjenje:                               │
│  Pre nego što se procesor može ukloniti,        │
│  mora se otključati ZIF (Zero Insertion Force)  │
│  podnožje...                                    │
│                                                 │
│  [✓ Znam]  [✗ Ne znam]                         │
└─────────────────────────────────────────────────┘
```

### Progress tracker (localStorage)

- Svako pitanje: `znam` / `ne znam` / `neoznačeno`
- Header prikazuje: `Naučeno: 47/251 (18%)`
- Progress bar po predmetu

### Search

- Real-time filter dok kuca
- Pretražuje tekst pitanja i opcije

---

## Folder struktura

```
maturski-sajt/
├── index.html
├── style.css
├── app.js
├── data/
│   └── pitanja.json          ← generisano
├── scripts/
│   ├── parse_questions.py    ← parsiranje PDF-a
│   └── generate_answers.js  ← Claude API pozivi
└── CLAUDE.md                 ← ovaj fajl
```

---

## Redosled rada

1. `parse_questions.py` → generiše `data/pitanja.json` sa `tacan_odgovor: null`
2. `generate_answers.js` → popunjava odgovore i objašnjenja via API
3. Sajt učitava `pitanja.json` i renderuje sve
4. Ručno dodaj odgovore za pitanja sa `has_image: true`

---

## Napomene

- Pitanja su na **ćirilici** — sajt mora pravilno da prikazuje srpska slova
- PDF nema rešenja — "Збирка задатака не садржи решења" — sve odgovore generiše AI
- Neka pitanja referišu na slike/screenshot-ove koji nisu u PDF-u → `has_image: true`, preskoči API, ostavi prazno da korisnik doda ručno
- Ne treba backend, sve je statički — `pitanja.json` se učitava fetch-om
- GitHub Pages za hosting ako treba public link

---

## Prioritet

Rok je **6.6.2026.** Ako nešto mora da se skrati:
1. ✅ Parse pitanja → JSON (obavezno)
2. ✅ Generisanje odgovora via API (obavezno)  
3. ✅ Prikaz pitanja sa accordion + search (obavezno)
4. ⚡ Progress tracker (nice to have)
5. ⚡ Filter po predmetu (nice to have)
