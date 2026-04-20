import {
  initData,
  getData,
  addStudyRecord,
  getWrongWordIdsBySection,
  getStudyStatsBySection,
  getWrongNoteEntriesBySection,
  getRecentStudyRecords,
  getSectionDifficulty,
  clearWrongNoteByWord
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
let currentWord = null;
let lastMode = 'all';

function renderSelectors() {
  const data = getData();
  bookSelect.innerHTML = data.books.map((book) => `<option value="${book.id}">${escapeHtml(book.title)}</option>`).join('') || '<option value="">책 없음</option>';
  renderSections();
}

function renderSections() {
  const data = getData();
  const sections = data.sections.filter((item) => item.bookId === bookSelect.value).sort((a,b)=>a.order-b.order);
  sectionSelect.innerHTML = sections.map((section) => `<option value="${section.id}">${escapeHtml(section.title)}</option>`).join('') || '<option value="">섹션 없음</option>';
  renderSidePanels();
}

function sourceWords(mode) {
  const data = getData();
  let words = data.words.filter((word) => word.sectionId === sectionSelect.value);
  if (mode === 'wrong') {
    const wrongIds = new Set(getWrongWordIdsBySection(sectionSelect.value));
    words = words.filter((word) => wrongIds.has(word.id));
  } else if (mode === 'favorite') {
    words = words.filter((word) => word.favorite);
  }
  return shuffleArray(words);
}

function renderCurrent() {
  currentWord = queue[index] || null;
  if (!currentWord) {
    promptEl.textContent = '문제가 없습니다.';
    metaEl.textContent = '단어를 추가하거나 다른 모드를 선택해 주세요.';
    progressText.textContent = '0 / 0';
    progressFill.style.width = '0%';
    return;
  }
  const isMeaningMode = directionSelect.value === 'meaning-to-word';
  promptEl.textContent = isMeaningMode ? currentWord.meanings.join(' / ') : currentWord.word;
  metaEl.textContent = `${getPosLabel(currentWord.pos)} · ${getToneLabel(currentWord.tone)}`;
  progressText.textContent = `${index + 1} / ${queue.length}`;
  progressFill.style.width = `${((index + 1) / queue.length) * 100}%`;
  resultBox.className = 'result-box';
  resultBox.textContent = '';
  answerInput.value = '';
}

function judge(answer) {
  if (!currentWord) return;
  const isMeaningMode = directionSelect.value === 'meaning-to-word';
  let isCorrect = false;
  if (isMeaningMode) {
    isCorrect = normalizeText(answer) === normalizeText(currentWord.word);
  } else {
    isCorrect = currentWord.meanings.some((meaning) => normalizeText(meaning) === normalizeText(answer));
  }
  addStudyRecord({
    wordId: currentWord.id,
    userAnswer: answer,
    autoJudgedCorrect: isCorrect,
    finalCorrect: isCorrect,
    source: 'study'
  });
  resultBox.className = `result-box ${isCorrect ? 'success' : 'fail'}`;
  resultBox.innerHTML = isCorrect
    ? '정답입니다.'
    : `오답입니다.<br>정답: <strong>${escapeHtml(currentWord.word)}</strong> / ${currentWord.meanings.map((item) => escapeHtml(item)).join(', ')}`;
  renderSidePanels();
}

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
    ? entries.map((entry) => `<div class="log-entry">
        <strong>${escapeHtml(entry.word.word)}</strong>
        <div class="muted small-note">${entry.word.meanings.map((item) => escapeHtml(item)).join(', ')}</div>
        <div class="small-actions"><button class="button" data-clear-word="${entry.word.id}">오답 정리</button></div>
      </div>`).join('')
    : '<div class="empty-state">오답 노트가 비어 있습니다.</div>';
}

function renderRecent() {
  const items = getRecentStudyRecords(10);
  recentStudyBox.innerHTML = items.length
    ? items.map((item) => `<div class="log-entry">
        <strong>${escapeHtml(item.word?.word || '삭제된 단어')}</strong>
        <div class="muted small-note">${item.finalCorrect ? '정답' : '오답'} · ${formatDateTime(item.studiedAt)}</div>
      </div>`).join('')
    : '<div class="empty-state">최근 기록이 없습니다.</div>';
}

function renderSidePanels() {
  renderStats();
  renderWrongNote();
  renderRecent();
}

function loadQueue(mode = 'all') {
  lastMode = mode;
  queue = sourceWords(mode);
  index = 0;
  renderCurrent();
}

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
  judge(answerInput.value.trim());
});
showAnswerBtn.addEventListener('click', () => {
  if (!currentWord) return;
  resultBox.className = 'result-box';
  resultBox.innerHTML = `정답: <strong>${escapeHtml(currentWord.word)}</strong> / ${currentWord.meanings.map((item) => escapeHtml(item)).join(', ')}`;
});
nextBtn.addEventListener('click', () => {
  if (!queue.length) return;
  index = Math.min(index + 1, queue.length - 1);
  renderCurrent();
});
wrongNoteBox.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-clear-word]');
  if (!button) return;
  clearWrongNoteByWord(button.dataset.clearWord);
  renderSidePanels();
});

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
