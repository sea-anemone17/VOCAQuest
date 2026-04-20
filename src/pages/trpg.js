import { initData, getData, getWordById, addStudyRecord } from '../core/storage.js';
import { getCurrentUser } from '../core/supabase.js';
import { escapeHtml } from '../core/utils.js';
import { getPosLabel, getToneLabel } from '../core/tags.js';
import { scenarios } from '../../scenarios/index.js';

const authGuard = document.getElementById('trpg-auth-guard');
const app = document.getElementById('trpg-app');
const bookSelect = document.getElementById('trpgBookSelect');
const sectionSelect = document.getElementById('trpgSectionSelect');
const scenarioSelect = document.getElementById('scenarioSelect');
const startBtn = document.getElementById('startScenarioBtn');
const restartBtn = document.getElementById('restartScenarioBtn');
const titleEl = document.getElementById('scenarioTitle');
const introBox = document.getElementById('scenarioIntroBox');
const sceneBox = document.getElementById('sceneBox');
const wordEventBox = document.getElementById('wordEventBox');
const wordText = document.getElementById('trpgWordText');
const wordMeta = document.getElementById('trpgWordMeta');
const answerForm = document.getElementById('trpgAnswerForm');
const answerInput = document.getElementById('trpgAnswerInput');
const showAnswerBtn = document.getElementById('trpgShowAnswerBtn');
const resultBox = document.getElementById('trpgResultBox');
const sceneCounter = document.getElementById('sceneCounter');
const clueCount = document.getElementById('clueCount');
const mistakeCount = document.getElementById('mistakeCount');
const scenarioStatus = document.getElementById('scenarioStatus');
const journalBox = document.getElementById('journalBox');
const endingBox = document.getElementById('endingBox');
const endingText = document.getElementById('endingText');

const state = {
  scenarioId: null,
  sceneIndex: 0,
  clues: 0,
  mistakes: 0,
  currentWordId: null,
  ended: false,
  journal: []
};

function currentScenario() {
  return scenarios.find((scenario) => scenario.id === state.scenarioId) || null;
}

function renderSelectors() {
  const data = getData();
  bookSelect.innerHTML = data.books.map((book) => `<option value="${book.id}">${escapeHtml(book.title)}</option>`).join('') || '<option value="">책 없음</option>';
  renderSections();
  scenarioSelect.innerHTML = scenarios.map((scenario) => `<option value="${scenario.id}">${escapeHtml(scenario.title)}</option>`).join('');
}

function renderSections() {
  const sections = getData().sections.filter((section) => section.bookId === bookSelect.value).sort((a,b)=>a.order-b.order);
  sectionSelect.innerHTML = sections.map((section) => `<option value="${section.id}">${escapeHtml(section.title)}</option>`).join('') || '<option value="">섹션 없음</option>';
}

function sectionWords() {
  return getData().words.filter((word) => word.sectionId === sectionSelect.value);
}

function pickWord() {
  const words = sectionWords();
  if (!words.length) return null;
  return words[Math.floor(Math.random() * words.length)];
}

function renderJournal() {
  journalBox.innerHTML = state.journal.length
    ? state.journal.map((entry) => `<div class="log-entry">${entry}</div>`).join('')
    : '<div class="empty-state">아직 기록이 없습니다.</div>';
}

function renderScene() {
  const scenario = currentScenario();
  if (!scenario) return;
  titleEl.textContent = scenario.title;
  introBox.innerHTML = `<p>${escapeHtml(scenario.intro)}</p>`;
  const scene = scenario.scenes[state.sceneIndex];
  if (!scene) return;
  sceneBox.innerHTML = `<strong>${escapeHtml(scene.title)}</strong><div class="muted" style="margin-top:6px;">${escapeHtml(scene.text)}</div><div class="small-actions" style="margin-top:12px;"><button id="sceneActionBtn" class="button primary" type="button">${escapeHtml(scene.actionLabel)}</button></div>`;
  sceneBox.querySelector('#sceneActionBtn')?.addEventListener('click', startWordEvent);
}

function renderStats() {
  const scenario = currentScenario();
  sceneCounter.textContent = `${Math.min(state.sceneIndex + 1, scenario?.scenes.length || 0)} / ${scenario?.scenes.length || 0}`;
  clueCount.textContent = String(state.clues);
  mistakeCount.textContent = String(state.mistakes);
  scenarioStatus.textContent = state.ended ? '종결' : '진행 중';
}

function startWordEvent() {
  const word = pickWord();
  if (!word) {
    alert('이 섹션에 단어가 없습니다.');
    return;
  }
  state.currentWordId = word.id;
  wordText.textContent = word.word;
  wordMeta.textContent = `${getPosLabel(word.pos)} · ${getToneLabel(word.tone)}`;
  resultBox.className = 'result-box';
  resultBox.textContent = '';
  answerInput.value = '';
  wordEventBox.classList.remove('hidden');
}

function finishStep(correct) {
  const word = getWordById(state.currentWordId);
  if (!word) return;
  addStudyRecord({
    wordId: word.id,
    userAnswer: answerInput.value.trim(),
    autoJudgedCorrect: correct,
    finalCorrect: correct,
    source: 'trpg'
  });
  if (correct) {
    state.clues += 1;
    state.journal.push(`장면 ${state.sceneIndex + 1}: ${escapeHtml(word.word)} 해석 성공`);
  } else {
    state.mistakes += 1;
    state.journal.push(`장면 ${state.sceneIndex + 1}: ${escapeHtml(word.word)} 해석 실패`);
  }
  state.sceneIndex += 1;
  state.currentWordId = null;
  wordEventBox.classList.add('hidden');

  const scenario = currentScenario();
  if (state.sceneIndex >= scenario.scenes.length) {
    state.ended = true;
    endingBox.classList.remove('hidden');
    endingText.innerHTML = correct || state.clues >= state.mistakes
      ? `<p>기록을 복원했습니다. 단서 ${state.clues}개, 오해 ${state.mistakes}개.</p>`
      : `<p>사건은 해결했지만 오해가 많이 남았습니다. 단서 ${state.clues}개, 오해 ${state.mistakes}개.</p>`;
  }
  renderStats();
  renderScene();
  renderJournal();
}

answerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const word = getWordById(state.currentWordId);
  if (!word) return;
  const answer = answerInput.value.trim();
  const correct = word.meanings.some((meaning) => meaning.trim().toLowerCase() === answer.trim().toLowerCase());
  resultBox.className = `result-box ${correct ? 'success' : 'fail'}`;
  resultBox.innerHTML = correct
    ? '정답입니다. 다음 장면으로 이동합니다.'
    : `오답입니다. 정답: ${word.meanings.map((item) => escapeHtml(item)).join(', ')}`;
  setTimeout(() => finishStep(correct), 400);
});

showAnswerBtn.addEventListener('click', () => {
  const word = getWordById(state.currentWordId);
  if (!word) return;
  resultBox.className = 'result-box';
  resultBox.innerHTML = `정답: ${word.meanings.map((item) => escapeHtml(item)).join(', ')}`;
});

function startScenario() {
  if (!bookSelect.value || !sectionSelect.value || !scenarioSelect.value) return;
  state.scenarioId = scenarioSelect.value;
  state.sceneIndex = 0;
  state.clues = 0;
  state.mistakes = 0;
  state.currentWordId = null;
  state.ended = false;
  state.journal = [];
  endingBox.classList.add('hidden');
  renderStats();
  renderScene();
  renderJournal();
}

startBtn.addEventListener('click', startScenario);
restartBtn.addEventListener('click', startScenario);
bookSelect.addEventListener('change', renderSections);

(async function init() {
  const user = await getCurrentUser();
  if (!user) {
    authGuard.classList.remove('hidden');
    return;
  }
  await initData();
  app.classList.remove('hidden');
  renderSelectors();
  renderJournal();
})();
