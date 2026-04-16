import { initData, getData } from "./storage.js";
import { scenarios } from "./scenarios/index.js";
import { getPosLabel, getToneLabel, getTagLabel } from "./tags.js";
import { normalizeText, escapeHtml } from "./utils.js";

// =======================
// DOM
// =======================

const trpgBookSelect = document.getElementById("trpgBookSelect");
const trpgSectionSelect = document.getElementById("trpgSectionSelect");
const scenarioSelect = document.getElementById("scenarioSelect");

const startScenarioBtn = document.getElementById("startScenarioBtn");
const restartScenarioBtn = document.getElementById("restartScenarioBtn");

const sceneCounter = document.getElementById("sceneCounter");
const clueCountEl = document.getElementById("clueCount");
const mistakeCountEl = document.getElementById("mistakeCount");
const scenarioStatus = document.getElementById("scenarioStatus");

const scenarioTitle = document.getElementById("scenarioTitle");
const scenarioIntroBox = document.getElementById("scenarioIntroBox");
const sceneBox = document.getElementById("sceneBox");

const wordEventBox = document.getElementById("wordEventBox");
const trpgWordText = document.getElementById("trpgWordText");
const trpgWordMeta = document.getElementById("trpgWordMeta");

const trpgAnswerForm = document.getElementById("trpgAnswerForm");
const trpgAnswerInput = document.getElementById("trpgAnswerInput");
const trpgShowAnswerBtn = document.getElementById("trpgShowAnswerBtn");
const trpgResultBox = document.getElementById("trpgResultBox");

const trpgJudgeConfirmBox = document.getElementById("trpgJudgeConfirmBox");
const trpgJudgeHintText = document.getElementById("trpgJudgeHintText");
const trpgConfirmCorrectBtn = document.getElementById("trpgConfirmCorrectBtn");
const trpgConfirmWrongBtn = document.getElementById("trpgConfirmWrongBtn");

const sceneChoiceBox = document.getElementById("sceneChoiceBox");
const choiceButtons = document.getElementById("choiceButtons");

const endingBox = document.getElementById("endingBox");
const endingText = document.getElementById("endingText");

const journalBox = document.getElementById("journalBox");

// =======================
// STATE
// =======================

let gameState = null;
let pendingSubmission = null;

function resetGameState() {
  gameState = {
    scenarioId: null,
    sectionId: null,
    turnCount: 0,
    clueCount: 0,
    mistakeCount: 0,
    journal: [],
    usedWordIds: [],
    currentActionType: null,
    currentWord: null,
    currentChoicePool: [],
    currentDescriptionText: "",
    currentSuccessText: "",
    currentFailureText: "",
    resolvedThisTurn: false,
    ended: false,
    routeCounts: {},
    choiceRouteCounts: {}
  };
  pendingSubmission = null;
}

// =======================
// HELPERS
// =======================

function getCurrentScenario() {
  return scenarios.find((s) => s.id === gameState?.scenarioId) || null;
}

function getWordsInSection(sectionId) {
  const data = getData();
  return data.words.filter((w) => w.sectionId === sectionId);
}

function pickRandom(arr) {
  return arr?.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function pickTextFromPool(pool, fallback = "") {
  return pickRandom(pool) || fallback;
}

function addRouteCount(bucket, key) {
  if (!key) return;
  bucket[key] = (bucket[key] || 0) + 1;
}

function getTopKey(bucket) {
  return Object.entries(bucket || {})
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function pickUnusedPreferredWord(actionType, sectionId) {
  const words = getWordsInSection(sectionId);
  if (!words.length) return null;

  const unused = words.filter(w => !gameState.usedWordIds.includes(w.id));
  const base = unused.length ? unused : words;

  const matched = base.filter(w => {
    const posOk = !actionType.preferredPos?.length || actionType.preferredPos.includes(w.pos);
    const tagOk = !actionType.preferredTags?.length || (w.tags || []).some(t => actionType.preferredTags.includes(t));
    return posOk && tagOk;
  });

  return pickRandom(matched.length ? matched : base);
}

// =======================
// RENDER
// =======================

function updateStateBox() {
  const scenario = getCurrentScenario();
  const maxTurns = scenario?.loopConfig?.maxTurns || 0;

  sceneCounter.textContent = `${gameState.turnCount} / ${maxTurns}`;
  clueCountEl.textContent = gameState.clueCount;
  mistakeCountEl.textContent = gameState.mistakeCount;

  if (gameState.ended) scenarioStatus.textContent = "종결";
  else if (gameState.currentActionType && !gameState.resolvedThisTurn) scenarioStatus.textContent = "해석 중";
  else if (gameState.resolvedThisTurn) scenarioStatus.textContent = "선택 대기";
  else scenarioStatus.textContent = "행동 선택";
}

function renderIntro() {
  const s = getCurrentScenario();
  if (!s) {
    scenarioIntroBox.innerHTML = `<p class="muted">시나리오를 시작해 주세요.</p>`;
    return;
  }
  scenarioTitle.textContent = s.title;
  scenarioIntroBox.innerHTML = `<p>${escapeHtml(s.intro)}</p>`;
}

function renderSceneChoiceMenu() {
  const s = getCurrentScenario();
  if (!s || gameState.ended) return;

  if (!gameState.currentActionType) {
    sceneBox.innerHTML = s.actionTypes.map(a =>
      `<button class="button" data-action-type="${a.id}">${a.label}</button>`
    ).join("");
    return;
  }

  const a = gameState.currentActionType;
  sceneBox.innerHTML = `
    <h3>${a.label}</h3>
    <p>${escapeHtml(gameState.currentDescriptionText)}</p>
  `;
}

function renderWordEvent() {
  if (!gameState.currentWord) {
    wordEventBox.classList.add("hidden");
    return;
  }

  const w = gameState.currentWord;
  trpgWordText.textContent = w.word;

  trpgWordMeta.textContent =
    `품사: ${getPosLabel(w.pos)} · 정서: ${getToneLabel(w.tone)}`;

  wordEventBox.classList.remove("hidden");
}

function renderChoicePool() {
  if (!gameState.resolvedThisTurn) {
    sceneChoiceBox.classList.add("hidden");
    return;
  }

  sceneChoiceBox.classList.remove("hidden");
  choiceButtons.innerHTML = gameState.currentChoicePool.map(c =>
    `<button class="button" data-choice-id="${c.id}">${c.label}</button>`
  ).join("");
}

function renderJournal() {
  journalBox.innerHTML = gameState.journal.map(e =>
    `<div>${escapeHtml(e)}</div>`
  ).join("");
}

function renderEnding() {
  if (!gameState.ended) return;

  const s = getCurrentScenario();
  const key = getTopKey(gameState.routeCounts);

  endingBox.classList.remove("hidden");
  endingText.innerHTML = `
    <p>${escapeHtml(s.routeSummaries?.[key] || "")}</p>
    <hr/>
    <p>단서: ${gameState.clueCount}</p>
    <p>오해: ${gameState.mistakeCount}</p>
  `;
}

function renderAll() {
  updateStateBox();
  renderIntro();
  renderSceneChoiceMenu();
  renderWordEvent();
  renderChoicePool();
  renderJournal();
  renderEnding();
}

// =======================
// LOGIC
// =======================

function judgeAnswer(user, meanings) {
  const u = normalizeText(user);
  return meanings.some(m => {
    const mm = normalizeText(m);
    return u === mm || u.includes(mm) || mm.includes(u);
  });
}

function startTurn(actionId) {
  const s = getCurrentScenario();
  const a = s.actionTypes.find(x => x.id === actionId);

  gameState.turnCount++;
  gameState.currentActionType = a;
  gameState.currentWord = pickUnusedPreferredWord(a, gameState.sectionId);
  gameState.currentDescriptionText = pickTextFromPool(a.descriptionPool, "");
  gameState.resolvedThisTurn = false;

  renderAll();
}

function finalize(correct) {
  const a = gameState.currentActionType;

  if (correct) {
    gameState.clueCount++;
    addRouteCount(gameState.routeCounts, a.id);
  } else {
    gameState.mistakeCount++;
  }

  gameState.currentChoicePool = a.choicePool || [];
  gameState.resolvedThisTurn = true;

  renderAll();
}

// =======================
// EVENTS
// =======================

function attachEvents() {
  sceneBox.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (btn?.dataset.actionType) startTurn(btn.dataset.actionType);
  });

  trpgAnswerForm.addEventListener("submit", e => {
    e.preventDefault();
    const ans = trpgAnswerInput.value;
    finalize(judgeAnswer(ans, gameState.currentWord.meanings));
  });

  choiceButtons.addEventListener("click", e => {
    gameState.currentActionType = null;
    gameState.currentWord = null;
    gameState.resolvedThisTurn = false;
    renderAll();
  });

  startScenarioBtn.addEventListener("click", () => {
    resetGameState();
    gameState.scenarioId = scenarioSelect.value;
    gameState.sectionId = trpgSectionSelect.value;
    renderAll();
  });
}

// =======================
// INIT
// =======================

async function main() {
  await initData();
  resetGameState();

  scenarioSelect.innerHTML = scenarios.map(s =>
    `<option value="${s.id}">${s.title}</option>`
  ).join("");

  attachEvents();
  renderAll();
}

main();
