'use strict';

const STORAGE_KEY = 'maturski_progress';

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

function setStatus(id, status) {
  if (progress[id] === status) {
    delete progress[id];
  } else {
    progress[id] = status;
  }

  saveProgress();
  updateProgressUi();

  const card = document.getElementById(`q-${id}`);
  if (card) applyCardStatus(card, id);
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

  document.getElementById('progress-text').textContent = `Naučeno: ${known}/${total}`;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-bar').style.width = `${pct}%`;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-known').textContent = known;
  document.getElementById('stat-unknown').textContent = unknown;
  document.getElementById('stat-left').textContent = Math.max(total - known - unknown, 0);
  const heroRing = document.getElementById('hero-ring');
  if (heroRing) heroRing.setAttribute('stroke-dasharray', `${pct} ${100 - pct}`);

  renderSubjectOverview();
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
          <strong>${known}/${total}</strong>
          <span class="subject-tile-meta">${pct}% naučeno</span>
          <span class="subject-track">
            <span><b>${known}</b> naučeno</span>
            <span><b>${unknown}</b> vežba</span>
            <span><b>${untouched}</b> novo</span>
          </span>
          <span class="subject-progress"><span style="width:${pct}%"></span></span>
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
          <span class="subject-progress"><span style="width:${pct}%"></span></span>
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

function updateViewTitle() {
  const { subject } = getFilters();
  const title = document.getElementById('view-title');
  const subtitle = document.getElementById('view-subtitle');

  if (examMode) {
    title.textContent = 'Maturski mod';
    subtitle.textContent = 'Simulacija stručnog teorijskog testa: 50 pitanja, 100 bodova.';
    return;
  }

  if (!subject) {
    const known = getKnownCount();
    const unknown = getUnknownCount();
    const untouched = Math.max(allQuestions.length - known - unknown, 0);
    title.textContent = 'Početna';
    subtitle.textContent = `${known} naučeno, ${unknown} za vežbu, ${untouched} novo.`;
    return;
  }

  const subjectInfo = SUBJECTS.find(s => s.key === subject);
  const questions = getSubjectQuestions(subject);
  const known = getKnownCount(questions);
  const unknown = getUnknownCount(questions);
  title.textContent = subjectInfo.label;
  subtitle.textContent = `${known}/${questions.length} naučeno, ${unknown} za vežbu.`;
}

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
  const actionsHtml = createActionsHtml(q, testableOptions);
  const previewText = q.tekst.length > 92 ? `${q.tekst.slice(0, 92).trimEnd()}...` : q.tekst;
  const questionTextHtml = createQuestionTextHtml(q.tekst);

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
      ${optionsHtml}
      ${answerHtml}
      ${explanationHtml}
      ${actionsHtml}
    </div>`;

  if (!examMode) applyCardStatus(card, q.id);
  bindCardEvents(card, q);

  return card;
}

function createOptionsHtml(q, hasAnswer, testableOptions) {
  if (!q.opcije.length) return '';

  const items = q.opcije.map((opt, idx) => {
    const correct = hasAnswer && isCorrectOption(q, opt);

    if (examMode) {
      const selected = (examAnswers[q.id] || []).includes(idx);
      const revealClass = examSubmitted
        ? correct ? ' exam-correct' : selected ? ' exam-wrong' : ''
        : selected ? ' exam-selected' : '';

      return `<li class="q-option q-option-exam${revealClass}" data-qid="${q.id}" data-idx="${idx}">
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

  return `<ol class="q-options">${items}</ol>`;
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
  const answer = q.tacan_odgovor;
  const answers = Array.isArray(answer) ? answer : [answer];
  return answers.some(a => !q.opcije.some(opt => normalize(opt) === normalize(a)));
}

function createExplanationHtml(q) {
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
      <button class="btn-action btn-ne-znam" data-id="${q.id}" data-status="ne_znam">Za vežbu</button>
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

  if (examMode && q.opcije.length) {
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
  if (!q.opcije.length || q.tacan_odgovor == null) return false;
  const answers = Array.isArray(q.tacan_odgovor) ? q.tacan_odgovor : [q.tacan_odgovor];
  return answers.every(a => q.opcije.some(opt => normalize(opt) === normalize(a)));
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
  const pool = allQuestions.filter(isAutoGradable);
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
  openQuestionId = null;
  document.getElementById('filter-subject').value = '';
  document.getElementById('btn-test-mode').classList.remove('active');
  document.getElementById('btn-test-mode').innerHTML = '<span class="test-dot"></span> Test mod';
  document.getElementById('exam-result').hidden = true;
  document.getElementById('exam-summary').textContent = `${picked.length} pitanja, ukupno ${picked.reduce((sum, q) => sum + q.bodovi, 0)} bodova. Nema negativnih bodova.`;
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
  openQuestionId = null;
  document.getElementById('exam-result').hidden = true;
  document.getElementById('filter-subject').value = '';
  applyFilters();
  scrollToTop();
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleExamOption(q, idx) {
  const current = examAnswers[q.id] || [];
  const correctCount = correctOptionIndexes(q).length;
  const selected = current.includes(idx);
  let next;

  if (correctCount > 1) {
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

function submitExam() {
  if (!examMode) return;
  let score = 0;
  const examSet = new Set(examQuestionIds);
  const questions = allQuestions.filter(q => examSet.has(q.id));

  for (const q of questions) {
    if (sameIndexes(examAnswers[q.id] || [], correctOptionIndexes(q))) {
      score += q.bodovi;
    }
  }

  examSubmitted = true;
  document.getElementById('btn-exam-submit').disabled = true;
  document.getElementById('btn-exam-submit').textContent = 'Test završen';
  const result = getTheoryGrade(score);
  const resultEl = document.getElementById('exam-result');
  resultEl.hidden = false;
  resultEl.className = `exam-result ${result.passed ? 'passed' : 'failed'}`;
  resultEl.innerHTML = `
    <strong>${result.passed ? 'Položio si' : 'Nisi položio'}: ${score}/100 bodova</strong>
    <span>Ocena ${result.grade} (${result.label})</span>`;
  renderList();
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
}

function closeCard(card) {
  card.classList.remove('open');
  card.querySelector('.q-header').setAttribute('aria-expanded', 'false');
}

function applyCardStatus(card, id) {
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
  if (Array.isArray(q.tacan_odgovor)) {
    return q.tacan_odgovor.some(a => normalize(a) === normalize(optionText));
  }
  return normalize(q.tacan_odgovor) === normalize(optionText);
}

function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[.;:!?]+$/g, '');
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
  document.getElementById('btn-exam-start').addEventListener('click', openExamConfirm);
  document.getElementById('btn-exam-new').addEventListener('click', openExamConfirm);
  document.getElementById('btn-exam-exit').addEventListener('click', exitExamMode);
  document.getElementById('btn-exam-submit').addEventListener('click', submitExam);
  document.getElementById('btn-exam-cancel').addEventListener('click', closeExamConfirm);
  document.getElementById('btn-exam-confirm').addEventListener('click', confirmExamStart);
  document.getElementById('exam-confirm').addEventListener('click', event => {
    if (event.target.id === 'exam-confirm') closeExamConfirm();
  });
}

document.addEventListener('DOMContentLoaded', init);
