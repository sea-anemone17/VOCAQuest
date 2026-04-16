import { initData, getData, addStudyRecord } from "./storage.js";
import { getPosLabel, getToneLabel, getTagLabel } from "./tags.js";
import { shuffleArray, normalizeText, escapeHtml } from "./utils.js";

const studyBookSelect = document.getElementById("studyBookSelect");
const studySectionSelect = document.getElementById("studySectionSelect");
const startStudyBtn = document.getElementById("startStudyBtn");
const shuffleStudyBtn = document.getElementById("shuffleStudyBtn");

const studyCard = document.getElementById("studyCard");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const resultBox = document.getElementById("resultBox");
const studyLog = document.getElementById("studyLog");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");

let currentQueue = [];
let currentIndex = 0;
let currentWord = null;

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
    return;
  }

  studySectionSelect.innerHTML = sections
    .sort((a, b) => a.order - b.order)
    .map((section) => `<option value="${section.id}">${section.title}</option>`)
    .join("");
}

function loadStudyQueue() {
  const data = getData();
  const sectionId = studySectionSelect.value;

  const words = data.words.filter((word) => word.sectionId === sectionId);
  currentQueue = shuffleArray(words);
  currentIndex = 0;
  currentWord = currentQueue[0] || null;
}

function renderCurrentWord() {
  if (!currentWord) {
    studyCard.innerHTML = `<p class="muted">출제할 단어가 없습니다.</p>`;
    return;
  }

  const tagText = currentWord.tags
    .map((tag) => getTagLabel(currentWord.pos, tag))
    .join(", ");

  studyCard.innerHTML = `
    <div class="study-word">${escapeHtml(currentWord.word)}</div>
    <div class="study-sub">품사: ${getPosLabel(currentWord.pos)}</div>
    <div class="study-sub">정서값: ${getToneLabel(currentWord.tone)}</div>
    <div class="study-sub">태그: ${escapeHtml(tagText || "없음")}</div>
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
  currentIndex += 1;
  currentWord = currentQueue[currentIndex] || null;
  renderCurrentWord();
}

function judgeAnswer(userAnswer, actualMeaning) {
  const normalizedUser = normalizeText(userAnswer);
  const answerParts = actualMeaning
    .split(",")
    .map((part) => normalizeText(part))
    .filter(Boolean);

  if (!normalizedUser) return false;

  return answerParts.some(
    (answer) => normalizedUser.includes(answer) || answer.includes(normalizedUser)
  );
}

function startStudy() {
  loadStudyQueue();
  if (!currentWord) {
    studyCard.innerHTML = `<p class="muted">선택한 섹션에 단어가 없습니다.</p>`;
    return;
  }

  studyLog.innerHTML = "";
  logMessage("학습을 시작했습니다.");
  renderCurrentWord();
}

async function main() {
  await initData();
  renderBookOptions();

  studyBookSelect.addEventListener("change", renderSectionOptions);

  startStudyBtn.addEventListener("click", () => {
    startStudy();
  });

  shuffleStudyBtn.addEventListener("click", () => {
    startStudy();
  });

  answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentWord) return;

    const userAnswer = answerInput.value.trim();
    const isCorrect = judgeAnswer(userAnswer, currentWord.meaning);

    addStudyRecord({
      wordId: currentWord.id,
      correct: isCorrect,
      userAnswer
    });

    if (isCorrect) {
      resultBox.innerHTML = `<span class="result-correct">정답입니다! ✅</span>`;
      logMessage(`${currentWord.word}: 정답`);
    } else {
      resultBox.innerHTML = `<span class="result-wrong">오답입니다. 정답: ${escapeHtml(currentWord.meaning)} ❌</span>`;
      logMessage(`${currentWord.word}: 오답 → ${currentWord.meaning}`);
    }
  });

  showAnswerBtn.addEventListener("click", () => {
    if (!currentWord) return;
    resultBox.innerHTML = `정답: <strong>${escapeHtml(currentWord.meaning)}</strong>`;
  });

  nextQuestionBtn.addEventListener("click", () => {
    moveNext();
  });

  renderCurrentWord();
}

main();
