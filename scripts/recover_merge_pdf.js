const fs = require('fs');

const dataPath = 'data/pitanja.json';
const freshPath = 'data/pitanja_from_pdf.tmp.json';

const current = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const fresh = JSON.parse(fs.readFileSync(freshPath, 'utf8'));

const currentById = new Map(current.map(q => [q.id, q]));
const freshById = new Map(fresh.map(q => [q.id, q]));

function cleanPdfText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\s+/g, ' ')
    .replace(/,(\S)/g, ', $1')
    .replace(/([^\s(])\(/g, '$1 (')
    .replace(/\)(\S)/g, ') $1')
    .replace(/\b([1248]|16|32|64|128|256|512|960|500|250|320|2)\s?GB\b/gi, '$1 GB')
    .replace(/\b([12])\s?TB\b/gi, '$1 TB')
    .replace(/\bUtrenutku\b/g, 'U trenutku')
    .replace(/\bУтренутку\b/g, 'У тренутку')
    .replace(/\bUtehničkoj\b/g, 'U tehničkoj')
    .replace(/\bУтехничкој\b/g, 'У техничкој')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

function norm(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mapAnswer(answer, oldOptions, newOptions) {
  if (answer == null) return answer;
  if (Array.isArray(answer)) return answer.map(item => mapAnswer(item, oldOptions, newOptions));

  const idx = oldOptions.findIndex(opt => norm(opt) === norm(answer));
  if (idx >= 0 && newOptions[idx]) return newOptions[idx];
  return answer;
}

const merged = fresh.map(fq => {
  const old = currentById.get(fq.id) || {};
  const newOptions = (fq.opcije || []).map(cleanPdfText);
  const oldOptions = old.opcije || [];

  return {
    ...old,
    id: fq.id,
    predmet: fq.predmet,
    predmet_naziv: cleanPdfText(fq.predmet_naziv),
    tekst: cleanPdfText(fq.tekst),
    tip: fq.tip,
    bodovi: fq.bodovi,
    opcije: newOptions,
    tacan_odgovor: mapAnswer(old.tacan_odgovor, oldOptions, newOptions),
    objasnjenje: old.objasnjenje,
    has_image: fq.has_image,
    ai_generated: old.ai_generated === true,
  };
});

fs.writeFileSync(dataPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log(`Merged ${merged.length} questions from PDF.`);
