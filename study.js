import {
  initData,
  getData,
  addStudyRecord,
  getWrongWordIdsBySection,
  getStudyStatsBySection,
  getWrongNoteEntriesBySection,
  getRecentStudyRecords,
  getSectionDifficulty,
  setArchiveEditTarget
} from "./storage.js";
import { getPosLabel, getToneLabel, getTagLabel } from "./tags.js";
import { normalizeText, escapeHtml, shuffleArray } from "./utils.js";

const studyBookSelect = document.getElementById("studyBookSelect");
const studySectionSelect = document.getElementById("studySectionSelect");
const studyDirectionSelect = document.getElementById("studyDirectionSelect");

const startStudyBtn = document.getElementById("startStudyBtn");
const retryWrongBtn = document.getElementById("retryWrongBtn");
const favoriteStudyBtn = document.getElementById("favoriteStudyBtn");
const shuffleStudyBtn = document.getElementById("shuffleStudyBtn");

const studyCard = document.getElementById("studyCard");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const resultBox = document.getElementById("resultBox");
const studyLog = document.getElementById("studyLog");
const wrongNoteBox = document.getElementById("wrongNoteBox");
const recentStudyBox = document.getElementById("recentStudyBox");

const showAnswerBtn = document.getElementById("showAnswerBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");

const totalAttemptsEl = document.getElementById("totalAttempts");
const correctAttemptsEl = document.getElementById("correctAttempts");
const wrongAttemptsEl = document.getElementById("wrongAttempts");
const accuracyRateEl = document.getElementById("accuracyRate");
const sectionDifficultyBadge = document.getElementById("sectionDifficultyBadge");

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

const judgeConfirmBox = document.getElementById("judgeConfirmBox");
const judgeHintText = document.getElementById("judgeHintText");
const confirmCorrectBtn = document.getElementById("confirmCorrectBtn");
const confirmWrongBtn = document.getElementById("confirmWrongBtn");

let currentQueue = [];
let currentIndex = 0;
let currentWord = null;
let pendingSubmission = null;
let autoNextTimer = null;
let lastMode = "all";
let quizDirection = "word-to-meaning";

function renderBookOptions() {
  const data = getData();
  if (!data.books.length) {
    studyBookSelect.innerHTML = `<option value="">책 없음</option>`;
    studySectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  studyBookSelect.innerHTML = data.books
    .map((book) => `<option value="${book.id}">${book.title}</option>`)
    .join("");

  renderSectionOptions();
}

function renderSectionOptions() {
  const data = getData();
  const bookId = studyBookSelect.value;

  const sections = data.sections.filter((section) => section.bookId === bookId);

  if (!sections.length) {
    studySectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    renderStats();
    renderWrongNote();
    renderRecentStudy();
    renderDifficulty();
    return;
  }

  studySectionSelect.innerHTML = sections
    .sort((a, b) => a.order - b.order)
    .map((section) => `<option value="${section.id}">${section.title}</option>`)
    .join("");

  renderStats();
  renderWrongNote();
  renderRecentStudy();
  renderDifficulty();
}

function buildFullQueue(sectionId) {
  const data = getData();
  const allWords = data.words.filter((word) => word.sectionId === sectionId);
  return shuffleArray(allWords);
}

function buildWrongOnlyQueue(sectionId) {
  const data = getData();
  const allWords = data.words.filter((word) => word.sectionId === sectionId);
  const wrongWordIds = getWrongWordIdsBySection(sectionId);
  const wrongWords = allWords.filter((word) => wrongWordIds.includes(word.id));
  return shuffleArray(wrongWords);
}

function buildFavoriteQueue(sectionId) {
  const data = getData();
  const favorites = data.words.filter(
    (word) => word.sectionId === sectionId && word.favorite
  );
  return shuffleArray(favorites);
}

function buildSingleWordQueue(wordId) {
  const data = getData();
  const word = data.words.find((item) => item.id === wordId);
  return word ? [word] : [];
}

function clearPendingJudgement() {
  pendingSubmission = null;
  judgeConfirmBox.classList.add("hidden");
  judgeHintText.textContent = "";
  if (autoNextTimer) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }
}

function loadStudyQueue(mode = "all", payload = null) {
  const sectionId = studySectionSelect.value;
  lastMode = mode;

  if (mode === "wrong") {
    currentQueue = buildWrongOnlyQueue(sectionId);
  } else if (mode === "favorite") {
    currentQueue = buildFavoriteQueue(sectionId);
  } else if (mode === "single" && payload?.wordId) {
    currentQueue = buildSingleWordQueue(payload.wordId);
  } else {
    currentQueue = buildFullQueue(sectionId);
  }

  currentIndex = 0;
  currentWord = currentQueue[0] || null;
  clearPendingJudgement();
}

function renderProgress() {
  const total = currentQueue.length;
  const currentNumber = total === 0 || !currentWord ? 0 : currentIndex + 1;
  progressText.textContent = `${currentNumber} / ${total}`;

  const ratio = total === 0 ? 0 : (currentNumber / total) * 100;
  progressFill.style.width = `${ratio}%`;
}

function renderCurrentWord() {
  renderProgress();

  if (!currentWord) {
    studyCard.innerHTML = `<p class="muted">출제할 단어가 없습니다.</p>`;
    return;
  }

  const tagText = (currentWord.tags || [])
    .map((tag) => getTagLabel(currentWord.pos, tag))
    .join(", ");

  const favoriteText = currentWord.favorite ? "⭐ 즐겨찾기" : "☆ 일반";

  studyCard.innerHTML = `
    <div class="study-word">${escapeHtml(getPromptText(currentWord))}</div>
    <div class="study-sub">품사: ${getPosLabel(currentWord.pos)}</div>
    <div class="study-sub">정서값: ${getToneLabel(currentWord.tone)}</div>
    <div class="study-sub">태그: ${escapeHtml(tagText || "없음")}</div>
    <div class="study-sub">즐겨찾기: ${favoriteText}</div>
    ${currentWord.example ? `<div class="study-sub">예문: ${escapeHtml(currentWord.example)}</div>` : ""}
  `;

  resultBox.innerHTML = "";
  answerInput.value = "";
  answerInput.focus();
}

function logMessage(message) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = message;
  studyLog.prepend(entry);
}

function moveNext() {
  clearPendingJudgement();
  currentIndex += 1;
  currentWord = currentQueue[currentIndex] || null;
  renderCurrentWord();
}

function getPromptText(word) {
  if (!word) return "";
  return quizDirection === "meaning-to-word"
    ? (word.meanings || []).join(" / ")
    : word.word || "";
}

function getCorrectAnswerText(word) {
  if (!word) return "";
  return quizDirection === "meaning-to-word"
    ? (word.word || "")
    : (word.meanings || []).join(" / ");
}

function judgeWordAnswer(userAnswer, wordText) {
  const normalizedUser = normalizeText(userAnswer);
  const normalizedWord = normalizeText(wordText);
  if (!normalizedUser || !normalizedWord) return false;

  return (
    normalizedUser === normalizedWord ||
    normalizedUser.includes(normalizedWord) ||
    normalizedWord.includes(normalizedUser)
  );
}

function judgeAnswer(userAnswer, meanings) {
  const normalizedUser = normalizeText(userAnswer);
  if (!normalizedUser) return false;

  const normalizedMeanings = (meanings || [])
    .map((meaning) => normalizeText(meaning))
    .filter(Boolean);

  return normalizedMeanings.some(
    (meaning) =>
      normalizedUser === meaning ||
      normalizedUser.includes(meaning) ||
      meaning.includes(normalizedUser)
  );
}

function startStudy(mode = "all", payload = null) {
  quizDirection = studyDirectionSelect?.value || "word-to-meaning";
  loadStudyQueue(mode, payload);
  if (!currentWord) {
    studyCard.innerHTML = `<p class="muted">선택한 조건에 맞는 단어가 없습니다.</p>`;
    renderProgress();
    return;
  }

  studyLog.innerHTML = "";
  const labelMap = {
    all: "학습을 시작했습니다.",
    wrong: "오답 복습을 시작했습니다.",
    favorite: "즐겨찾기 학습을 시작했습니다.",
    single: "단일 단어 학습을 시작했습니다."
  };
  logMessage(labelMap[mode] || "학습을 시작했습니다.");
  renderCurrentWord();
}

function renderStats() {
  const sectionId = studySectionSelect.value;
  if (!sectionId) {
    totalAttemptsEl.textContent = "0";
    correctAttemptsEl.textContent = "0";
    wrongAttemptsEl.textContent = "0";
    accuracyRateEl.textContent = "0%";
    return;
  }

  const stats = getStudyStatsBySection(sectionId);
  totalAttemptsEl.textContent = stats.total;
  correctAttemptsEl.textContent = stats.correct;
  wrongAttemptsEl.textContent = stats.wrong;
  accuracyRateEl.textContent = `${stats.accuracy}%`;
}

function renderDifficulty() {
  const sectionId = studySectionSelect.value;
  if (!sectionId) {
    sectionDifficultyBadge.textContent = "미측정";
    sectionDifficultyBadge.className = "difficulty-badge diff-none";
    return;
  }

  const difficulty = getSectionDifficulty(sectionId);
  sectionDifficultyBadge.textContent = difficulty.label;
  sectionDifficultyBadge.className = `difficulty-badge ${difficulty.className}`;
}

function renderWrongNote() {
  const sectionId = studySectionSelect.value;
  if (!sectionId) {
    wrongNoteBox.innerHTML = `<div class="empty-state">오답노트가 없습니다.</div>`;
    return;
  }

  const entries = getWrongNoteEntriesBySection(sectionId);

  if (!entries.length) {
    wrongNoteBox.innerHTML = `<div class="empty-state">오답노트가 없습니다.</div>`;
    return;
  }

  wrongNoteBox.innerHTML = entries
    .map((entry) => {
      const meaningsText = (entry.meanings || []).join(" / ");
      return `
        <div class="log-entry">
          <div>
            <span class="note-word">${escapeHtml(entry.word)}</span>
            ${entry.favorite ? `<span class="favorite-inline">⭐</span>` : ""}
            - ${escapeHtml(meaningsText)}
          </div>
          <div class="muted">오답 ${entry.wrongCount}회 · 정답 ${entry.correctCount}회 · 총 ${entry.totalCount}회</div>
          <div class="action-row">
            <button class="button inline-accent" data-action="retry-one" data-id="${entry.id}">이 단어만 다시</button>
            <button class="button" data-action="edit-word" data-id="${entry.id}">수정하러 가기</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRecentStudy() {
  const sectionId = studySectionSelect.value;
  if (!sectionId) {
    recentStudyBox.innerHTML = `<div class="empty-state">최근 학습 기록이 없습니다.</div>`;
    return;
  }

  const records = getRecentStudyRecords(10, sectionId);

  if (!records.length) {
    recentStudyBox.innerHTML = `<div class="empty-state">최근 학습 기록이 없습니다.</div>`;
    return;
  }

  recentStudyBox.innerHTML = records
    .map((record) => {
      const wordText = record.word?.word || "(삭제된 단어)";
      const badgeClass = record.finalCorrect ? "recent-badge-correct" : "recent-badge-wrong";
      const badgeText = record.finalCorrect ? "정답" : "오답";

      return `
        <div class="log-entry">
          <div>
            <strong>${escapeHtml(wordText)}</strong>
            ${record.word?.favorite ? `<span class="favorite-inline">⭐</span>` : ""}
            <span class="${badgeClass}">${badgeText}</span>
          </div>
          <div class="muted">입력: ${escapeHtml(record.userAnswer || "(빈 입력)")}</div>
        </div>
      `;
    })
    .join("");
}

function showMeanings(meanings) {
  return (meanings || []).join(" / ");
}

function beginJudgement(userAnswer) {
  if (!currentWord) return;

  const autoJudgedCorrect =
  quizDirection === "meaning-to-word"
    ? judgeWordAnswer(userAnswer, currentWord.word)
    : judgeAnswer(userAnswer, currentWord.meanings);
  pendingSubmission = {
    wordId: currentWord.id,
    userAnswer,
    autoJudgedCorrect
  };

  if (autoJudgedCorrect) {
    resultBox.innerHTML = `<span class="result-correct">자동 판정: 정답 후보 ✅</span>`;
    judgeHintText.textContent = "자동 판정은 정답 후보입니다. 그대로 확정하거나 뒤집을 수 있습니다.";
  } else {
    resultBox.innerHTML = `<span class="result-wrong">자동 판정: 오답 후보 ❌</span>`;
    judgeHintText.textContent = `자동 판정은 오답 후보입니다.
정답 보기: ${getCorrectAnswerText(currentWord)}`;
  }

  judgeConfirmBox.classList.remove("hidden");
}

function finalizeJudgement(finalCorrect) {
  if (!pendingSubmission || !currentWord) return;

  addStudyRecord({
    wordId: pendingSubmission.wordId,
    userAnswer: pendingSubmission.userAnswer,
    autoJudgedCorrect: pendingSubmission.autoJudgedCorrect,
    finalCorrect
  });

  const correctAnswerText = getCorrectAnswerText(currentWord);

  if (finalCorrect) {
    resultBox.innerHTML = `최종 판정: 정답 ✅`;
    logMessage(
      quizDirection === "meaning-to-word"
        ? `${showMeanings(currentWord.meanings)}: 정답 → ${currentWord.word}`
        : `${currentWord.word}: 정답`
    );
  } else {
    resultBox.innerHTML = `최종 판정: 오답 ❌ · 정답: ${escapeHtml(correctAnswerText)}`;
    logMessage(
      quizDirection === "meaning-to-word"
        ? `${showMeanings(currentWord.meanings)}: 오답 → ${currentWord.word}`
        : `${currentWord.word}: 오답 → ${showMeanings(currentWord.meanings)}`
    );
  }

  renderStats();
  renderWrongNote();
  renderRecentStudy();
  renderDifficulty();

  judgeConfirmBox.classList.add("hidden");

  autoNextTimer = setTimeout(() => {
    moveNext();
  }, 900);
}

async function main() {
  await initData();
  renderBookOptions();

  studyBookSelect.addEventListener("change", () => {
    renderSectionOptions();
  });

  studySectionSelect.addEventListener("change", () => {
    renderStats();
    renderWrongNote();
    renderRecentStudy();
    renderDifficulty();
  });

  startStudyBtn.addEventListener("click", () => {
    startStudy("all");
  });

  retryWrongBtn.addEventListener("click", () => {
    startStudy("wrong");
  });

  favoriteStudyBtn.addEventListener("click", () => {
    startStudy("favorite");
  });

  shuffleStudyBtn.addEventListener("click", () => {
    startStudy(lastMode);
  });

  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentWord) return;
    if (pendingSubmission) return;

    const userAnswer = answerInput.value.trim();
    beginJudgement(userAnswer);
  });

  showAnswerBtn.addEventListener("click", () => {
    if (!currentWord) return;
    resultBox.innerHTML = `정답: <strong>${escapeHtml(getCorrectAnswerText(currentWord))}`;
  });

  nextQuestionBtn.addEventListener("click", () => {
    moveNext();
  });

  confirmCorrectBtn.addEventListener("click", () => {
    finalizeJudgement(true);
  });

  confirmWrongBtn.addEventListener("click", () => {
    finalizeJudgement(false);
  });

  wrongNoteBox.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "retry-one") {
      startStudy("single", { wordId: id });
    }

    if (action === "edit-word") {
      setArchiveEditTarget(id);
      window.location.href = "./archive.html";
    }
  });

  renderStats();
  renderWrongNote();
  renderRecentStudy();
  renderDifficulty();
  renderCurrentWord();
}

main();
