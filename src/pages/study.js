import {
  initData,
  getData,
  addStudyRecord,
  getSectionEntries,
  getWrongEntryIdsBySection,
  getStudyStatsBySection,
  getWrongNoteEntriesBySection,
  getRecentStudyRecords,
  getSectionDifficulty,
  clearWrongNoteByEntry
} from '../core/storage.js';
import { getCurrentUser } from '../core/supabase.js';
import { shuffleArray, normalizeText, escapeHtml, formatDateTime } from '../core/utils.js';
import { getPosLabel, getToneLabel } from '../core/tags.js';

const authGuard = document.getElementById('study-auth-guard');
const app = document.getElementById('study-app');

const bookSelect = document.getElementById('studyBookSelect');
const sectionSelect = document.getElementById('studySectionSelect');
const directionSelect = document.getElementById('studyDirectionSelect');

const startBtn = document.getElementById('startStudyBtn');
const wrongBtn = document.getElementById('retryWrongBtn');
const favoriteBtn = document.getElementById('favoriteStudyBtn');
const shuffleBtn = document.getElementById('shuffleStudyBtn');

const promptEl = document.getElementById('studyPrompt');
const metaEl = document.getElementById('studyMeta');

const answerForm = document.getElementById('answerForm');
const answerInput = document.getElementById('answerInput');

const resultBox = document.getElementById('resultBox');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const nextBtn = document.getElementById('nextQuestionBtn');

const wrongNoteBox = document.getElementById('wrongNoteBox');
const recentStudyBox = document.getElementById('recentStudyBox');

const totalAttemptsEl = document.getElementById('totalAttempts');
const correctAttemptsEl = document.getElementById('correctAttempts');
const wrongAttemptsEl = document.getElementById('wrongAttempts');
const accuracyRateEl = document.getElementById('accuracyRate');
const sectionDifficultyBadge = document.getElementById('sectionDifficultyBadge');

const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');

let queue = [];
let index = 0;
let currentEntry = null;
let lastMode = 'all';

/* =========================
   Selector rendering
========================= */

function renderSelectors() {
  const data = getData();

  bookSelect.innerHTML =
    data.books
      .map((book) => `<option value="${book.id}">${escapeHtml(book.title)}</option>`)
      .join('') || '<option value="">책 없음</option>';

  renderSections();
}

function renderSections() {
  const data = getData();
  const sections = data.sections
    .filter((item) => item.bookId === bookSelect.value)
    .sort((a, b) => a.order - b.order);

  sectionSelect.innerHTML =
    sections
      .map((section) => `<option value="${section.id}">${escapeHtml(section.title)}</option>`)
      .join('') || '<option value="">섹션 없음</option>';

  renderSidePanels();
}

/* =========================
   Queue building
========================= */

function buildFullQueue() {
  return shuffleArray(getSectionEntries(sectionSelect.value));
}

function buildWrongOnlyQueue() {
  const wrongIds = new Set(getWrongEntryIdsBySection(sectionSelect.value));
  return shuffleArray(
    getSectionEntries(sectionSelect.value).filter((entry) => wrongIds.has(entry.entryId))
  );
}

function buildFavoriteQueue() {
  return shuffleArray(
    getSectionEntries(sectionSelect.value).filter((entry) => entry.favorite)
  );
}

function buildSingleWordQueue(wordId) {
  return shuffleArray(
    getSectionEntries(sectionSelect.value).filter((entry) => entry.wordId === wordId)
  );
}

function loadQueue(mode = 'all') {
  lastMode = mode;

  if (mode === 'wrong') {
    queue = buildWrongOnlyQueue();
  } else if (mode === 'favorite') {
    queue = buildFavoriteQueue();
  } else {
    queue = buildFullQueue();
  }

  index = 0;
  renderCurrentWord();
}

/* =========================
   Prompt / answer helpers
========================= */

function getPromptText(entry) {
  if (!entry) return '';

  const isMeaningMode = directionSelect.value === 'meaning-to-word';
  return isMeaningMode
    ? entry.meanings.join(' / ')
    : entry.headword;
}

function getCorrectAnswerText(entry) {
  if (!entry) return '';

  const isMeaningMode = directionSelect.value === 'meaning-to-word';
  return isMeaningMode
    ? entry.headword
    : entry.meanings.join(', ');
}

/* =========================
   Current render
========================= */

function renderCurrentWord() {
  currentEntry = queue[index] || null;

  if (!currentEntry) {
    promptEl.textContent = '문제가 없습니다.';
    metaEl.textContent = '단어를 추가하거나 다른 모드를 선택해 주세요.';
    progressText.textContent = '0 / 0';
    progressFill.style.width = '0%';
    resultBox.className = 'result-box';
    resultBox.textContent = '';
    answerInput.value = '';
    return;
  }

  promptEl.textContent = getPromptText(currentEntry);
  metaEl.textContent = `${getPosLabel(currentEntry.pos)} · ${getToneLabel(currentEntry.tone)}`;

  progressText.textContent = `${index + 1} / ${queue.length}`;
  progressFill.style.width = `${((index + 1) / queue.length) * 100}%`;

  resultBox.className = 'result-box';
  resultBox.textContent = '';
  answerInput.value = '';
}

/* =========================
   Judgement
========================= */

function beginJudgement(answer) {
  if (!currentEntry) return;

  const normalizedAnswer = normalizeText(answer);
  const isMeaningMode = directionSelect.value === 'meaning-to-word';

  let isCorrect = false;

  if (isMeaningMode) {
    isCorrect = normalizedAnswer === normalizeText(currentEntry.headword);
  } else {
    isCorrect = currentEntry.meanings.some(
      (meaning) => normalizeText(meaning) === normalizedAnswer
    );
  }

  finalizeJudgement({
    answer,
    isCorrect
  });
}

function finalizeJudgement({ answer, isCorrect }) {
  if (!currentEntry) return;

  addStudyRecord({
    wordId: currentEntry.wordId,
    entryId: currentEntry.entryId,
    userAnswer: answer,
    autoJudgedCorrect: isCorrect,
    finalCorrect: isCorrect,
    source: 'study'
  });

  resultBox.className = `result-box ${isCorrect ? 'success' : 'fail'}`;
  resultBox.innerHTML = isCorrect
    ? '정답입니다.'
    : `오답입니다.<br>정답: <strong>${escapeHtml(getCorrectAnswerText(currentEntry))}</strong>`;

  renderSidePanels();
}

/* =========================
   Side panels
========================= */

function renderStats() {
  const stats = getStudyStatsBySection(sectionSelect.value);

  totalAttemptsEl.textContent = String(stats.total);
  correctAttemptsEl.textContent = String(stats.correct);
  wrongAttemptsEl.textContent = String(stats.wrong);
  accuracyRateEl.textContent = `${stats.accuracy}%`;

  const difficulty = getSectionDifficulty(sectionSelect.value);
  sectionDifficultyBadge.textContent = difficulty.label;
  sectionDifficultyBadge.className = `badge ${difficulty.tone}`;
}

function renderWrongNote() {
  const entries = getWrongNoteEntriesBySection(sectionSelect.value);

  wrongNoteBox.innerHTML = entries.length
    ? entries
        .map((item) => {
          const headword = item.word?.headword || item.word?.word || '이름 없음';
          const pos = item.entry?.pos || item.flattened?.pos || 'other';
          const meanings = item.entry?.meanings || item.flattened?.meanings || [];

          return `
            <div class="log-entry">
              <strong>${escapeHtml(headword)}</strong>
              <div class="muted small-note">${escapeHtml(getPosLabel(pos))}</div>
              <div class="muted small-note">${meanings.map((m) => escapeHtml(m)).join(', ')}</div>
              <div class="small-actions">
                <button class="button" data-clear-entry="${item.entry?.id || item.flattened?.entryId}">
                  오답 정리
                </button>
                <button class="button" data-study-word="${item.word?.id}">
                  이 단어만 학습
                </button>
              </div>
            </div>
          `;
        })
        .join('')
    : '<div class="empty-state">오답 노트가 비어 있습니다.</div>';
}

function renderRecentStudy() {
  const items = getRecentStudyRecords(10);

  recentStudyBox.innerHTML = items.length
    ? items
        .map((item) => {
          const headword = item.word?.headword || item.word?.word || '삭제된 단어';
          const pos = item.entry?.pos || item.flattened?.pos || null;

          return `
            <div class="log-entry">
              <strong>${escapeHtml(headword)}</strong>
              <div class="muted small-note">
                ${pos ? `${escapeHtml(getPosLabel(pos))} · ` : ''}${item.finalCorrect ? '정답' : '오답'} · ${formatDateTime(item.studiedAt)}
              </div>
            </div>
          `;
        })
        .join('')
    : '<div class="empty-state">최근 기록이 없습니다.</div>';
}

function renderSidePanels() {
  renderStats();
  renderWrongNote();
  renderRecentStudy();
}

/* =========================
   Event wiring
========================= */

startBtn.addEventListener('click', () => loadQueue('all'));
wrongBtn.addEventListener('click', () => loadQueue('wrong'));
favoriteBtn.addEventListener('click', () => loadQueue('favorite'));
shuffleBtn.addEventListener('click', () => loadQueue(lastMode));

bookSelect.addEventListener('change', renderSections);

sectionSelect.addEventListener('change', () => {
  renderSidePanels();
  loadQueue(lastMode);
});

answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  beginJudgement(answerInput.value.trim());
});

showAnswerBtn.addEventListener('click', () => {
  if (!currentEntry) return;

  resultBox.className = 'result-box';
  resultBox.innerHTML = `정답: <strong>${escapeHtml(getCorrectAnswerText(currentEntry))}</strong>`;
});

nextBtn.addEventListener('click', () => {
  if (!queue.length) return;
  index = Math.min(index + 1, queue.length - 1);
  renderCurrentWord();
});

wrongNoteBox.addEventListener('click', (event) => {
  const clearBtn = event.target.closest('button[data-clear-entry]');
  if (clearBtn) {
    clearWrongNoteByEntry(clearBtn.dataset.clearEntry);
    renderSidePanels();
    return;
  }

  const studyBtn = event.target.closest('button[data-study-word]');
  if (studyBtn) {
    queue = buildSingleWordQueue(studyBtn.dataset.studyWord);
    index = 0;
    currentEntry = null;
    renderCurrentWord();
  }
});

/* =========================
   Init
========================= */

(async function init() {
  const user = await getCurrentUser();

  if (!user) {
    authGuard.classList.remove('hidden');
    return;
  }

  await initData();

  app.classList.remove('hidden');
  renderSelectors();
  renderSidePanels();
  loadQueue('all');
})();
