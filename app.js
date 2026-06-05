'use strict';

const STORAGE_KEY = 'maturski_progress';
const FOCUS_MODE_KEY = 'maturski_focus_mode';
const LAST_QUESTION_KEY = 'maturski_last_question';

const SUBJECTS = [
  { key: 'hardver', label: 'Računarski hardver', short: 'Hardver', badge: 'badge-hardver', tone: 'hardver', accent: '#7cc7ff' },
  { key: 'operativni_sistemi', label: 'Operativni sistemi', short: 'OS', badge: 'badge-operativni_sistemi', tone: 'os', accent: '#a995ff' },
  { key: 'odrzavanje', label: 'Održavanje računarskih sistema', short: 'Održavanje', badge: 'badge-odrzavanje', tone: 'odrzavanje', accent: '#62e0a8' },
  { key: 'tehnicka_dokumentacija', label: 'Tehnička dokumentacija', short: 'Dokumentacija', badge: 'badge-tehnicka_dokumentacija', tone: 'dokumentacija', accent: '#ffd166' },
];

const SUBJECT_LABEL = Object.fromEntries(SUBJECTS.map(s => [s.key, s.short]));
const SUBJECT_BADGE = Object.fromEntries(SUBJECTS.map(s => [s.key, s.badge]));

let allQuestions = [];
let progress = {};
let filtered = [];
let testMode = false;
let openQuestionId = null;
let examMode = false;
let examSubmitted = false;
let examQuestionIds = [];
let examAnswers = {};
let examMatchAnswers = {};
let examTextAnswers = {};
let examManualGrades = {};
let focusMode = false;
let lastScrollY = 0;
let lightboxScale = 1;
let lightboxOffset = { x: 0, y: 0 };
let lightboxPointers = new Map();
let lightboxPinchStart = null;
let lightboxDragStart = null;

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

const MILESTONES = [25, 50, 75, 100];
let milestoneTimer = null;

function setStatus(id, status) {
  const q = allQuestions.find(item => item.id === id);
  const subjectKey = q ? q.predmet : null;

  let oldPct = null;
  if (subjectKey) {
    const qs = getSubjectQuestions(subjectKey);
    oldPct = qs.length ? Math.round((getKnownCount(qs) / qs.length) * 100) : 0;
  }

  if (progress[id] === status) {
    delete progress[id];
  } else {
    progress[id] = status;
  }

  saveProgress();
  updateProgressUi();

  const card = document.getElementById(`q-${id}`);
  if (card) applyCardStatus(card, id, progress[id] === 'znam');

  if (subjectKey && oldPct !== null && progress[id] === 'znam') {
    const qs = getSubjectQuestions(subjectKey);
    const newPct = qs.length ? Math.round((getKnownCount(qs) / qs.length) * 100) : 0;
    for (const milestone of MILESTONES) {
      if (oldPct < milestone && newPct >= milestone) {
        showMilestoneToast(subjectKey, milestone);
        break;
      }
    }
  }
}

function showMilestoneToast(subjectKey, pct) {
  const subject = SUBJECTS.find(s => s.key === subjectKey);
  if (!subject) return;

  const labels = { 25: 'Dobar početak! 🚀', 50: 'Polovina tu! 💪', 75: 'Skoro gotov! 🔥', 100: 'Savršeno! 🏆' };
  const label = labels[pct] || `${pct}% naučeno`;

  const toast = document.getElementById('milestone-toast');
  toast.hidden = false;
  toast.className = 'milestone-toast milestone-toast-in';
  toast.innerHTML = `
    <div class="mt-bar" style="background:${subject.accent}22;border-color:${subject.accent}44">
      <div class="mt-icon">${subjectSvg(subject.tone)}</div>
      <div class="mt-body">
        <div class="mt-label">${label}</div>
        <div class="mt-name">${escHtml(subject.label)}</div>
      </div>
      <div class="mt-pct" style="color:${subject.accent}">${pct}%</div>
    </div>
    <div class="mt-progress"><div class="mt-progress-fill" style="background:${subject.accent};width:${pct}%"></div></div>`;

  if (milestoneTimer) clearTimeout(milestoneTimer);
  milestoneTimer = window.setTimeout(() => {
    toast.className = 'milestone-toast milestone-toast-out';
    window.setTimeout(() => { toast.hidden = true; toast.className = 'milestone-toast'; }, 450);
  }, 3200);
}

function getSubjectQuestions(subjectKey) {
  return subjectKey ? allQuestions.filter(q => q.predmet === subjectKey) : allQuestions;
}

function getKnownCount(questions = allQuestions) {
  return questions.filter(q => progress[q.id] === 'znam').length;
}

function getUnknownCount(questions = allQuestions) {
  return questions.filter(q => progress[q.id] === 'ne_znam').length;
}

function updateProgressUi() {
  const total = allQuestions.length;
  const known = getKnownCount();
  const unknown = getUnknownCount();
  const pct = total ? Math.round((known / total) * 100) : 0;

  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = `${pct}%`;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('stat-known', known);
  setEl('stat-unknown', unknown);
  setEl('stat-left', Math.max(total - known - unknown, 0));
  const heroRing = document.getElementById('hero-ring');
  if (heroRing) heroRing.setAttribute('stroke-dasharray', `${pct} ${100 - pct}`);
  const heroRingPct = document.getElementById('hero-ring-pct');
  if (heroRingPct) heroRingPct.textContent = `${pct}%`;
  updateContinueButton();

  renderSubjectOverview();
}

function updateContinueButton() {
  const btn = document.getElementById('btn-continue');
  if (!btn || !allQuestions.length) return;

  const lastId = Number(localStorage.getItem(LAST_QUESTION_KEY));
  const q = allQuestions.find(item => item.id === lastId);
  if (!q) {
    btn.hidden = true;
    return;
  }

  btn.hidden = false;
  btn.textContent = `Nastavi #${q.id}`;
}

function continueLastQuestion() {
  const lastId = Number(localStorage.getItem(LAST_QUESTION_KEY));
  const q = allQuestions.find(item => item.id === lastId);
  if (!q) return;

  document.getElementById('filter-subject').value = q.predmet;
  openQuestionId = q.id;
  applyFilters();
  window.setTimeout(() => {
    const card = document.getElementById(`q-${q.id}`);
    if (card) openCard(card);
  }, 80);
}

function renderSubjectOverview() {
  const wrap = document.getElementById('subject-overview');
  if (!wrap) return;

  const activeSubject = getFilters().subject;

  if (!activeSubject && !examMode) {
    wrap.className = 'subject-overview';
    wrap.innerHTML = SUBJECTS.map(subject => {
      const questions = getSubjectQuestions(subject.key);
      const known = getKnownCount(questions);
      const unknown = getUnknownCount(questions);
      const total = questions.length;
      const pct = total ? Math.round((known / total) * 100) : 0;
      const untouched = Math.max(total - known - unknown, 0);

      return `
        <button class="subject-tile subject-${subject.tone}" data-subject="${subject.key}">
          <span class="subject-tile-icon">${subjectSvg(subject.tone)}</span>
          <span class="subject-tile-name">${escHtml(subject.label)}</span>
          <svg class="subject-mini-ring" viewBox="0 0 52 52" aria-label="${pct}% naučeno">
            <circle cx="26" cy="26" r="19" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5"/>
            <circle cx="26" cy="26" r="19" fill="none" stroke="${subject.accent}" stroke-width="5"
              stroke-linecap="round" pathLength="100" stroke-dasharray="${pct} ${100 - pct}"
              transform="rotate(-90 26 26)"/>
            <text x="26" y="26" text-anchor="middle" dominant-baseline="central" fill="#e8f2ff"
              font-size="10.5" font-weight="800" font-family="Manrope,sans-serif">${pct}%</text>
          </svg>
          <span class="subject-track">
            <span><b>${known}</b> naučeno</span>
            <span><b>${unknown}</b> vežba</span>
            <span><b>${untouched}</b> novo</span>
          </span>
          <span class="subject-progress"><span style="width:${pct}%; ${pct === 0 ? 'opacity:0;' : ''}"></span></span>
        </button>`;
    }).join('');

    wrap.querySelectorAll('.subject-tile').forEach(tile => {
      tile.addEventListener('click', () => setSubjectFilter(tile.dataset.subject));
    });
    return;
  }

  if (examMode) {
    wrap.className = 'subject-overview subject-overview-empty';
    wrap.innerHTML = '';
    return;
  }

  if (activeSubject) {
    const subject = SUBJECTS.find(item => item.key === activeSubject);
    const questions = getSubjectQuestions(subject.key);
    const known = getKnownCount(questions);
    const unknown = getUnknownCount(questions);
    const total = questions.length;
    const pct = total ? Math.round((known / total) * 100) : 0;
    const left = Math.max(total - known - unknown, 0);

    wrap.className = 'subject-overview subject-overview-focus';
    wrap.innerHTML = `
      <section class="subject-focus subject-${subject.tone}" data-subject="${subject.key}">
        <div class="subject-focus-art">${subjectSvg(subject.tone)}</div>
        <div class="subject-focus-copy">
          <span class="focus-kicker">Aktivan predmet</span>
          <h3>${escHtml(subject.label)}</h3>
          <p>${known} naučeno, ${unknown} za vežbu, ${left} novo.</p>
        </div>
        <div class="focus-meter">
          <strong>${pct}%</strong>
          <span class="subject-progress"><span style="width:${pct}%; ${pct === 0 ? 'opacity:0;' : ''}"></span></span>
        </div>
      </section>`;
    return;
  }
}

function subjectSvg(tone) {
  const base = {
    hardver: '<path d="M18 30h28v24H18z"/><path d="M24 18h16v12H24z"/><path d="M12 38H6m52 0h-6M26 60v8m12-8v8"/>',
    os: '<rect x="14" y="16" width="40" height="30" rx="6"/><path d="M24 56h20M32 46v10"/><path d="M23 27h7m6 0h7M23 36h20"/>',
    odrzavanje: '<path d="M43 16l5 5-12 12 4 4 12-12 5 5c1-8-6-15-14-14Z"/><path d="M31 39 16 54a7 7 0 0 0 10 10l15-15"/>',
    dokumentacija: '<path d="M20 12h24l12 12v36H20z"/><path d="M44 12v14h12"/><path d="M28 34h18M28 44h18M28 54h10"/>',
  };
  return `<svg viewBox="0 0 72 72" aria-hidden="true">${base[tone]}</svg>`;
}

function updateCounts() {
  document.getElementById('nav-count-all').textContent = allQuestions.length;
  for (const subject of SUBJECTS) {
    const total = getSubjectQuestions(subject.key).length;
    const navCount = document.getElementById(`nav-count-${subject.key}`);
    if (navCount) navCount.textContent = total;
  }
}

function toggleTestMode() {
  testMode = !testMode;
  const btn = document.getElementById('btn-test-mode');
  btn.classList.toggle('active', testMode);
  btn.innerHTML = testMode
    ? '<span class="test-dot"></span> Test mod: ON'
    : '<span class="test-dot"></span> Test mod';
  renderList();
}

let shuffleMode = false;
const SHUFFLE_KEY = 'maturski_shuffle';

function loadShuffleMode() {
  shuffleMode = localStorage.getItem(SHUFFLE_KEY) === '1';
  applyShuffleMode(false);
}

function toggleShuffleMode() {
  shuffleMode = !shuffleMode;
  localStorage.setItem(SHUFFLE_KEY, shuffleMode ? '1' : '0');
  applyShuffleMode(true);
}

function applyShuffleMode(refilter = false) {
  const btn = document.getElementById('btn-shuffle-mode');
  if (btn) {
    btn.classList.toggle('active', shuffleMode);
    btn.textContent = shuffleMode ? '⇄ Shuffle: ON' : '⇄ Shuffle';
  }
  if (refilter) applyFilters();
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getFilters() {
  return {
    query: document.getElementById('search-input').value.trim().toLowerCase(),
    subject: document.getElementById('filter-subject').value,
    status: document.getElementById('filter-status').value,
    bodovi: document.getElementById('filter-bodovi').value,
  };
}

function applyFilters() {
  const { query, subject, status, bodovi } = getFilters();

  if (examMode) {
    const byId = new Map(allQuestions.map(q => [q.id, q]));
    filtered = examQuestionIds.map(id => byId.get(id)).filter(Boolean);
  } else {
    filtered = subject ? allQuestions.filter(q => {
    if (subject && q.predmet !== subject) return false;
    if (bodovi && String(q.bodovi) !== bodovi) return false;
    if (status) {
      const s = progress[q.id] || 'neoznaceno';
      if (s !== status) return false;
    }
    if (query) {
      const haystack = `${q.tekst} ${q.opcije.join(' ')} ${q.tacan_odgovor || ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
    }) : [];
  }

  if (shuffleMode && !examMode) filtered = shuffleArray(filtered);

  updateViewTitle();
  updateSubjectActiveStates();
  renderSubjectOverview();
  document.body.classList.toggle('home-view', !subject && !examMode);
  document.body.classList.toggle('subject-view', Boolean(subject) && !examMode);
  document.body.classList.toggle('exam-view', examMode);
  document.getElementById('exam-panel').hidden = !examMode;

  const countEl = document.getElementById('results-count');
  countEl.textContent = examMode
    ? `${filtered.length} pitanja u simulaciji`
    : subject ? `${filtered.length} od ${getSubjectQuestions(subject).length} pitanja` : '';

  renderList();
}

function setSubjectFilter(subjectKey) {
  examMode = false;
  examSubmitted = false;
  examQuestionIds = [];
  examAnswers = {};
  examMatchAnswers = {};
  examTextAnswers = {};
  examManualGrades = {};
  document.getElementById('exam-result').hidden = true;
  document.getElementById('filter-subject').value = subjectKey || '';
  openQuestionId = null;
  applyFilters();
  scrollToTop();
}

function updateSubjectActiveStates() {
  const activeSubject = getFilters().subject;

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.subject === activeSubject);
  });

  document.querySelectorAll('.subject-tile').forEach(tile => {
    tile.classList.toggle('active', tile.dataset.subject === activeSubject);
  });
}

function updateViewTitle() {}

function renderList() {
  const list = document.getElementById('questions-list');

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"></div>
        <div class="empty-state-text">Nema pitanja koja odgovaraju filterima.</div>
      </div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const q of filtered) {
    fragment.appendChild(createCard(q));
  }

  list.innerHTML = '';
  list.appendChild(fragment);

  if (openQuestionId && !document.getElementById(`q-${openQuestionId}`)) {
    openQuestionId = null;
  }
}

function createCard(q) {
  const card = document.createElement('article');
  card.className = 'q-card';
  card.id = `q-${q.id}`;
  if (q.id === openQuestionId) card.classList.add('open');

  const hasAnswer = q.tacan_odgovor !== null && q.tacan_odgovor !== undefined;
  const answerHtml = hasAnswer ? createAnswerHtml(q) : '';
  const testableOptions = q.opcije.length > 0 && hasAnswer && !shouldShowAnswerPanel(q);
  const optionsHtml = createOptionsHtml(q, hasAnswer, testableOptions);
  const explanationHtml = hasAnswer && q.objasnjenje ? createExplanationHtml(q) : '';
  const examMatchHtml = createExamMatchHtml(q);
  const actionsHtml = createActionsHtml(q, testableOptions);
  const examManualHtml = createExamManualHtml(q);
  const previewText = q.tekst.length > 92 ? `${q.tekst.slice(0, 92).trimEnd()}...` : q.tekst;
  const questionTextHtml = createQuestionTextHtml(q.tekst);
  const imageHtml = q.image ? createQuestionImageHtml(q) : '';

  card.innerHTML = `
    <div class="q-header" role="button" tabindex="0" aria-expanded="${q.id === openQuestionId}">
      <div class="q-topline">
        <span class="q-num">#${q.id}</span>
        <span class="q-badge ${SUBJECT_BADGE[q.predmet]}">${SUBJECT_LABEL[q.predmet]}</span>
        <span class="q-bod">${q.bodovi} bod${q.bodovi === 1 ? '' : 'a'}</span>
      </div>
      <p class="q-preview">${escHtml(previewText)}</p>
      <span class="q-status-icon" aria-hidden="true"></span>
      <span class="q-toggle" aria-hidden="true"></span>
    </div>
    <div class="q-body">
      <div class="q-full-text">${questionTextHtml}</div>
      ${imageHtml}
      ${optionsHtml}
      ${examMatchHtml}
      ${answerHtml}
      ${explanationHtml}
      ${examManualHtml}
      ${actionsHtml}
    </div>`;

  if (!examMode) applyCardStatus(card, q.id);
  bindCardEvents(card, q);

  return card;
}

function createQuestionImageHtml(q) {
  return `
    <figure class="q-image">
      <img src="${escHtml(q.image)}" alt="Slika uz pitanje #${q.id}" loading="lazy" />
      <figcaption>Dodirni za uvećanje</figcaption>
    </figure>`;
}

function createOptionsHtml(q, hasAnswer, testableOptions) {
  if (!q.opcije.length) return '';

  const isMulti = q.tip === 'mc_multi';

  const items = q.opcije.map((opt, idx) => {
    const correct = hasAnswer && isCorrectOption(q, opt);

    if (examMode && (isManualExamQuestion(q) || needsSelfGrade(q))) {
      return `<li class="q-option q-option-reference">
        <span class="opt-marker">${idx + 1}</span>
        <span class="opt-text">${formatInlineOption(opt)}</span>
      </li>`;
    }

    if (examMode) {
      const selected = (examAnswers[q.id] || []).includes(idx);
      const revealClass = examSubmitted
        ? correct ? ' exam-correct' : selected ? ' exam-wrong' : ''
        : selected ? ' exam-selected' : '';
      const typeClass = isMulti ? ' exam-multi' : ' exam-single';

      return `<li class="q-option q-option-exam${revealClass}${typeClass}" data-qid="${q.id}" data-idx="${idx}">
        <span class="opt-marker">${idx + 1}</span>
        <span class="opt-text">${formatInlineOption(opt)}</span>
        ${examSubmitted && correct ? '<span class="opt-correct-tag">Tačno</span>' : ''}
      </li>`;
    }

    if (testMode && testableOptions) {
      return `<li class="q-option q-option-test" data-correct="${correct}" data-qid="${q.id}">
        <span class="opt-marker">${idx + 1}</span>
        <span class="opt-text">${formatInlineOption(opt)}</span>
        <span class="opt-feedback"></span>
      </li>`;
    }

    const cls = correct ? 'q-option correct' : 'q-option';
    const tag = correct ? '<span class="opt-correct-tag">Tačno</span>' : '';
    return `<li class="${cls}">
      <span class="opt-marker">${idx + 1}</span>
      <span class="opt-text">${formatInlineOption(opt)}</span>
      ${tag}
    </li>`;
  }).join('');

  let examHint = '';
  if (examMode && !examSubmitted) {
    if (needsSelfGrade(q)) {
      examHint = `<div class="selfgrade-notice">
        <span class="selfgrade-badge">Uparivanje</span>
        <span>Pogledaj opcije ispod i razmisli o odgovoru. Tačno rešenje i ocenjivanje dostupni su po završetku testa.</span>
      </div>`;
    } else if (isMulti) {
      examHint = `<p class="exam-multi-hint">Izaberi više tačnih odgovora</p>`;
    }
  }

  return `${examHint}<ol class="q-options">${items}</ol>`;
}

function isManualExamQuestion(q) {
  // Only truly open-ended (no options) questions need textarea
  return examMode && !isAutoGradable(q) && !isMatchingQuestion(q) && q.opcije.length === 0;
}

function needsSelfGrade(q) {
  // Has options but can't auto-grade (matching/pairing questions)
  // Show options as reference + show answer + self-grade buttons
  return examMode && !isAutoGradable(q) && !isMatchingQuestion(q) && q.opcije.length > 0;
}

function isMatchingQuestion(q) {
  return Array.isArray(q.match_sequence) && q.match_sequence.length > 0;
}

function normalizeMatchValue(value) {
  return String(value || '').trim().toUpperCase();
}

function sameMatchSequence(values, expected) {
  if (!Array.isArray(values) || values.length !== expected.length) return false;
  return expected.every((item, idx) => normalizeMatchValue(values[idx]) === normalizeMatchValue(item));
}

function createExamMatchHtml(q) {
  if (!examMode || !isMatchingQuestion(q)) return '';

  const current = examMatchAnswers[q.id] || [];
  const fields = q.match_sequence.map((expected, idx) => {
    const value = current[idx] || '';
    const correct = examSubmitted && normalizeMatchValue(value) === normalizeMatchValue(expected);
    const wrong = examSubmitted && value && !correct;
    return `
      <label class="match-cell ${correct ? 'match-correct' : wrong ? 'match-wrong' : ''}">
        <span>Pozicija ${idx + 1}</span>
        <input class="match-input" data-id="${q.id}" data-idx="${idx}" value="${escHtml(value)}" ${examSubmitted ? 'readonly' : ''} inputmode="text" maxlength="2" />
      </label>`;
  }).join('');

  const solution = examSubmitted
    ? `<p class="match-solution">Tačan niz: <strong>${q.match_sequence.map(escHtml).join(' - ')}</strong></p>`
    : '<p class="match-hint">Upiši brojeve redom po praznim linijama na slici/zadatku.</p>';

  return `
    <div class="exam-match">
      <div class="panel-title">Uparivanje</div>
      <div class="match-grid">${fields}</div>
      ${solution}
    </div>`;
}

function createExamManualHtml(q) {
  const isTrulyManual = isManualExamQuestion(q);
  const isSelfGrade = needsSelfGrade(q);
  if (!isTrulyManual && !isSelfGrade) return '';

  // Pre-submit
  if (!examSubmitted) {
    const saved = examTextAnswers[q.id] || '';
    if (isSelfGrade) {
      return `
        <label class="exam-manual exam-attempt-wrap">
          <span class="panel-title">Napiši šta misliš da je odgovor</span>
          <textarea class="exam-text-answer exam-attempt-area" data-id="${q.id}" placeholder="Upiši tvoj pokušaj (opciono)...">${escHtml(saved)}</textarea>
        </label>`;
    }
    if (!isTrulyManual) return '';
    return `
      <label class="exam-manual">
        <span class="panel-title">Tvoj odgovor</span>
        <textarea class="exam-text-answer" data-id="${q.id}" placeholder="Upiši odgovor ovde...">${escHtml(saved)}</textarea>
      </label>`;
  }

  // Post-submit: show answer + self-grade for both types
  const grade = examManualGrades[q.id];
  const gradeClass = grade === true ? 'manual-correct' : grade === false ? 'manual-wrong' : '';

  let studentSectionHtml = '';
  const savedAttempt = examTextAnswers[q.id] || '';
  if (isTrulyManual || (isSelfGrade && savedAttempt)) {
    const label = isSelfGrade ? 'Tvoj pokušaj' : 'Tvoj odgovor';
    studentSectionHtml = `
      <div class="manual-section">
        <span class="manual-label">${label}</span>
        ${savedAttempt
          ? `<div class="manual-student-answer">${escHtml(savedAttempt)}</div>`
          : `<div class="manual-student-answer muted-inline">— nije upisano —</div>`}
      </div>`;
  }

  let correctAnswerHtml = '';
  if (q.tacan_odgovor !== null && q.tacan_odgovor !== undefined) {
    const rows = splitStructuredText(q.tacan_odgovor);
    const content = rows.length > 1
      ? `<ul class="manual-answer-list">${rows.map(r => `<li>${formatPair(r)}</li>`).join('')}</ul>`
      : `<p>${escHtml(String(q.tacan_odgovor))}</p>`;
    correctAnswerHtml = `
      <div class="manual-correct-answer">
        <span class="manual-label">Tačan odgovor</span>
        <div class="manual-answer-body">${content}</div>
      </div>`;
  }

  let explanationHtml = '';
  if (q.objasnjenje) {
    const paragraphs = splitParagraphs(q.objasnjenje);
    explanationHtml = `
      <div class="manual-explanation">
        <span class="manual-label">Objašnjenje</span>
        <div class="q-explanation-text">${paragraphs.map(p => `<p>${escHtml(p)}</p>`).join('')}</div>
      </div>`;
  }

  const gradeButtons = grade === undefined
    ? `<div class="manual-grade-prompt">
         <span>Odgovorio/la si tačno?</span>
         <div class="manual-actions">
           <button class="btn-action btn-manual-correct" data-id="${q.id}" type="button">✓ Tačno</button>
           <button class="btn-action btn-manual-wrong" data-id="${q.id}" type="button">✗ Netačno</button>
         </div>
       </div>`
    : `<div class="manual-grade-done ${grade === true ? 'grade-done-correct' : 'grade-done-wrong'}">
         <span>${grade === true ? '✓ Tačno' : '✗ Netačno'}</span>
         <button class="btn-action btn-manual-undo" data-id="${q.id}" type="button">Promeni</button>
       </div>`;

  return `
    <div class="exam-manual-review ${gradeClass}">
      <div class="manual-compare">
        ${studentSectionHtml}
        ${correctAnswerHtml}
        ${explanationHtml}
      </div>
      ${gradeButtons}
    </div>`;
}

function createQuestionTextHtml(text) {
  return splitReadableBlocks(text)
    .map(block => `<p>${escHtml(block)}</p>`)
    .join('');
}

function formatInlineOption(text) {
  return escHtml(text).replace(/,\s*/g, ', ');
}

function createAnswerHtml(q) {
  if (examMode && !examSubmitted) return '';
  if (examMode && examSubmitted && (isManualExamQuestion(q) || needsSelfGrade(q))) return '';
  if (q.opcije.length && !shouldShowAnswerPanel(q)) return '';
  const rows = splitStructuredText(q.tacan_odgovor);
  const content = rows.length > 1
    ? `<ul class="answer-list">${rows.map(row => `<li>${formatPair(row)}</li>`).join('')}</ul>`
    : `<p>${escHtml(String(q.tacan_odgovor))}</p>`;

  return `
    <div class="solution-panel">
      <div class="panel-title">Rešenje</div>
      ${content}
    </div>`;
}

function shouldShowAnswerPanel(q) {
  if (!q.opcije.length) return true;
  const answers = Array.isArray(q.tacan_odgovor) ? q.tacan_odgovor : [q.tacan_odgovor];
  if (Array.isArray(q.tacan_odgovor)) {
    return !answers.every(answer => q.opcije.some(opt => answerMatchesOption(answer, opt)));
  }
  return !q.opcije.some(opt => answerMatchesOption(q.tacan_odgovor, opt));
}

function createExplanationHtml(q) {
  if (examMode && examSubmitted && (isManualExamQuestion(q) || needsSelfGrade(q))) return '';
  const paragraphs = splitParagraphs(q.objasnjenje);
  const className = (testMode || (examMode && !examSubmitted)) ? 'q-explanation q-explanation-hidden' : 'q-explanation';

  return `
    <div class="${className}" id="expl-${q.id}">
      <div class="panel-title">Objašnjenje</div>
      <div class="q-explanation-text">
        ${paragraphs.map(p => `<p>${escHtml(p)}</p>`).join('')}
      </div>
    </div>`;
}

function createActionsHtml(q, testableOptions) {
  if (examMode) return '';

  const reset = testMode && testableOptions
    ? `<button class="btn-action btn-reset-test" data-id="${q.id}">Ponovo</button>`
    : '';

  return `
    <div class="q-actions">
      ${reset}
      <button class="btn-action btn-znam" data-id="${q.id}" data-status="znam">Znam</button>
      <button class="btn-action btn-ne-znam" data-id="${q.id}" data-status="ne_znam">Vežbaj</button>
    </div>`;
}

function bindCardEvents(card, q) {
  const header = card.querySelector('.q-header');
  header.addEventListener('click', () => toggleCard(card, q.id));
  header.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCard(card, q.id);
    }
  });

  card.querySelectorAll('.btn-znam, .btn-ne-znam').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      setStatus(Number(btn.dataset.id), btn.dataset.status);
    });
  });

  const resetBtn = card.querySelector('.btn-reset-test');
  if (resetBtn) {
    resetBtn.addEventListener('click', event => {
      event.stopPropagation();
      resetTestCard(card);
    });
  }

  const image = card.querySelector('.q-image img');
  if (image) {
    image.addEventListener('click', event => {
      event.stopPropagation();
      openImageLightbox(image.src, image.alt);
    });
  }

  const textAnswer = card.querySelector('.exam-text-answer');
  if (textAnswer) {
    textAnswer.addEventListener('input', () => {
      examTextAnswers[q.id] = textAnswer.value;
    });
  }

  card.querySelectorAll('.match-input').forEach(input => {
    input.addEventListener('input', () => {
      const id = Number(input.dataset.id);
      const idx = Number(input.dataset.idx);
      const current = examMatchAnswers[id] || [];
      current[idx] = input.value;
      examMatchAnswers[id] = current;
    });
  });

  card.querySelectorAll('.btn-manual-correct, .btn-manual-wrong').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      examManualGrades[q.id] = btn.classList.contains('btn-manual-correct');
      renderList();
      updateExamResult();
    });
  });

  const undoBtn = card.querySelector('.btn-manual-undo');
  if (undoBtn) {
    undoBtn.addEventListener('click', event => {
      event.stopPropagation();
      delete examManualGrades[q.id];
      renderList();
      updateExamResult();
    });
  }

  if (examMode && q.opcije.length && !isManualExamQuestion(q) && !isMatchingQuestion(q) && !needsSelfGrade(q)) {
    card.querySelectorAll('.q-option-exam').forEach(optEl => {
      optEl.addEventListener('click', event => {
        event.stopPropagation();
        if (examSubmitted) return;
        toggleExamOption(q, Number(optEl.dataset.idx));
      });
    });
  } else if (testMode && q.opcije.length && !shouldShowAnswerPanel(q)) {
    card.querySelectorAll('.q-option-test').forEach(optEl => {
      optEl.addEventListener('click', event => {
        event.stopPropagation();
        handleTestOptionClick(card, optEl, q);
      });
    });
  }
}

function isAutoGradable(q) {
  if (isMatchingQuestion(q)) return true;
  if (!q.opcije.length || q.tacan_odgovor == null) return false;
  const answers = Array.isArray(q.tacan_odgovor) ? q.tacan_odgovor : [q.tacan_odgovor];
  return answers.every(a => q.opcije.some(opt => answerMatchesOption(a, opt)));
}

function correctOptionIndexes(q) {
  const answers = Array.isArray(q.tacan_odgovor) ? q.tacan_odgovor : [q.tacan_odgovor];
  return q.opcije
    .map((opt, idx) => answers.some(a => normalize(a) === normalize(opt)) ? idx : -1)
    .filter(idx => idx >= 0);
}

function sameIndexes(a, b) {
  if (a.length !== b.length) return false;
  const aa = [...a].sort((x, y) => x - y);
  const bb = [...b].sort((x, y) => x - y);
  return aa.every((value, idx) => value === bb[idx]);
}

function buildExamQuestions() {
  const pool = allQuestions.filter(q => q.tacan_odgovor !== null && q.tacan_odgovor !== undefined);
  const byPoints = {
    1: pool.filter(q => q.bodovi === 1),
    2: pool.filter(q => q.bodovi === 2),
    3: pool.filter(q => q.bodovi === 3),
  };

  const validPlans = [];
  for (let threes = 0; threes <= byPoints[3].length; threes++) {
    for (let twos = 0; twos <= byPoints[2].length; twos++) {
      const ones = 50 - threes - twos;
      if (ones < 0 || ones > byPoints[1].length) continue;
      if (ones + (twos * 2) + (threes * 3) === 100) {
        validPlans.push({ 1: ones, 2: twos, 3: threes });
      }
    }
  }

  const plan = validPlans[Math.floor(Math.random() * validPlans.length)];
  if (!plan) return pool.sort(() => Math.random() - 0.5).slice(0, 50);

  return [1, 2, 3].flatMap(points =>
    byPoints[points]
      .sort(() => Math.random() - 0.5)
      .slice(0, plan[points])
  ).sort(() => Math.random() - 0.5);
}

function startExamMode() {
  const picked = buildExamQuestions();
  examMode = true;
  testMode = false;
  examSubmitted = false;
  examQuestionIds = picked.map(q => q.id);
  examAnswers = {};
  examMatchAnswers = {};
  examTextAnswers = {};
  examManualGrades = {};
  openQuestionId = null;
  document.getElementById('filter-subject').value = '';
  document.getElementById('btn-test-mode').classList.remove('active');
  document.getElementById('btn-test-mode').innerHTML = '<span class="test-dot"></span> Test mod';
  document.getElementById('exam-result').hidden = true;
  const manualCount = picked.filter(q => !isAutoGradable(q)).length;
  document.getElementById('exam-summary').textContent = `${picked.length} pitanja, ukupno ${picked.reduce((sum, q) => sum + q.bodovi, 0)} bodova. ${manualCount ? `${manualCount} pitanja se ocenjuje ručno.` : 'Nema negativnih bodova.'}`;
  document.getElementById('btn-exam-submit').disabled = false;
  document.getElementById('btn-exam-submit').textContent = 'Završi test';
  applyFilters();
  scrollToTop();
}

function openExamConfirm() {
  const modal = document.getElementById('exam-confirm');
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('visible'));
}

function closeExamConfirm() {
  const modal = document.getElementById('exam-confirm');
  modal.classList.remove('visible');
  window.setTimeout(() => {
    modal.hidden = true;
  }, 160);
}

function confirmExamStart() {
  closeExamConfirm();
  startExamMode();
}

function exitExamMode() {
  examMode = false;
  examSubmitted = false;
  examQuestionIds = [];
  examAnswers = {};
  examMatchAnswers = {};
  examTextAnswers = {};
  examManualGrades = {};
  openQuestionId = null;
  document.getElementById('exam-result').hidden = true;
  document.getElementById('filter-subject').value = '';
  applyFilters();
  scrollToTop();
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.classList.remove('chrome-hidden');
}

function setHomeDate() {
  const el = document.getElementById('home-date');
  if (!el) return;
  const now = new Date();
  const days = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];
  const months = ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'];
  el.textContent = `${days[now.getDay()]}, ${now.getDate()}. ${months[now.getMonth()]}`;
}

function handleChromeVisibility() {
  const y = window.scrollY || 0;
  const isMobile = window.matchMedia('(max-width: 560px)').matches;

  if (!isMobile || y < 120) {
    document.body.classList.remove('chrome-hidden');
    lastScrollY = y;
    return;
  }

  if (y > lastScrollY + 8) {
    document.body.classList.add('chrome-hidden');
  } else if (y < lastScrollY - 8) {
    document.body.classList.remove('chrome-hidden');
  }

  lastScrollY = y;
}

function applyLightboxTransform() {
  const img = document.getElementById('lightbox-img');
  const box = document.getElementById('image-lightbox');
  img.style.transform = `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxScale})`;
  box.classList.toggle('zoomed', lightboxScale > 1.02);
}

function setLightboxScale(scale, resetOffset = false) {
  lightboxScale = Math.min(Math.max(scale, 1), 5);
  if (lightboxScale <= 1.02 || resetOffset) {
    lightboxScale = Math.max(lightboxScale, 1);
    lightboxOffset = { x: 0, y: 0 };
  }
  applyLightboxTransform();
}

function openImageLightbox(src, alt) {
  const box = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.alt = alt || 'Slika uz pitanje';
  lightboxOffset = { x: 0, y: 0 };
  setLightboxScale(1, true);
  box.hidden = false;
}

function closeImageLightbox() {
  document.getElementById('image-lightbox').hidden = true;
  lightboxPointers.clear();
  lightboxPinchStart = null;
  lightboxDragStart = null;
}

function initImageLightbox() {
  const box = document.getElementById('image-lightbox');
  const stage = document.getElementById('lightbox-stage');

  document.getElementById('lightbox-close').addEventListener('click', closeImageLightbox);
  document.getElementById('lightbox-zoom-in').addEventListener('click', () => setLightboxScale(lightboxScale + 0.25));
  document.getElementById('lightbox-zoom-out').addEventListener('click', () => setLightboxScale(lightboxScale - 0.25));
  document.getElementById('lightbox-reset').addEventListener('click', () => setLightboxScale(1, true));

  box.addEventListener('click', event => {
    if (event.target === box) closeImageLightbox();
  });

  stage.addEventListener('pointerdown', event => {
    event.preventDefault();
    lightboxPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    if (lightboxPointers.size === 1) {
      lightboxDragStart = {
        x: event.clientX,
        y: event.clientY,
        ox: lightboxOffset.x,
        oy: lightboxOffset.y,
      };
    }
    if (lightboxPointers.size === 2) {
      const points = [...lightboxPointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      lightboxPinchStart = { distance, scale: lightboxScale };
      lightboxDragStart = null;
    }
  });

  stage.addEventListener('pointermove', event => {
    if (!lightboxPointers.has(event.pointerId)) return;
    event.preventDefault();
    lightboxPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (lightboxPointers.size === 2) {
      const points = [...lightboxPointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (!lightboxPinchStart) {
        lightboxPinchStart = { distance, scale: lightboxScale };
      } else {
        setLightboxScale(lightboxPinchStart.scale * (distance / lightboxPinchStart.distance));
      }
      return;
    }

    if (lightboxScale > 1.02 && lightboxDragStart) {
      lightboxOffset = {
        x: lightboxDragStart.ox + (event.clientX - lightboxDragStart.x),
        y: lightboxDragStart.oy + (event.clientY - lightboxDragStart.y),
      };
      applyLightboxTransform();
    }
  });

  const clearPointer = event => {
    lightboxPointers.delete(event.pointerId);
    if (lightboxPointers.size < 2) lightboxPinchStart = null;
    if (lightboxPointers.size === 1) {
      const [point] = lightboxPointers.values();
      lightboxDragStart = {
        x: point.x,
        y: point.y,
        ox: lightboxOffset.x,
        oy: lightboxOffset.y,
      };
    } else {
      lightboxDragStart = null;
    }
  };
  stage.addEventListener('pointerup', clearPointer);
  stage.addEventListener('pointercancel', clearPointer);

  stage.addEventListener('wheel', event => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 0.22 : -0.22;
    setLightboxScale(lightboxScale + direction);
  }, { passive: false });
}

function toggleExamOption(q, idx) {
  const current = examAnswers[q.id] || [];
  const isMulti = q.tip === 'mc_multi';
  const selected = current.includes(idx);
  let next;

  if (isMulti) {
    next = selected ? current.filter(item => item !== idx) : [...current, idx];
  } else {
    next = selected ? [] : [idx];
  }

  examAnswers[q.id] = next;
  renderList();
}

function getTheoryGrade(score) {
  if (score <= 50) return { grade: 1, label: 'nedovoljan', passed: false };
  if (score <= 63) return { grade: 2, label: 'dovoljan', passed: true };
  if (score <= 75) return { grade: 3, label: 'dobar', passed: true };
  if (score <= 87) return { grade: 4, label: 'vrlo dobar', passed: true };
  return { grade: 5, label: 'odličan', passed: true };
}

function getExamQuestions() {
  const examSet = new Set(examQuestionIds);
  return allQuestions.filter(q => examSet.has(q.id));
}

function calculateExamScore() {
  let score = 0;
  const questions = getExamQuestions();

  for (const q of questions) {
    if (isMatchingQuestion(q) && sameMatchSequence(examMatchAnswers[q.id] || [], q.match_sequence)) {
      score += q.bodovi;
    } else if (!isMatchingQuestion(q) && isAutoGradable(q) && sameIndexes(examAnswers[q.id] || [], correctOptionIndexes(q))) {
      score += q.bodovi;
    } else if (!isAutoGradable(q) && examManualGrades[q.id] === true) {
      score += q.bodovi;
    }
  }

  return score;
}

function updateExamResult() {
  const questions = getExamQuestions();
  const manual = questions.filter(q => !isAutoGradable(q) && !isMatchingQuestion(q));
  const pendingManual = manual.filter(q => examManualGrades[q.id] === undefined).length;
  const totalManual = manual.length;
  const resultEl = document.getElementById('exam-result');
  resultEl.hidden = false;

  if (pendingManual > 0) {
    const gradedCount = totalManual - pendingManual;
    const pct = totalManual ? Math.round((gradedCount / totalManual) * 100) : 0;
    resultEl.className = 'exam-result pending';
    resultEl.innerHTML = `
      <div class="pending-header">
        <span class="pending-icon">!</span>
        <div>
          <div class="pending-title">Pregledaj još ${pendingManual} pitanje${pendingManual === 1 ? '' : 'a'}</div>
          <div class="pending-desc">Otvori pitanja označena žutim i klikni ✓ Tačno ili ✗ Netačno — tek tada dobijaš ocenu.</div>
        </div>
      </div>
      <div class="pending-progress">
        <div class="pending-bar"><div class="pending-bar-fill" style="width:${pct}%"></div></div>
        <span class="pending-count">Ocenjeno ${gradedCount} / ${totalManual}</span>
      </div>`;
    return;
  }

  const score = calculateExamScore();
  const result = getTheoryGrade(score);
  resultEl.className = `exam-result ${result.passed ? 'passed' : 'failed'}`;
  resultEl.innerHTML = `
    <strong>${result.passed ? 'Položio si' : 'Nisi položio'}: ${score}/100 bodova</strong>
    <span>Ocena ${result.grade} (${result.label})</span>`;
}

function submitExam() {
  if (!examMode) return;

  examSubmitted = true;
  document.getElementById('btn-exam-submit').disabled = true;
  document.getElementById('btn-exam-submit').textContent = 'Test završen';
  renderList();
  updateExamResult();

  const questions = getExamQuestions();
  const pendingManual = questions.filter(q => !isAutoGradable(q) && !isMatchingQuestion(q)).length;
  if (pendingManual > 0) {
    const resultEl = document.getElementById('exam-result');
    resultEl.classList.add('result-attention');
    window.setTimeout(() => resultEl.classList.remove('result-attention'), 900);
    window.setTimeout(() => resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }
}

function toggleCard(card, id) {
  const isOpen = card.classList.contains('open');

  document.querySelectorAll('.q-card.open').forEach(openCard => {
    if (openCard !== card) closeCard(openCard);
  });

  if (isOpen) {
    closeCard(card);
    openQuestionId = null;
  } else {
    openCard(card);
    openQuestionId = id;
  }
}

function openCard(card) {
  card.classList.add('open');
  card.querySelector('.q-header').setAttribute('aria-expanded', 'true');
  const id = Number(card.id.replace('q-', ''));
  if (id) {
    localStorage.setItem(LAST_QUESTION_KEY, String(id));
    updateContinueButton();
  }
  window.setTimeout(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

function closeCard(card) {
  card.classList.remove('open');
  card.querySelector('.q-header').setAttribute('aria-expanded', 'false');
}

function applyCardStatus(card, id, animateZnam = false) {
  if (examMode) return;
  card.classList.remove('status-znam', 'status-ne-znam');
  const s = progress[id];
  if (s) card.classList.add(`status-${s.replace('_', '-')}`);

  const icon = card.querySelector('.q-status-icon');
  if (icon) icon.textContent = s === 'znam' ? '✓' : s === 'ne_znam' ? '!' : '';

  const btnZ = card.querySelector('.btn-znam');
  const btnN = card.querySelector('.btn-ne-znam');
  if (btnZ) btnZ.classList.toggle('selected', s === 'znam');
  if (btnN) btnN.classList.toggle('selected', s === 'ne_znam');

  if (animateZnam && s === 'znam') {
    card.classList.remove('znam-pop');
    void card.offsetWidth;
    card.classList.add('znam-pop');
    if (icon) {
      icon.classList.remove('icon-pop');
      void icon.offsetWidth;
      icon.classList.add('icon-pop');
    }
  }
}

function handleTestOptionClick(card, clickedOpt, q) {
  if (card.dataset.answered === '1') return;
  if (!q.tacan_odgovor) return;

  card.dataset.answered = '1';
  const isCorrect = clickedOpt.dataset.correct === 'true';

  clickedOpt.classList.add(isCorrect ? 'test-correct' : 'test-wrong');
  clickedOpt.querySelector('.opt-feedback').textContent = isCorrect ? '✓' : 'x';

  if (!isCorrect) {
    card.querySelectorAll('.q-option-test[data-correct="true"]').forEach(el => {
      el.classList.add('test-reveal');
      el.querySelector('.opt-feedback').textContent = '✓';
    });
  }

  const expl = card.querySelector('.q-explanation-hidden');
  if (expl) {
    expl.classList.remove('q-explanation-hidden');
    expl.classList.add('q-explanation-reveal');
  }
}

function resetTestCard(card) {
  card.dataset.answered = '';
  card.querySelectorAll('.q-option-test').forEach(el => {
    el.classList.remove('test-correct', 'test-wrong', 'test-reveal');
    el.querySelector('.opt-feedback').textContent = '';
  });

  const expl = card.querySelector('.q-explanation-reveal');
  if (expl) {
    expl.classList.remove('q-explanation-reveal');
    expl.classList.add('q-explanation-hidden');
  }
}

function isCorrectOption(q, optionText) {
  if (q.tacan_odgovor === null || q.tacan_odgovor === undefined) return false;
  const answers = Array.isArray(q.tacan_odgovor) ? q.tacan_odgovor : [q.tacan_odgovor];
  return answers.some(answer => answerMatchesOption(answer, optionText));
}

function answerMatchesOption(answer, optionText) {
  const answerNorm = normalize(answer);
  const optionNorm = normalize(optionText);
  if (!answerNorm || !optionNorm) return false;
  if (answerNorm === optionNorm) return true;

  if (isAtomicOption(optionNorm) && containsTextUnit(answerNorm, optionNorm)) return true;
  if (answerNorm.length >= 8 && answerNorm.length <= 90 && containsTextUnit(optionNorm, answerNorm)) return true;

  return false;
}

function isAtomicOption(value) {
  return !/\s/.test(value) || value.length <= 12;
}

function containsTextUnit(haystack, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function normalize(value) {
  return transliterateSerbian(String(value))
    .trim()
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[.;:!?]+$/g, '');
}

function transliterateSerbian(value) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'dj', е: 'e', ж: 'z', з: 'z', и: 'i',
    ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', ћ: 'c', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'c', џ: 'dz', ш: 's',
    А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Ђ: 'dj', Е: 'e', Ж: 'z', З: 'z', И: 'i',
    Ј: 'j', К: 'k', Л: 'l', Љ: 'lj', М: 'm', Н: 'n', Њ: 'nj', О: 'o', П: 'p', Р: 'r',
    С: 's', Т: 't', Ћ: 'c', У: 'u', Ф: 'f', Х: 'h', Ц: 'c', Ч: 'c', Џ: 'dz', Ш: 's',
  };

  return value.replace(/[А-Ша-шЂђЈјЉљЊњЋћЏџ]/g, char => map[char] || char);
}

function splitStructuredText(value) {
  const text = Array.isArray(value) ? value.join('; ') : String(value);
  if (!/[;→-]/.test(text)) return [text];

  return text
    .split(';')
    .map(part => part.trim())
    .filter(Boolean);
}

function splitParagraphs(text) {
  const normalizedText = String(text).replace(/\s+/g, ' ').trim();
  if (normalizedText.length < 220) return [normalizedText];

  const sentences = normalizedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalizedText];
  const paragraphs = [];
  let current = '';

  for (const sentence of sentences.map(s => s.trim())) {
    if ((current + ' ' + sentence).trim().length > 230 && current) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }

  if (current) paragraphs.push(current);
  return paragraphs;
}

function splitReadableBlocks(text) {
  const normalizedText = String(text).replace(/\s+/g, ' ').trim();
  if (normalizedText.length < 150) return [normalizedText];

  const sentences = normalizedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalizedText];
  const blocks = [];
  let current = '';

  for (const sentence of sentences.map(s => s.trim())) {
    if (!current) {
      current = sentence;
      continue;
    }

    const next = `${current} ${sentence}`.trim();
    if (next.length > 190) {
      blocks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) blocks.push(current);
  return blocks;
}

function cleanupPdfText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\s+/g, ' ')
    .replace(/(\d),\s+(\d)/g, '$1,$2')
    .replace(/,(\S)/g, ', $1')
    .replace(/([^\s(])\(/g, '$1 (')
    .replace(/\)(\S)/g, ') $1')
    .replace(/\b([1248]|16|32|64|128|256|512|960|500|250|320|2)\s?GB\b/gi, '$1 GB')
    .replace(/\b([12])\s?TB\b/gi, '$1 TB')
    .replace(/Utrenutku/g, 'U trenutku')
    .replace(/Утренутку/g, 'У тренутку')
    .replace(/Utehničkoj/g, 'U tehničkoj')
    .replace(/Утехничкој/g, 'У техничкој')
    .replace(/Утабели/g, 'У табели')
    .replace(/Упрограму/g, 'У програму')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

function normalizeLoadedQuestion(q) {
  return {
    ...q,
    tekst: cleanupPdfText(q.tekst),
    opcije: Array.isArray(q.opcije) ? q.opcije.map(cleanupPdfText) : [],
    tacan_odgovor: Array.isArray(q.tacan_odgovor)
      ? q.tacan_odgovor.map(cleanupPdfText)
      : cleanupPdfText(q.tacan_odgovor),
    objasnjenje: cleanupPdfText(q.objasnjenje),
  };
}

function formatPair(row) {
  const escaped = escHtml(row);
  return escaped
    .replace(/\s-\s/g, ' <span class="answer-arrow">→</span> ')
    .replace(/\s→\s/g, ' <span class="answer-arrow">→</span> ');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initNavigation() {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.add('nav-tap');
      window.setTimeout(() => item.classList.remove('nav-tap'), 220);
      setSubjectFilter(item.dataset.subject);
    });
  });
}

async function init() {
  progress = loadProgress();

  try {
    const resp = await fetch('data/pitanja.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    allQuestions = (await resp.json()).map(normalizeLoadedQuestion);
  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<span style="color:var(--red)">Greška: nije moguće učitati pitanja.json - ${escHtml(err.message)}</span>`;
    return;
  }

  document.getElementById('loading').style.display = 'none';

  updateCounts();
  updateProgressUi();
  initNavigation();
  loadShuffleMode();
  setHomeDate();

  filtered = [...allQuestions];
  applyFilters();

  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  searchInput.addEventListener('input', () => {
    searchClear.classList.toggle('visible', searchInput.value.length > 0);
    applyFilters();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    applyFilters();
  });

  ['filter-subject', 'filter-status', 'filter-bodovi'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      openQuestionId = null;
      applyFilters();
    });
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-subject').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-bodovi').value = '';
    searchClear.classList.remove('visible');
    openQuestionId = null;
    applyFilters();
  });

  document.getElementById('btn-test-mode').addEventListener('click', toggleTestMode);
  document.getElementById('btn-shuffle-mode').addEventListener('click', toggleShuffleMode);
  document.getElementById('btn-continue').addEventListener('click', continueLastQuestion);
  document.getElementById('btn-exam-start').addEventListener('click', openExamConfirm);
  document.getElementById('btn-exam-new').addEventListener('click', openExamConfirm);
  document.getElementById('btn-exam-exit').addEventListener('click', exitExamMode);
  document.getElementById('btn-exam-submit').addEventListener('click', submitExam);
  document.getElementById('btn-exam-cancel').addEventListener('click', closeExamConfirm);
  document.getElementById('btn-exam-confirm').addEventListener('click', confirmExamStart);
  document.getElementById('exam-confirm').addEventListener('click', event => {
    if (event.target.id === 'exam-confirm') closeExamConfirm();
  });
  initImageLightbox();
  window.addEventListener('scroll', handleChromeVisibility, { passive: true });
}

document.addEventListener('DOMContentLoaded', init);
