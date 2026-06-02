#!/usr/bin/env node
/**
 * Generates answers and explanations for questions via Claude API.
 * Usage: ANTHROPIC_API_KEY=sk-... node scripts/generate_answers.js
 *
 * Processes questions in batches of 20, saving progress after each batch.
 * Skips questions with has_image=true or where tacan_odgovor is already set.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'pitanja.json');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';
const BATCH_SIZE = 20;
const DELAY_MS = 350;

if (!API_KEY) {
  console.error('Greška: Postavi ANTHROPIC_API_KEY environment varijablu.');
  console.error('  Windows: $env:ANTHROPIC_API_KEY = "sk-ant-..."');
  console.error('  Zatim ponovo pokreni: node scripts/generate_answers.js');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function callClaude(pitanje) {
  const opcijeText = pitanje.opcije.length > 0
    ? '\nПонуђени одговори:\n' + pitanje.opcije.map((o, i) => `${i + 1}. ${o}`).join('\n')
    : '';

  const tipHint = pitanje.tip === 'mc_multi'
    ? '\nНапомена: Постоји VIŠE тачних одговора (задатак носи ' + pitanje.bodovi + ' бода).'
    : pitanje.tip === 'open'
    ? '\nНапомена: Ово је питање отвореног типа — пиши кратак одговор.'
    : '';

  const prompt = `Ти си наставник електротехнике и информатике који припрема ученике за матурски испит — електротехничар рачунара.

Питање (${pitanje.bodovi} бод/а): ${pitanje.tekst}${opcijeText}${tipHint}

Одговори САМО у JSON формату (без markdown блокова, само чист JSON):
${pitanje.tip === 'open'
  ? '{"tacan_odgovor": "kratki tačan odgovor", "objasnjenje": "jasno objašnjenje 2-4 rečenice"}'
  : pitanje.tip === 'mc_multi'
  ? '{"tacan_odgovor": ["tekst prvog tačnog odgovora", "tekst drugog tačnog odgovora"], "objasnjenje": "jasno objašnjenje zašto su ti odgovori tačni, 2-4 rečenice"}'
  : '{"tacan_odgovor": "tekst tačnog odgovora", "objasnjenje": "jasno objašnjenje zašto je taj odgovor tačan, 2-4 rečenice"}'
}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const rawText = data.content[0].text.trim();

  // Strip markdown code fences if present
  const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    // Try to extract JSON object from response
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`JSON parse failed: ${rawText.slice(0, 200)}`);
  }
}

async function main() {
  const questions = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  const toProcess = questions.filter(q => !q.has_image && q.tacan_odgovor === null);
  console.log(`Ukupno pitanja: ${questions.length}`);
  console.log(`Za obradu: ${toProcess.length} (bez slike, bez odgovora)`);
  console.log(`Preskočeno: ${questions.length - toProcess.length} (sa slikom ili već obrađeno)\n`);

  let processed = 0;
  let errors = 0;

  // Index questions by id for fast lookup
  const qById = {};
  for (const q of questions) qById[q.id] = q;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);
    console.log(`\n--- Batch ${batchNum}/${totalBatches} (pitanja ${i + 1}-${Math.min(i + BATCH_SIZE, toProcess.length)}) ---`);

    for (const q of batch) {
      try {
        process.stdout.write(`  #${q.id} [${q.predmet}] ... `);
        const result = await callClaude(q);

        qById[q.id].tacan_odgovor = result.tacan_odgovor;
        qById[q.id].objasnjenje = result.objasnjenje;
        qById[q.id].ai_generated = true;

        console.log('✓');
        processed++;
      } catch (err) {
        console.log(`✗ GREŠKA: ${err.message}`);
        errors++;
      }

      await sleep(DELAY_MS);
    }

    // Save after each batch
    fs.writeFileSync(DATA_PATH, JSON.stringify(questions, null, 2), 'utf-8');
    console.log(`  Sačuvano. (${processed} obrađeno, ${errors} grešaka)`);
  }

  console.log(`\n=== Završeno ===`);
  console.log(`Obrađeno: ${processed}`);
  console.log(`Grešaka:  ${errors}`);
  console.log(`Sačuvano: ${DATA_PATH}`);
}

main().catch(err => {
  console.error('Fatalna greška:', err);
  process.exit(1);
});
