export function renderChoicePool({ els, gameState }) {

  alert("renderChoicePool 실행됨");

  if (!els.sceneChoiceBox || !els.choiceButtons) return;

  alert(JSON.stringify({
  action: !!gameState.currentActionType,
  resolved: gameState.resolvedThisTurn,
  ended: gameState.ended,
  choiceLen: (gameState.currentChoicePool || []).length
}));


import { escapeHtml } from "../utils.js";
import { getDifficultyPreset, QUIZ_MODE_LABELS } from "./trpgConfig.js";
import {
  getEndingLevelText,
  getRouteSummaryText,
  getChoiceRouteFlavor
} from "./trpgHelpers.js";

export function getTrpgElements() {
  return {
    trpgBookSelect: document.getElementById("trpgBookSelect"),
    trpgSectionSelect: document.getElementById("trpgSectionSelect"),
    scenarioSelect: document.getElementById("scenarioSelect"),
    difficultySelect: document.getElementById("difficultySelect"),

    startScenarioBtn: document.getElementById("startScenarioBtn"),
    restartScenarioBtn: document.getElementById("restartScenarioBtn"),

    sceneCounter: document.getElementById("sceneCounter"),
    clueCountEl: document.getElementById("clueCount"),
    mistakeCountEl: document.getElementById("mistakeCount"),
    scenarioStatus: document.getElementById("scenarioStatus"),

    scenarioTitle: document.getElementById("scenarioTitle"),
    scenarioIntroBox: document.getElementById("scenarioIntroBox"),
    sceneBox: document.getElementById("sceneBox"),

    wordEventBox: document.getElementById("wordEventBox"),
    trpgWordText: document.getElementById("trpgWordText"),
    trpgWordMeta: document.getElementById("trpgWordMeta"),
    trpgQuizModeText: document.getElementById("trpgQuizModeText"),
    trpgTimerText: document.getElementById("trpgTimerText"),

    trpgAnswerForm: document.getElementById("trpgAnswerForm"),
    trpgAnswerInput: document.getElementById("trpgAnswerInput"),
    trpgShowAnswerBtn: document.getElementById("trpgShowAnswerBtn"),
    trpgResultBox: document.getElementById("trpgResultBox"),

    trpgJudgeConfirmBox: document.getElementById("trpgJudgeConfirmBox"),
    trpgJudgeHintText: document.getElementById("trpgJudgeHintText"),
    trpgConfirmCorrectBtn: document.getElementById("trpgConfirmCorrectBtn"),
    trpgConfirmWrongBtn: document.getElementById("trpgConfirmWrongBtn"),

    sceneChoiceBox: document.getElementById("sceneChoiceBox"),
    choiceButtons: document.getElementById("choiceButtons"),

    endingBox: document.getElementById("endingBox"),
    endingText: document.getElementById("endingText"),

    journalBox: document.getElementById("journalBox")
  };
}

export function renderBookOptions({ els, data }) {
  const { trpgBookSelect, trpgSectionSelect } = els;
  if (!trpgBookSelect || !trpgSectionSelect) return;

  if (!(data?.books || []).length) {
    trpgBookSelect.innerHTML = `<option value="">책 없음</option>`;
    trpgSectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  trpgBookSelect.innerHTML = data.books
    .map((book) => `<option value="${book.id}">${escapeHtml(book.title)}</option>`)
    .join("");
}

export function renderSectionOptions({ els, data }) {
  const { trpgBookSelect, trpgSectionSelect } = els;
  if (!trpgSectionSelect) return;

  const bookId = trpgBookSelect?.value;
  const sections = (data?.sections || []).filter((section) => section.bookId === bookId);

  if (!sections.length) {
    trpgSectionSelect.innerHTML = `<option value="">섹션 없음</option>`;
    return;
  }

  trpgSectionSelect.innerHTML = sections
    .sort((a, b) => a.order - b.order)
    .map((section) => `<option value="${section.id}">${escapeHtml(section.title)}</option>`)
    .join("");
}

export function renderScenarioOptions({ els, scenarios }) {
  const { scenarioSelect } = els;
  if (!scenarioSelect) return;

  if (!scenarios.length) {
    scenarioSelect.innerHTML = `<option value="">시나리오 없음</option>`;
    return;
  }

  scenarioSelect.innerHTML = scenarios
    .map((scenario) => `<option value="${scenario.id}">${escapeHtml(scenario.title)}</option>`)
    .join("");
}

export function renderDifficultyOptions({ els }) {
  const { difficultySelect } = els;
  if (!difficultySelect) return;

  difficultySelect.innerHTML = `
    <option value="easy">Easy</option>
    <option value="normal">Normal</option>
    <option value="hard">Hard</option>
  `;
}

export function updateStateBox({ els, gameState, scenario }) {
  const maxTurns = scenario?.loopConfig?.maxTurns || 0;

  if (els.sceneCounter) els.sceneCounter.textContent = `${gameState.turnCount} / ${maxTurns}`;
  if (els.clueCountEl) els.clueCountEl.textContent = String(gameState.clueCount);
  if (els.mistakeCountEl) els.mistakeCountEl.textContent = String(gameState.mistakeCount);

  if (!els.scenarioStatus) return;

  if (gameState.ended) {
    els.scenarioStatus.textContent = "종결";
    return;
  }

  if (gameState.currentActionType && !gameState.resolvedThisTurn) {
    els.scenarioStatus.textContent = "해석 중";
    return;
  }

  if (gameState.currentActionType && gameState.resolvedThisTurn) {
    els.scenarioStatus.textContent = "선택 대기";
    return;
  }

  els.scenarioStatus.textContent = "행동 선택";
}

export function renderIntro({ els, scenario }) {
  if (!els.scenarioTitle || !els.scenarioIntroBox) return;

  if (!scenario) {
    els.scenarioTitle.textContent = "시나리오";
    els.scenarioIntroBox.innerHTML = `<p class="muted">시나리오를 시작해 주세요.</p>`;
    return;
  }

  els.scenarioTitle.textContent = scenario.title;
  els.scenarioIntroBox.innerHTML = `<p>${escapeHtml(scenario.intro)}</p>`;
}

export function renderSceneChoiceMenu({ els, gameState, scenario }) {
  if (!els.sceneBox) return;

  if (!scenario || gameState.ended) {
    els.sceneBox.innerHTML = `<p class="muted">시나리오를 시작해 주세요.</p>`;
    return;
  }

  if (gameState.currentActionType) {
    const actionType = gameState.currentActionType;
    const description = gameState.currentDescriptionText || actionType.description || "";

    els.sceneBox.innerHTML = `
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

  els.sceneBox.innerHTML = `
    <h3>조사 행동을 선택하세요</h3>
    <p class="muted">현재 상황에서 어떤 방식으로 조사할지 고르세요.</p>
    <div class="button-row">${buttonsHtml}</div>
  `;
}

export function renderWordEvent({
  els,
  gameState,
  getPosLabel,
  getToneLabel,
  getTagLabel
}) {
  if (!els.wordEventBox) return;

  if (
    !gameState.currentWord ||
    !gameState.currentActionType ||
    gameState.resolvedThisTurn ||
    gameState.ended
  ) {
    els.wordEventBox.classList.add("hidden");
    return;
  }

  const preset = getDifficultyPreset(gameState.difficulty);
  const word = gameState.currentWord;

  if (els.trpgWordText) {
    els.trpgWordText.textContent = gameState.currentPromptText || word.word;
  }

  if (els.trpgQuizModeText) {
    els.trpgQuizModeText.textContent = QUIZ_MODE_LABELS[gameState.currentQuizMode] || "";
  }

  if (els.trpgTimerText) {
    els.trpgTimerText.textContent = preset.timeLimitSec ? `제한 시간: ${preset.timeLimitSec}초` : "";
  }

  const metaParts = [];
  if (preset.showPos) metaParts.push(`품사: ${getPosLabel(word.pos)}`);
  if (preset.showTone) metaParts.push(`정서: ${getToneLabel(word.tone)}`);
  if (preset.showTags) {
    const tagText = (word.tags || []).map((tag) => getTagLabel(word.pos, tag)).join(", ");
    metaParts.push(`태그: ${tagText || "없음"}`);
  }

  if (els.trpgWordMeta) {
    els.trpgWordMeta.textContent = metaParts.join(" · ");
  }

  els.wordEventBox.classList.remove("hidden");
}

export function renderChoicePool({ els, gameState }) {
  if (!els.sceneChoiceBox || !els.choiceButtons) return;

  if (!gameState.currentActionType || !gameState.resolvedThisTurn || gameState.ended) {
    els.sceneChoiceBox.classList.add("hidden");
    els.choiceButtons.innerHTML = "";
    return;
  }

  els.sceneChoiceBox.classList.remove("hidden");

  els.choiceButtons.innerHTML = (gameState.currentChoicePool || [])
    .map(
      (choice) => `
        <button class="button" data-choice-id="${choice.id}" type="button">
          ${escapeHtml(choice.label)}
        </button>
      `
    )
    .join("");
}

export function renderJournal({ els, gameState }) {
  if (!els.journalBox) return;

  if (!gameState.journal.length) {
    els.journalBox.innerHTML = `<div class="empty-state">아직 기록이 없습니다.</div>`;
    return;
  }

  els.journalBox.innerHTML = gameState.journal
    .map((entry) => `<div class="log-entry">${escapeHtml(entry)}</div>`)
    .join("");
}

export function renderEnding({ els, gameState, scenario }) {
  if (!els.endingBox || !els.endingText) return;

  if (!gameState.ended) {
    els.endingBox.classList.add("hidden");
    els.endingText.innerHTML = "";
    return;
  }

  if (!scenario) return;

  const endingSummary = getEndingLevelText(gameState, scenario);
  const routeSummary = getRouteSummaryText(gameState, scenario);
  const choiceFlavor = getChoiceRouteFlavor(gameState);

  els.endingBox.classList.remove("hidden");
  els.endingText.innerHTML = `
    <p>${escapeHtml(endingSummary)}</p>
    ${routeSummary ? `<p>${escapeHtml(routeSummary)}</p>` : ""}
    ${choiceFlavor ? `<p>${escapeHtml(choiceFlavor)}</p>` : ""}
    <hr />
    <p><strong>단서 수:</strong> ${gameState.clueCount}</p>
    <p><strong>오해 수:</strong> ${gameState.mistakeCount}</p>
    <p><strong>진행한 턴:</strong> ${gameState.turnCount}</p>
  `;
}

export function renderAll({
  els,
  data,
  scenarios,
  gameState,
  scenario,
  getPosLabel,
  getToneLabel,
  getTagLabel
}) {
  renderBookOptions({ els, data });
  renderSectionOptions({ els, data });
  renderScenarioOptions({ els, scenarios });
  renderDifficultyOptions({ els });
  updateStateBox({ els, gameState, scenario });
  renderIntro({ els, scenario });
  renderSceneChoiceMenu({ els, gameState, scenario });
  renderWordEvent({ els, gameState, getPosLabel, getToneLabel, getTagLabel });
  renderChoicePool({ els, gameState });
  renderJournal({ els, gameState });
  renderEnding({ els, gameState, scenario });
                         }
