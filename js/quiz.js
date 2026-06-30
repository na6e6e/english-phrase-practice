'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let questions = [];       // filtered + shuffled array for this session
let currentIndex = 0;
let slots = [];           // Array<{ id, word } | null>
let wordBankItems = [];   // Array<{ id, word, used }>
let quizState = 'idle';   // 'idle' | 'wrong' | 'correct' | 'revealed'

// ── DOM references (populated in init) ────────────────────────────────────
const el = {};

// ── Entry point ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  el.back         = document.getElementById('btn-back');
  el.themeName    = document.getElementById('theme-name');
  el.progressBar  = document.getElementById('progress-bar');
  el.counter      = document.getElementById('counter');
  el.japanese     = document.getElementById('japanese');
  el.slotsEl      = document.getElementById('slots');
  el.feedback     = document.getElementById('feedback');
  el.wordBankEl   = document.getElementById('word-bank');
  el.btnFlag      = document.getElementById('btn-flag');
  el.btnNext      = document.getElementById('btn-next');
  el.btnSkip      = document.getElementById('btn-skip');
  el.btnReplay    = document.getElementById('btn-replay');
  el.btnGoogle    = document.getElementById('btn-google');
  el.quiz         = document.getElementById('quiz');
  el.noQuestions  = document.getElementById('no-questions');
  el.results      = document.getElementById('results');

  el.back.addEventListener('click', () => { window.location.href = './index.html'; });
  el.btnFlag.addEventListener('click', onFlagClick);
  el.btnNext.addEventListener('click', onNextClick);
  el.btnSkip.addEventListener('click', onSkipClick);
  el.btnReplay.addEventListener('click', onReplayClick);
  document.getElementById('btn-home').addEventListener('click', () => { window.location.href = './index.html'; });
  document.getElementById('btn-review-flagged').addEventListener('click', () => {
    window.location.href = './quiz.html?mode=review';
  });

  loadData();
});

// ── Data loading ───────────────────────────────────────────────────────────
async function loadData() {
  let data;
  try {
    const res = await fetch('./data/questions.json');
    if (!res.ok) throw new Error('fetch failed');
    data = await res.json();
  } catch (e) {
    console.error('Failed to load questions.json:', e);
    el.themeName.textContent = 'エラー';
    el.quiz.innerHTML = '<p style="text-align:center;padding:40px;color:var(--danger)">問題データの読み込みに失敗しました。<br>ローカル開発時は Live Server 等をご利用ください。</p>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const theme  = params.get('theme');
  const mode   = params.get('mode');

  if (mode === 'review') {
    el.themeName.textContent = '🚩 復習モード';
    const flaggedSet = new Set(getFlaggedIds());
    for (const t of data.themes) {
      for (const q of t.questions) {
        if (flaggedSet.has(q.id)) questions.push(q);
      }
    }
  } else if (theme) {
    const themeData = data.themes.find(t => t.id === theme);
    if (themeData) {
      el.themeName.textContent = `${themeData.icon} ${themeData.name}`;
      questions = [...themeData.questions];
    }
  }

  // 未正解フィルター: status === 'correct' の問題を除外
  if (params.get('filter') === 'incomplete') {
    questions = questions.filter(q => getQuestionState(q.id).status !== 'correct');
    el.themeName.textContent += ' 「未正解」';
  }

  if (questions.length === 0) {
    el.quiz.style.display = 'none';
    el.noQuestions.style.display = 'flex';
    return;
  }

  questions = shuffle(questions);
  loadQuestion(0);
}

// ── Question lifecycle ─────────────────────────────────────────────────────
function loadQuestion(index) {
  currentIndex  = index;
  quizState     = 'idle';

  const q = questions[index];

  // Build word bank: answer words + distractors, all shuffled
  const allWords = [...q.answer, ...q.distractors];
  wordBankItems  = shuffle(allWords).map((word, i) => ({ id: i, word, used: false }));

  // One slot per answer word
  slots = q.answer.map(() => null);

  // Update progress UI
  const pct = Math.round((index / questions.length) * 100);
  el.progressBar.style.width = `${pct}%`;
  el.counter.textContent = `${index + 1} / ${questions.length}`;

  // Update Japanese prompt
  el.japanese.textContent = q.japanese;

  // Update flag button
  const state = getQuestionState(q.id);
  setFlagUI(state.flagged);

  // Clear feedback + hide action buttons
  clearFeedback();

  renderSlots();
  renderWordBank();
}

// ── Rendering ──────────────────────────────────────────────────────────────
function renderSlots() {
  const q = questions[currentIndex];
  el.slotsEl.innerHTML = '';

  slots.forEach((slot, i) => {
    const div = document.createElement('div');
    div.className = 'slot';

    if (slot === null) {
      div.classList.add('empty');
    } else {
      div.classList.add('filled');
      div.textContent = slot.word;

      if (quizState === 'correct') {
        div.classList.add('correct');
      } else if (quizState === 'revealed') {
        div.classList.add('revealed');
      } else if (quizState === 'wrong') {
        div.classList.add(slot.word === q.answer[i] ? 'correct' : 'wrong');
      }

      // Clicking a filled slot (in idle or wrong state) returns word to bank
      if (quizState !== 'correct' && quizState !== 'revealed') {
        div.addEventListener('click', () => onSlotClick(i));
        div.style.cursor = 'pointer';
      }
    }

    el.slotsEl.appendChild(div);
  });
}

function renderWordBank() {
  el.wordBankEl.innerHTML = '';

  wordBankItems.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'word-btn';
    btn.textContent = item.word;
    btn.disabled = item.used || quizState === 'correct' || quizState === 'revealed';
    if (item.used) btn.classList.add('used');

    btn.addEventListener('click', () => onWordClick(item.id));
    el.wordBankEl.appendChild(btn);
  });
}

// ── Interaction handlers ───────────────────────────────────────────────────
function onWordClick(wordId) {
  if (quizState === 'correct') return;

  const item = wordBankItems.find(w => w.id === wordId);
  if (!item || item.used) return;

  const nextEmpty = slots.findIndex(s => s === null);
  if (nextEmpty === -1) return; // All slots full (shouldn't happen normally)

  slots[nextEmpty] = item;
  item.used = true;

  if (slots.every(s => s !== null)) {
    checkAnswer();
  } else {
    renderSlots();
    renderWordBank();
  }
}

function onSlotClick(slotIndex) {
  if (quizState === 'correct') return;
  if (slots[slotIndex] === null) return;

  const item = slots[slotIndex];
  slots[slotIndex] = null;
  item.used = false;

  // Reset state to idle so remaining filled slots lose wrong/correct styling
  quizState = 'idle';
  clearFeedback();

  renderSlots();
  renderWordBank();
}

function onNextClick() {
  if (currentIndex + 1 < questions.length) {
    loadQuestion(currentIndex + 1);
  } else {
    showResults();
  }
}

function onSkipClick() {
  const q = questions[currentIndex];

  // Skipped questions count as incorrect (won't regress an already-correct one)
  setQuestionStatus(q.id, 'incorrect');

  // Reveal the correct answer in the slots
  slots = q.answer.map((word, i) => ({ id: -1 - i, word }));
  quizState = 'revealed';

  speak(q.answer.join(' '));

  el.feedback.textContent = '正解を表示しました。';
  el.feedback.className = 'feedback revealed';
  el.btnSkip.style.display = 'none';
  el.btnReplay.style.display = 'inline-flex';
  el.btnNext.style.display = 'inline-flex';

  renderSlots();
  renderWordBank();
}

function onReplayClick() {
  speak(questions[currentIndex].answer.join(' '));
}

function onFlagClick() {
  const q = questions[currentIndex];
  const isFlagged = toggleFlag(q.id);
  setFlagUI(isFlagged);
}

// ── Answer checking ────────────────────────────────────────────────────────
function checkAnswer() {
  const q = questions[currentIndex];
  const isCorrect = slots.every((slot, i) => slot && slot.word === q.answer[i]);

  if (isCorrect) {
    quizState = 'correct';
    setQuestionStatus(q.id, 'correct');
    speak(q.answer.join(' '));

    el.feedback.textContent = '正解！ 🎉';
    el.feedback.className = 'feedback correct';
    el.btnNext.style.display = 'inline-flex';
    el.btnReplay.style.display = 'inline-flex';
    el.btnSkip.style.display = 'none';
    el.btnGoogle.href = 'https://www.google.com/search?q=' + encodeURIComponent(q.answer.join(' ')) + ' 意味';
    el.btnGoogle.style.display = 'inline-flex';
  } else {
    quizState = 'wrong';
    setQuestionStatus(q.id, 'incorrect');

    el.feedback.textContent = '不正解。赤いマスをタップして修正してください。';
    el.feedback.className = 'feedback wrong';
    el.btnSkip.style.display = 'inline-flex';
    el.btnReplay.style.display = 'none';
    el.btnNext.style.display = 'none';
    el.btnGoogle.style.display = 'none';
  }

  renderSlots();
  renderWordBank();
}

// ── Results ────────────────────────────────────────────────────────────────
function showResults() {
  // Finalize progress bar
  el.progressBar.style.width = '100%';
  el.counter.textContent = `${questions.length} / ${questions.length}`;

  const correctCount = questions.filter(
    q => getQuestionState(q.id).status === 'correct'
  ).length;
  const incorrectCount = questions.filter(
    q => getQuestionState(q.id).status === 'incorrect'
  ).length;

  document.getElementById('result-total').textContent   = questions.length;
  document.getElementById('result-correct').textContent = correctCount;
  document.getElementById('result-wrong').textContent   = incorrectCount;

  // Show "review flagged" button if there are any flagged questions
  const flaggedCount = getFlaggedIds().length;
  if (flaggedCount > 0) {
    document.getElementById('btn-review-flagged').style.display = 'inline-flex';
  }

  el.quiz.style.display = 'none';
  el.results.style.display = 'flex';
}

// ── UI helpers ─────────────────────────────────────────────────────────────
function clearFeedback() {
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.btnNext.style.display = 'none';
  el.btnReplay.style.display = 'none';
  el.btnSkip.style.display = 'inline-flex';
  el.btnGoogle.style.display = 'none';
  el.btnGoogle.href = '#';
}

function setFlagUI(flagged) {
  el.btnFlag.classList.toggle('flagged', flagged);
  el.btnFlag.title       = flagged ? 'フラグを外す' : 'フラグを付ける';
  el.btnFlag.setAttribute('aria-label', el.btnFlag.title);
  el.btnFlag.textContent = flagged ? '🔖' : '🚩';
}

// ── Utilities ──────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
