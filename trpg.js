import { initData, getData } from "./storage.js";
import { scenarios } from "./scenarios.js";
import { getPosLabel, getToneLabel, getTagLabel } from "./tags.js";
import { normalizeText, escapeHtml } from "./utils.js";

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
    resolvedThisTurn: false,
    ended: false
  };
  pendingSubmission = null;
}

function getCurrentScenario() {
  if (!gameState?.scenarioId) return null;
  return scenarios.find((scenario) => scenario.id === gameState.scenarioId) || null;
}

function renderBookOptions() {
  const data = getData();

  if (!data.books.length) {
    trpgBookSelect.innerHTML = `<option value="">책 없음</option>`;
    trpgSectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  trpgBookSelect.innerHTML = data.books
    .map((book) => `<option value="${book.id}">${book.title}</option>`)
    .join("");

  renderSectionOptions();
}

function renderSectionOptions() {
  const data = getData();
  const bookId = trpgBookSelect.value;
  const sections = data.sections.filter((section) => section.bookId === bookId);

  if (!sections.length) {
    trpgSectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  trpgSectionSelect.innerHTML = sections
    .sort((a, b) => a.order - b.order)
    .map((section) => `<option value="${section.id}">${section.title}</option>`)
    .join("");
}

function renderScenarioOptions() {
  scenarioSelect.innerHTML = scenarios
    .map((scenario) => `<option value="${scenario.id}">${scenario.title}</option>`)
    .join("");
}

function getWordsInSection(sectionId) {
  const data = getData();
  return data.words.filter((word) => word.sectionId === sectionId);
}

function pickRandom(array) {
  if (!array.length) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function pickUnusedPreferredWord(actionType, sectionId) {
  const words = getWordsInSection(sectionId);
  if (!words.length) return null;

  const unusedWords = words.filter((word) => !gameState.usedWordIds.includes(word.id));
  const candidateBase = unusedWords.length ? unusedWords : words;

  const matched = candidateBase.filter((word) => {
    const posOk =
      !actionType.preferredPos?.length || actionType.preferredPos.includes(word.pos);

    const tagOk =
      !actionType.preferredTags?.length ||
      (word.tags || []).some((tag) => actionType.preferredTags.includes(tag));

    return posOk && tagOk;
  });

  return pickRandom(matched.length ? matched : candidateBase);
}

function updateStateBox() {
  const scenario = getCurrentScenario();
  const maxTurns = scenario?.loopConfig?.maxTurns || 0;
  sceneCounter.textContent = `${gameState.turnCount} / ${maxTurns}`;
  clueCountEl.textContent = String(gameState.clueCount);
  mistakeCountEl.textContent = String(gameState.mistakeCount);

  if (gameState.ended) {
    scenarioStatus.textContent = "종결";
    return;
  }

  if (gameState.currentActionType && !gameState.resolvedThisTurn) {
    scenarioStatus.textContent = "해석 중";
    return;
  }

  if (gameState.currentActionType && gameState.resolvedThisTurn) {
    scenarioStatus.textContent = "선택 대기";
    return;
  }

  scenarioStatus.textContent = "행동 선택";
}

function renderIntro() {
  const scenario = getCurrentScenario();

  if (!scenario) {
    scenarioTitle.textContent = "시나리오";
    scenarioIntroBox.innerHTML = `<p class="muted">시나리오를 시작해 주세요.</p>`;
    return;
  }

  scenarioTitle.textContent = scenario.title;
  scenarioIntroBox.innerHTML = `<p>${escapeHtml(scenario.intro)}</p>`;
}

function renderSceneChoiceMenu() {
  const scenario = getCurrentScenario();

  if (!scenario || gameState.ended) {
    sceneBox.innerHTML = `<p class="muted">시나리오를 시작해 주세요.</p>`;
    return;
  }

  if (gameState.currentActionType) {
    const actionType = gameState.currentActionType;
    sceneBox.innerHTML = `
      <h3>${escapeHtml(actionType.label)}</h3>
      <p>${escapeHtml(actionType.description)}</p>
    `;
    return;
  }

  const buttonsHtml = scenario.actionTypes
    .map(
      (action) => `
        <button class="button" data-action-type="${action.id}">
          ${escapeHtml(action.label)}
        </button>
      `
    )
    .join("");

  sceneBox.innerHTML = `
    <h3>조사 행동을 선택하세요</h3>
    <p class="muted">현재 상황에서 어떤 방식으로 조사할지 고르세요.</p>
    <div class="button-row">${buttonsHtml}</div>
  `;
}

function renderWordEvent() {
  if (!gameState.currentWord || !gameState.currentActionType || gameState.ended) {
    wordEventBox.classList.add("hidden");
    return;
  }

  const word = gameState.currentWord;
  const tagText = (word.tags || []).map((tag) => getTagLabel(word.pos, tag)).join(", ");

  trpgWordText.textContent = word.word;
  trpgWordMeta.textContent =
    `품사: ${getPosLabel(word.pos)} · 정서: ${getToneLabel(word.tone)} · 태그: ${tagText || "없음"}`;

  trpgAnswerInput.value = "";
  trpgResultBox.innerHTML = "";
  trpgJudgeConfirmBox.classList.add("hidden");
  wordEventBox.classList.remove("hidden");
}

function renderChoicePool() {
  if (!gameState.currentActionType || !gameState.resolvedThisTurn || gameState.ended) {
    sceneChoiceBox.classList.add("hidden");
    choiceButtons.innerHTML = "";
    return;
  }

  sceneChoiceBox.classList.remove("hidden");

  const buttonsHtml = (gameState.currentChoicePool || [])
    .map(
      (choice) => `
        <button class="button" data-choice-id="${choice.id}">
          ${escapeHtml(choice.label)}
        </button>
      `
    )
    .join("");

  choiceButtons.innerHTML = buttonsHtml;
}

function renderJournal() {
  if (!gameState.journal.length) {
    journalBox.innerHTML = `<div class="empty-state">아직 기록이 없습니다.</div>`;
    return;
  }

  journalBox.innerHTML = gameState.journal
    .map((entry) => `<div class="log-entry">${escapeHtml(entry)}</div>`)
    .join("");
}

function renderEnding() {
  if (!gameState.ended) {
    endingBox.classList.add("hidden");
    endingText.innerHTML = "";
    return;
  }

  const scenario = getCurrentScenario();
  endingBox.classList.remove("hidden");

  let endingSummary = scenario.endingTexts.low;
  if (gameState.clueCount >= scenario.loopConfig.clueGoal && gameState.mistakeCount <= 1) {
    endingSummary = scenario.endingTexts.high;
  } else if (gameState.clueCount >= Math.ceil(scenario.loopConfig.clueGoal / 2)) {
    endingSummary = scenario.endingTexts.mid;
  }

  endingText.innerHTML = `
    <p>${escapeHtml(endingSummary)}</p>
    <hr />
    <p><strong>단서 수:</strong> ${gameState.clueCount}</p>
    <p><strong>오해 수:</strong> ${gameState.mistakeCount}</p>
    <p><strong>진행한 턴:</strong> ${gameState.turnCount}</p>
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

function beginInterpretation(userAnswer) {
  if (!gameState.currentWord || !gameState.currentActionType || gameState.resolvedThisTurn) return;

  const autoJudgedCorrect = judgeAnswer(userAnswer, gameState.currentWord.meanings);

  pendingSubmission = {
    userAnswer,
    autoJudgedCorrect
  };

  if (autoJudgedCorrect) {
    trpgResultBox.innerHTML = `<span class="result-correct">자동 판정: 정답 후보 ✅</span>`;
    trpgJudgeHintText.textContent =
      "자동 판정은 정답 후보입니다. 그대로 확정하거나 뒤집을 수 있습니다.";
  } else {
    trpgResultBox.innerHTML = `<span class="result-wrong">자동 판정: 오답 후보 ❌</span>`;
    trpgJudgeHintText.textContent =
      `자동 판정은 오답 후보입니다. 정답 보기: ${(gameState.currentWord.meanings || []).join(" / ")}`;
  }

  trpgJudgeConfirmBox.classList.remove("hidden");
}

function getRandomJournalText(pool) {
  return pickRandom(pool) || "";
}

function finalizeInterpretation(finalCorrect) {
  if (!pendingSubmission || !gameState.currentWord || !gameState.currentActionType) return;

  const actionType = gameState.currentActionType;

  if (finalCorrect) {
    gameState.clueCount += 1;
    trpgResultBox.innerHTML = `<span class="result-correct">해석 성공 ✅</span>`;
    gameState.journal.push(actionType.successText);
    const extra = getRandomJournalText(actionType.successJournalPool || []);
    if (extra) gameState.journal.push(extra);
  } else {
    gameState.mistakeCount += 1;
    trpgResultBox.innerHTML = `<span class="result-wrong">해석 실패 ❌</span>`;
    gameState.journal.push(actionType.failureText);
    const extra = getRandomJournalText(actionType.failureJournalPool || []);
    if (extra) gameState.journal.push(extra);
  }

  if (!gameState.usedWordIds.includes(gameState.currentWord.id)) {
    gameState.usedWordIds.push(gameState.currentWord.id);
  }

  gameState.currentChoicePool = [...(actionType.choicePool || [])];
  gameState.resolvedThisTurn = true;
  pendingSubmission = null;
  trpgJudgeConfirmBox.classList.add("hidden");

  checkEndingCondition();
  renderAll();
}

function startTurnWithAction(actionTypeId) {
  const scenario = getCurrentScenario();
  const actionType = scenario?.actionTypes.find((item) => item.id === actionTypeId);

  if (!actionType || gameState.ended) return;

  gameState.turnCount += 1;
  gameState.currentActionType = actionType;
  gameState.currentWord = pickUnusedPreferredWord(actionType, gameState.sectionId);
  gameState.currentChoicePool = [];
  gameState.resolvedThisTurn = false;
  pendingSubmission = null;

  if (!gameState.currentWord) {
    gameState.ended = true;
  }

  checkEndingCondition();
  renderAll();
}

function finishTurnWithChoice(choiceId) {
  if (!gameState.currentActionType || !gameState.resolvedThisTurn || gameState.ended) return;

  const choice = (gameState.currentChoicePool || []).find((item) => item.id === choiceId);
  if (choice?.journalText) {
    gameState.journal.push(choice.journalText);
  }

  gameState.currentActionType = null;
  gameState.currentWord = null;
  gameState.currentChoicePool = [];
  gameState.resolvedThisTurn = false;

  checkEndingCondition();
  renderAll();
}

function checkEndingCondition() {
  const scenario = getCurrentScenario();
  if (!scenario) return;

  const { maxTurns, clueGoal, mistakeLimit } = scenario.loopConfig;

  const reachedTurnLimit = gameState.turnCount >= maxTurns && !gameState.currentActionType;
  const reachedClueGoal = gameState.clueCount >= clueGoal;
  const reachedMistakeLimit = gameState.mistakeCount >= mistakeLimit;

  if (reachedTurnLimit || reachedClueGoal || reachedMistakeLimit) {
    gameState.ended = true;
    gameState.currentActionType = null;
    gameState.currentWord = null;
    gameState.currentChoicePool = [];
    gameState.resolvedThisTurn = false;
  }
}

function startScenario() {
  const scenarioId = scenarioSelect.value;
  const sectionId = trpgSectionSelect.value;

  if (!scenarioId || !sectionId) {
    alert("책, 섹션, 시나리오를 모두 선택해 주세요.");
    return;
  }

  resetGameState();
  gameState.scenarioId = scenarioId;
  gameState.sectionId = sectionId;

  renderAll();
}

function attachEvents() {
  trpgBookSelect.addEventListener("change", () => {
    renderSectionOptions();
  });

  startScenarioBtn.addEventListener("click", () => {
    startScenario();
  });

  restartScenarioBtn.addEventListener("click", () => {
    startScenario();
  });

  sceneBox.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const actionTypeId = button.dataset.actionType;
    if (actionTypeId) {
      startTurnWithAction(actionTypeId);
    }
  });

  trpgAnswerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!gameState.currentWord || pendingSubmission || gameState.resolvedThisTurn || gameState.ended) return;

    const userAnswer = trpgAnswerInput.value.trim();
    beginInterpretation(userAnswer);
  });

  trpgShowAnswerBtn.addEventListener("click", () => {
    if (!gameState.currentWord) return;
    trpgResultBox.innerHTML = `정답: <strong>${escapeHtml((gameState.currentWord.meanings || []).join(" / "))}</strong>`;
  });

  trpgConfirmCorrectBtn.addEventListener("click", () => {
    finalizeInterpretation(true);
  });

  trpgConfirmWrongBtn.addEventListener("click", () => {
    finalizeInterpretation(false);
  });

  choiceButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const choiceId = button.dataset.choiceId;
    if (choiceId) {
      finishTurnWithChoice(choiceId);
    }
  });
}

async function main() {
  await initData();
  resetGameState();
  renderBookOptions();
  renderScenarioOptions();
  attachEvents();
  renderAll();
}

main();
