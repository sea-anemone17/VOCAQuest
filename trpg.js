throw new Error("ROOT TRPG JS TEST ERROR");

import { initData, getData } from "./storage.js";
import { scenarios } from "./scenarios/index.js";
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

function getCurrentScenario() {
  if (!gameState?.scenarioId) return null;
  return scenarios.find((scenario) => scenario.id === gameState.scenarioId) || null;
}

function getWordsInSection(sectionId) {
  const data = getData();
  return data.words.filter((word) => word.sectionId === sectionId);
}

function pickRandom(array) {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function pickTextFromPool(pool, fallback = "") {
  return pickRandom(pool) || fallback;
}

function ensureRouteCounter(bucket, key) {
  if (!key) return;
  if (typeof bucket[key] !== "number") {
    bucket[key] = 0;
  }
}

function addRouteCount(bucket, key, amount = 1) {
  if (!key) return;
  ensureRouteCounter(bucket, key);
  bucket[key] += amount;
}

function getTopKey(bucket) {
  const entries = Object.entries(bucket || {});
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
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

function renderBookOptions() {
  const data = getData();

  if (!trpgBookSelect || !trpgSectionSelect) return;

  if (!data.books.length) {
    trpgBookSelect.innerHTML = `<option value="">책 없음</option>`;
    trpgSectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  trpgBookSelect.innerHTML = data.books
    .map((book) => `<option value="${book.id}">${escapeHtml(book.title)}</option>`)
    .join("");

  renderSectionOptions();
}

function renderSectionOptions() {
  const data = getData();
  const bookId = trpgBookSelect?.value;

  if (!trpgSectionSelect) return;

  const sections = data.sections.filter((section) => section.bookId === bookId);

  if (!sections.length) {
    trpgSectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  trpgSectionSelect.innerHTML = sections
    .sort((a, b) => a.order - b.order)
    .map((section) => `<option value="${section.id}">${escapeHtml(section.title)}</option>`)
    .join("");
}

function renderScenarioOptions() {
  if (!scenarioSelect) return;

  if (!scenarios.length) {
    scenarioSelect.innerHTML = `<option value="">시나리오 없음</option>`;
    return;
  }

  scenarioSelect.innerHTML = scenarios
    .map((scenario) => `<option value="${scenario.id}">${escapeHtml(scenario.title)}</option>`)
    .join("");
}

function updateStateBox() {
  const scenario = getCurrentScenario();
  const maxTurns = scenario?.loopConfig?.maxTurns || 0;

  if (sceneCounter) sceneCounter.textContent = `${gameState.turnCount} / ${maxTurns}`;
  if (clueCountEl) clueCountEl.textContent = String(gameState.clueCount);
  if (mistakeCountEl) mistakeCountEl.textContent = String(gameState.mistakeCount);

  if (!scenarioStatus) return;

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

  if (!scenarioTitle || !scenarioIntroBox) return;

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

  if (!sceneBox) return;

  if (!scenario || gameState.ended) {
    sceneBox.innerHTML = `<p class="muted">시나리오를 시작해 주세요.</p>`;
    return;
  }

  if (gameState.currentActionType) {
    const actionType = gameState.currentActionType;
    const description =
      gameState.currentDescriptionText ||
      pickTextFromPool(actionType.descriptionPool, actionType.description || "");

    sceneBox.innerHTML = `
      <h3>${escapeHtml(actionType.label)}</h3>
      <p>${escapeHtml(description)}</p>
    `;
    return;
  }

  const buttonsHtml = scenario.actionTypes
    .map(
      (action) => `
        <button class="button" data-action-type="${action.id}" type="button">
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
  if (!wordEventBox) return;

  if (!gameState.currentWord || !gameState.currentActionType || gameState.ended) {
    wordEventBox.classList.add("hidden");
    return;
  }

  const word = gameState.currentWord;
  const tagText = (word.tags || []).map((tag) => getTagLabel(word.pos, tag)).join(", ");

  if (trpgWordText) trpgWordText.textContent = word.word;
  if (trpgWordMeta) {
    trpgWordMeta.textContent =
      `품사: ${getPosLabel(word.pos)} · 정서: ${getToneLabel(word.tone)} · 태그: ${tagText || "없음"}`;
  }

  if (trpgAnswerInput) trpgAnswerInput.value = "";
  if (trpgResultBox) trpgResultBox.innerHTML = "";
  if (trpgJudgeConfirmBox) trpgJudgeConfirmBox.classList.add("hidden");

  wordEventBox.classList.remove("hidden");
}

function renderChoicePool() {
  if (!sceneChoiceBox || !choiceButtons) return;

  if (!gameState.currentActionType || !gameState.resolvedThisTurn || gameState.ended) {
    sceneChoiceBox.classList.add("hidden");
    choiceButtons.innerHTML = "";
    return;
  }

  sceneChoiceBox.classList.remove("hidden");

  const buttonsHtml = (gameState.currentChoicePool || [])
    .map(
      (choice) => `
        <button class="button" data-choice-id="${choice.id}" type="button">
          ${escapeHtml(choice.label)}
        </button>
      `
    )
    .join("");

  choiceButtons.innerHTML = buttonsHtml;
}

function renderJournal() {
  if (!journalBox) return;

  if (!gameState.journal.length) {
    journalBox.innerHTML = `<div class="empty-state">아직 기록이 없습니다.</div>`;
    return;
  }

  journalBox.innerHTML = gameState.journal
    .map((entry) => `<div class="log-entry">${escapeHtml(entry)}</div>`)
    .join("");
}

function getEndingLevelText(scenario) {
  if (!scenario) return "";

  if (gameState.clueCount >= scenario.loopConfig.clueGoal && gameState.mistakeCount <= 1) {
    return scenario.endingTexts.high;
  }

  if (gameState.clueCount >= Math.ceil(scenario.loopConfig.clueGoal / 2)) {
    return scenario.endingTexts.mid;
  }

  return scenario.endingTexts.low;
}

function getRouteSummaryText(scenario) {
  const actionBias = getTopKey(gameState.routeCounts);
  if (!actionBias) return "";
  return scenario.routeSummaries?.[actionBias] || "";
}

function getChoiceRouteFlavor() {
  const topChoiceRoute = getTopKey(gameState.choiceRouteCounts);

  const choiceRouteTexts = {
    careful: "당신은 여러 순간에서 성급히 단정하기보다, 보이는 것의 결을 오래 들여다보려 했다.",
    tracking: "당신은 흩어진 자국들 사이의 방향을 놓치지 않으려는 태도로 조사를 이어 갔다.",
    atmospheric: "당신은 눈에 보이는 사실보다도 공간이 풍기는 미묘한 인상과 긴장을 오래 의식했다.",
    forensic: "당신은 사소한 자국과 물리적 변화들을 세밀하게 짚어 보며 사건의 흐름을 더듬었다.",
    interpretive: "당신은 단어와 문장 사이의 간극을 견디며, 남겨진 표현들이 품은 뜻을 끝까지 해석하려 했다.",
    practical: "당신은 흔적을 오래 감상하기보다 손에 남길 수 있는 핵심을 빠르게 추려 내는 쪽을 택했다.",
    systematic: "당신은 흩어진 단서들을 분류하고 배열하며 질서 있게 구조를 복원하려 했다."
  };

  return topChoiceRoute ? choiceRouteTexts[topChoiceRoute] || "" : "";
}

function renderEnding() {
  if (!endingBox || !endingText) return;

  if (!gameState.ended) {
    endingBox.classList.add("hidden");
    endingText.innerHTML = "";
    return;
  }

  const scenario = getCurrentScenario();
  if (!scenario) return;

  const endingSummary = getEndingLevelText(scenario);
  const routeSummary = getRouteSummaryText(scenario);
  const choiceFlavor = getChoiceRouteFlavor();

  endingBox.classList.remove("hidden");
  endingText.innerHTML = `
    <p>${escapeHtml(endingSummary)}</p>
    ${routeSummary ? `<p>${escapeHtml(routeSummary)}</p>` : ""}
    ${choiceFlavor ? `<p>${escapeHtml(choiceFlavor)}</p>` : ""}
    <hr />
    <p><strong>단서 수:</strong> ${gameState.clueCount}</p>
    <p><strong>오해 수:</strong> ${gameState.mistakeCount}</p>
    <p><strong>진행한 턴:</strong> ${gameState.turnCount}</p>
  `;
}

function renderAll() {
  renderBookOptions();
  renderScenarioOptions();
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
  if (!gameState.currentWord || !gameState.currentActionType || gameState.resolvedThisTurn) {
    return;
  }

  const autoJudgedCorrect = judgeAnswer(userAnswer, gameState.currentWord.meanings);

  pendingSubmission = {
    userAnswer,
    autoJudgedCorrect
  };

  if (!trpgResultBox || !trpgJudgeHintText || !trpgJudgeConfirmBox) return;

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

function applyEffects(effectConfig = {}) {
  if (typeof effectConfig.clue === "number") {
    gameState.clueCount += effectConfig.clue;
  }

  if (typeof effectConfig.mistake === "number") {
    gameState.mistakeCount += effectConfig.mistake;
  }

  if (effectConfig.routeBias) {
    addRouteCount(gameState.routeCounts, effectConfig.routeBias, 1);
  }
}

function finalizeInterpretation(finalCorrect) {
  if (!pendingSubmission || !gameState.currentWord || !gameState.currentActionType) return;

  const actionType = gameState.currentActionType;

  if (trpgResultBox) {
    if (finalCorrect) {
      trpgResultBox.innerHTML = `<span class="result-correct">해석 성공 ✅</span>`;
    } else {
      trpgResultBox.innerHTML = `<span class="result-wrong">해석 실패 ❌</span>`;
    }
  }

  if (finalCorrect) {
    const successText =
      gameState.currentSuccessText ||
      pickTextFromPool(actionType.successTextPool, actionType.successText || "");

    if (successText) {
      gameState.journal.push(successText);
    }

    const extra = pickTextFromPool(actionType.successJournalPool, "");
    if (extra) {
      gameState.journal.push(extra);
    }

    applyEffects(actionType.effects?.success || { clue: 1, routeBias: actionType.id });
  } else {
    const failureText =
      gameState.currentFailureText ||
      pickTextFromPool(actionType.failureTextPool, actionType.failureText || "");

    if (failureText) {
      gameState.journal.push(failureText);
    }

    const extra = pickTextFromPool(actionType.failureJournalPool, "");
    if (extra) {
      gameState.journal.push(extra);
    }

    applyEffects(actionType.effects?.failure || { mistake: 1, routeBias: actionType.id });
  }

  if (!gameState.usedWordIds.includes(gameState.currentWord.id)) {
    gameState.usedWordIds.push(gameState.currentWord.id);
  }

  gameState.currentChoicePool = [...(actionType.choicePool || [])];
  gameState.resolvedThisTurn = true;
  pendingSubmission = null;

  if (trpgJudgeConfirmBox) {
    trpgJudgeConfirmBox.classList.add("hidden");
  }

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
  gameState.currentDescriptionText = pickTextFromPool(
    actionType.descriptionPool,
    actionType.description || ""
  );
  gameState.currentSuccessText = pickTextFromPool(
    actionType.successTextPool,
    actionType.successText || ""
  );
  gameState.currentFailureText = pickTextFromPool(
    actionType.failureTextPool,
    actionType.failureText || ""
  );
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
  if (choice?.routeTag) {
    addRouteCount(gameState.choiceRouteCounts, choice.routeTag, 1);
  }

  gameState.currentActionType = null;
  gameState.currentWord = null;
  gameState.currentChoicePool = [];
  gameState.currentDescriptionText = "";
  gameState.currentSuccessText = "";
  gameState.currentFailureText = "";
  gameState.resolvedThisTurn = false;

  checkEndingCondition();
  renderAll();
}

function checkEndingCondition() {
  const scenario = getCurrentScenario();
  if (!scenario) return;

  const { maxTurns, clueGoal, mistakeLimit, minActionsBeforeEnding = 0 } = scenario.loopConfig;

  const enoughTurnsForEnding = gameState.turnCount >= minActionsBeforeEnding;
  const reachedTurnLimit = gameState.turnCount >= maxTurns && !gameState.currentActionType;
  const reachedClueGoal = gameState.clueCount >= clueGoal && enoughTurnsForEnding;
  const reachedMistakeLimit = gameState.mistakeCount >= mistakeLimit && enoughTurnsForEnding;

  if (reachedTurnLimit || reachedClueGoal || reachedMistakeLimit) {
    gameState.ended = true;
    gameState.currentActionType = null;
    gameState.currentWord = null;
    gameState.currentChoicePool = [];
    gameState.currentDescriptionText = "";
    gameState.currentSuccessText = "";
    gameState.currentFailureText = "";
    gameState.resolvedThisTurn = false;
  }
}

function startScenario() {
  const scenarioId = scenarioSelect?.value;
  const sectionId = trpgSectionSelect?.value;

  if (!scenarioId || !sectionId) {
    alert("책, 섹션, 시나리오를 모두 선택해 주세요.");
    return;
  }

  resetGameState();
  gameState.scenarioId = scenarioId;
  gameState.sectionId = sectionId;

  if (endingBox) endingBox.classList.add("hidden");
  if (endingText) endingText.innerHTML = "";

  renderAll();
}

function attachEvents() {
  if (trpgBookSelect) {
    trpgBookSelect.addEventListener("change", () => {
      renderSectionOptions();
    });
  }

  if (startScenarioBtn) {
    startScenarioBtn.addEventListener("click", () => {
      startScenario();
    });
  }

  if (restartScenarioBtn) {
    restartScenarioBtn.addEventListener("click", () => {
      startScenario();
    });
  }

  if (sceneBox) {
    sceneBox.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const actionTypeId = button.dataset.actionType;
      if (actionTypeId) {
        startTurnWithAction(actionTypeId);
      }
    });
  }

  if (trpgAnswerForm) {
    trpgAnswerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!gameState.currentWord || pendingSubmission || gameState.resolvedThisTurn || gameState.ended) {
        return;
      }

      const userAnswer = trpgAnswerInput?.value?.trim() || "";
      beginInterpretation(userAnswer);
    });
  }

  if (trpgShowAnswerBtn) {
    trpgShowAnswerBtn.addEventListener("click", () => {
      if (!gameState.currentWord || !trpgResultBox) return;
      trpgResultBox.innerHTML = `정답: <strong>${escapeHtml((gameState.currentWord.meanings || []).join(" / "))}</strong>`;
    });
  }

  if (trpgConfirmCorrectBtn) {
    trpgConfirmCorrectBtn.addEventListener("click", () => {
      finalizeInterpretation(true);
    });
  }

  if (trpgConfirmWrongBtn) {
    trpgConfirmWrongBtn.addEventListener("click", () => {
      finalizeInterpretation(false);
    });
  }

  if (choiceButtons) {
    choiceButtons.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const choiceId = button.dataset.choiceId;
      if (choiceId) {
        finishTurnWithChoice(choiceId);
      }
    });
  }
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
