import { initData, getData, getWordById } from "../storage.js";
import { scenarios } from "../../scenarios/index.js";
import { getPosLabel, getToneLabel, getTagLabel } from "../tags.js";
import { getDifficultyPreset } from "./trpgConfig.js";
import { judgeByQuizMode } from "./trpgJudge.js";
import {
  getTrpgElements,
  renderStats,
  renderIntro,
  renderScene,
  renderWordEvent,
  renderJudgeResult,
  renderChoicePool,
  hideWordEvent,
  clearWordUi,
  renderEnding
} from "./trpgRender.js";

let gameState = null;
let pendingJudgeResult = null;

function getScenarioById(scenarioId) {
  return scenarios.find((scenario) => scenario.id === scenarioId) || null;
}

function createGameState({ bookId, sectionId, scenarioId, difficulty }) {
  return {
    bookId,
    sectionId,
    scenarioId,
    difficulty,

    sceneIndex: 0,
    clues: 0,
    mistakes: 0,
    ended: false,

    currentActionId: null,
    currentWordId: null,
    currentQuizMode: null,
    currentPromptText: "",
    currentChoicePool: [],
    resolvedThisTurn: false
  };
}

function getWordsForCurrentSection() {
  const data = getData();
  return (data.words || []).filter((word) => word.sectionId === gameState.sectionId);
}

function pickRandom(array) {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function chooseQuizMode(preset) {
  return pickRandom(preset.allowedQuizModes);
}

function buildPromptText(word, quizMode) {
  if (!word) return "";

  if (quizMode === "meaningToWord") {
    return (word.meanings || []).slice(0, 2).join(" / ");
  }

  return word.word;
}

function renderAll(els) {
  const scenario = getScenarioById(gameState?.scenarioId);
  const word = gameState?.currentWordId ? getWordById(gameState.currentWordId) : null;

  renderStats({ els, gameState, scenario });
  renderIntro({ els, scenario });
  renderScene({ els, scenario, gameState });
  renderWordEvent({
    els,
    gameState,
    word,
    getPosLabel,
    getToneLabel,
    getTagLabel
  });
  renderChoicePool({ els, gameState });
  renderEnding({ els, gameState });
}

function startScenario(els) {
  const bookId = els.bookSelect?.value || "";
  const sectionId = els.sectionSelect?.value || "";
  const scenarioId = els.scenarioSelect?.value || "";
  const difficulty = els.difficultySelect?.value || "easy";

  if (!bookId || !sectionId || !scenarioId) {
    alert("책, 섹션, 시나리오를 모두 선택해 주세요.");
    return;
  }

  gameState = createGameState({
    bookId,
    sectionId,
    scenarioId,
    difficulty
  });

  pendingJudgeResult = null;
  clearWordUi(els);
  hideWordEvent(els);
  renderAll(els);
}

function startWordEvent(actionId, els) {
  if (!gameState || gameState.ended) return;

  const words = getWordsForCurrentSection();
  const word = pickRandom(words);

  if (!word) {
    alert("현재 섹션에 단어가 없습니다.");
    return;
  }

  const preset = getDifficultyPreset(gameState.difficulty);
  const quizMode = chooseQuizMode(preset);

  gameState.currentActionId = actionId;
  gameState.currentWordId = word.id;
  gameState.currentQuizMode = quizMode;
  gameState.currentPromptText = buildPromptText(word, quizMode);
  gameState.currentChoicePool = [];
  gameState.resolvedThisTurn = false;

  pendingJudgeResult = null;
  clearWordUi(els);
  renderAll(els);
}

function submitWordAnswer(els) {
  if (!gameState?.currentWordId || gameState.resolvedThisTurn) return;

  const word = getWordById(gameState.currentWordId);
  if (!word) return;

  const userAnswer = els.trpgAnswerInput?.value?.trim() || "";
  const preset = getDifficultyPreset(gameState.difficulty);

  const judgeResult = judgeByQuizMode({
    quizMode: gameState.currentQuizMode,
    userAnswer,
    word,
    preset
  });

  pendingJudgeResult = judgeResult;
  renderJudgeResult({ els, judgeResult });
}

function finalizeWordAnswer(isCorrect, els) {
  if (!gameState || !gameState.currentWordId) return;

  if (isCorrect) {
    gameState.clues += 1;
  } else {
    gameState.mistakes += 1;
  }

  gameState.currentChoicePool = [
    {
      id: "next-scene",
      label: "다음 장면으로 이동한다"
    },
    {
      id: "retry-scene",
      label: "다시 행동을 고른다"
    }
  ];

  gameState.resolvedThisTurn = true;

  if (els.trpgJudgeConfirmBox) {
    els.trpgJudgeConfirmBox.classList.add("hidden");
  }

  renderAll(els);
}

function finishChoice(choiceId, els) {
  if (!gameState?.resolvedThisTurn) return;

  if (choiceId === "next-scene") {
    gameState.sceneIndex += 1;
  }

  const scenario = getScenarioById(gameState.scenarioId);
  const maxTurns = scenario?.loopConfig?.maxTurns ?? 3;

  if (gameState.sceneIndex >= maxTurns) {
    gameState.ended = true;
  }

  gameState.currentActionId = null;
  gameState.currentWordId = null;
  gameState.currentQuizMode = null;
  gameState.currentPromptText = "";
  gameState.currentChoicePool = [];
  gameState.resolvedThisTurn = false;

  pendingJudgeResult = null;
  clearWordUi(els);
  hideWordEvent(els);
  renderAll(els);
}

function renderBooks(bookSelect, data) {
  bookSelect.innerHTML = "";
  const books = data.books || [];

  if (!books.length) {
    bookSelect.innerHTML = `<option value="">책 없음</option>`;
    return;
  }

  books.forEach((book) => {
    const opt = document.createElement("option");
    opt.value = book.id;
    opt.textContent = book.title || "제목 없음";
    bookSelect.appendChild(opt);
  });
}

function renderSections(sectionSelect, data, bookId) {
  sectionSelect.innerHTML = "";

  const sections = (data.sections || [])
    .filter((section) => section.bookId === bookId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!sections.length) {
    sectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  sections.forEach((section) => {
    const opt = document.createElement("option");
    opt.value = section.id;
    opt.textContent = section.title || "제목 없음";
    sectionSelect.appendChild(opt);
  });
}

function renderScenarios(scenarioSelect) {
  scenarioSelect.innerHTML = "";

  scenarios.forEach((scenario) => {
    const opt = document.createElement("option");
    opt.value = scenario.id;
    opt.textContent = scenario.title;
    scenarioSelect.appendChild(opt);
  });
}

function renderDifficulties(difficultySelect) {
  difficultySelect.innerHTML = `
    <option value="easy">Easy</option>
    <option value="normal">Normal</option>
    <option value="hard">Hard</option>
  `;
}

async function init() {
  await initData();

  const els = getTrpgElements();
  const data = getData();

  renderBooks(els.bookSelect, data);
  renderSections(els.sectionSelect, data, els.bookSelect.value);
  renderScenarios(els.scenarioSelect);
  renderDifficulties(els.difficultySelect);

  els.bookSelect?.addEventListener("change", () => {
    renderSections(els.sectionSelect, data, els.bookSelect.value);
  });

  els.startBtn?.addEventListener("click", () => {
    startScenario(els);
  });

  els.restartBtn?.addEventListener("click", () => {
    if (!gameState) return;
    startScenario(els);
  });

  els.sceneBox?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action-id]");
    if (!button || !gameState) return;
    startWordEvent(button.dataset.actionId, els);
  });

  document.getElementById("trpgAnswerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitWordAnswer(els);
  });

  document.getElementById("trpgConfirmCorrectBtn")?.addEventListener("click", () => {
    finalizeWordAnswer(true, els);
  });

  document.getElementById("trpgConfirmWrongBtn")?.addEventListener("click", () => {
    finalizeWordAnswer(false, els);
  });

  els.choiceButtons?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-choice-id]");
    if (!button) return;
    finishChoice(button.dataset.choiceId, els);
  });
}

init();
