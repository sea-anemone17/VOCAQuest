import { getData } from "../storage.js";
import { scenarios } from "../../scenarios/index.js";
import { getPosLabel, getToneLabel, getTagLabel } from "../tags.js";

import { getDifficultyPreset } from "./trpgConfig.js";
import { createInitialGameState, clearCurrentTurn, resetProgressState } from "./trpgState.js";
import {
  pickTextFromPool,
  getCurrentScenario,
  pickUnusedPreferredWord,
  applyEffects,
  addRouteCount,
  checkEndingCondition
} from "./trpgHelpers.js";
import { judgeByQuizMode } from "./trpgJudge.js";
import { chooseQuizMode, buildPromptForTurn } from "./trpgPrompt.js";
import {
  getTrpgElements,
  renderAll,
  renderSectionOptions,
  renderBookOptions,
  renderScenarioOptions,
  renderDifficultyOptions
} from "./trpgRender.js";

let els = null;
let gameState = createInitialGameState();
let pendingSubmission = null;

function getScenario() {
  return getCurrentScenario(scenarios, gameState.scenarioId);
}

function resetUiForNewTurn() {
  if (els?.trpgAnswerInput) els.trpgAnswerInput.value = "";
  if (els?.trpgResultBox) els.trpgResultBox.innerHTML = "";
  if (els?.trpgJudgeConfirmBox) els.trpgJudgeConfirmBox.classList.add("hidden");
}

function startScenario() {
  const scenarioId = els?.scenarioSelect?.value;
  const sectionId = els?.trpgSectionSelect?.value;
  const difficulty = els?.difficultySelect?.value || "easy";

  if (!scenarioId || !sectionId) {
    alert("책, 섹션, 시나리오를 모두 선택해 주세요.");
    return;
  }

  gameState.scenarioId = scenarioId;
  gameState.sectionId = sectionId;
  gameState.difficulty = difficulty;

  resetProgressState(gameState);
  pendingSubmission = null;
  resetUiForNewTurn();

  render();
}

function startTurnWithAction(actionTypeId) {
  const scenario = getScenario();
  const actionType = scenario?.actionTypes.find((item) => item.id === actionTypeId);
  if (!actionType || gameState.ended) return;

  const data = getData();
  const preset = getDifficultyPreset(gameState.difficulty);

  gameState.turnCount += 1;
  gameState.currentActionType = actionType;
  gameState.currentWord = pickUnusedPreferredWord({
    data,
    gameState,
    actionType,
    sectionId: gameState.sectionId
  });
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

  if (!gameState.currentWord) {
    gameState.ended = true;
    render();
    return;
  }

  gameState.currentQuizMode = chooseQuizMode(preset);

  const promptInfo = buildPromptForTurn({
    word: gameState.currentWord,
    quizMode: gameState.currentQuizMode,
    preset
  });

  gameState.currentPromptText = promptInfo.promptText;
  gameState.timerStartedAt = preset.timeLimitSec ? Date.now() : null;
  gameState.timerLimitSec = preset.timeLimitSec;

  pendingSubmission = null;
  resetUiForNewTurn();

  // 턴 시작 직후에는 종료 조건이 걸릴 일이 거의 없지만,
  // 구조상 유지해도 큰 문제는 없습니다.
  checkEndingCondition(gameState, scenario, clearCurrentTurn);
  render();
}

function beginInterpretation(userAnswer) {
  if (!gameState.currentWord || !gameState.currentActionType || gameState.resolvedThisTurn) {
    return;
  }

  const preset = getDifficultyPreset(gameState.difficulty);

  const judgeResult = judgeByQuizMode({
    quizMode: gameState.currentQuizMode,
    userAnswer,
    word: gameState.currentWord,
    preset
  });

  pendingSubmission = {
    userAnswer,
    judgeResult
  };

  if (!els?.trpgResultBox || !els?.trpgJudgeHintText || !els?.trpgJudgeConfirmBox) return;

  if (judgeResult.isCorrect) {
    els.trpgResultBox.innerHTML = `<span class="result-correct">자동 판정: 정답 후보 ✅</span>`;
    els.trpgJudgeHintText.textContent =
      "자동 판정은 정답 후보입니다. 그대로 확정하거나 뒤집을 수 있습니다.";
  } else {
    els.trpgResultBox.innerHTML = `<span class="result-wrong">자동 판정: 오답 후보 ❌</span>`;
    els.trpgJudgeHintText.textContent =
      `자동 판정은 오답 후보입니다. 정답 보기: ${judgeResult.correctAnswerText}`;
  }

  els.trpgJudgeConfirmBox.classList.remove("hidden");
}

function finalizeInterpretation(finalCorrect) {
  if (!pendingSubmission || !gameState.currentWord || !gameState.currentActionType) return;

  const actionType = gameState.currentActionType;

  if (els?.trpgResultBox) {
    els.trpgResultBox.innerHTML = finalCorrect
      ? `<span class="result-correct">해석 성공 ✅</span>`
      : `<span class="result-wrong">해석 실패 ❌</span>`;
  }

  if (finalCorrect) {
    if (gameState.currentSuccessText) {
      gameState.journal.push(gameState.currentSuccessText);
    }

    const extra = pickTextFromPool(actionType.successJournalPool, "");
    if (extra) {
      gameState.journal.push(extra);
    }

    applyEffects(gameState, actionType.effects?.success || {
      clue: 1,
      routeBias: actionType.id
    });
  } else {
    if (gameState.currentFailureText) {
      gameState.journal.push(gameState.currentFailureText);
    }

    const extra = pickTextFromPool(actionType.failureJournalPool, "");
    if (extra) {
      gameState.journal.push(extra);
    }

    applyEffects(gameState, actionType.effects?.failure || {
      mistake: 1,
      routeBias: actionType.id
    });
  }

  if (!gameState.usedWordIds.includes(gameState.currentWord.id)) {
    gameState.usedWordIds.push(gameState.currentWord.id);
  }

  gameState.currentChoicePool = [...(actionType.choicePool || [])];
  gameState.resolvedThisTurn = true;
  pendingSubmission = null;

  if (els?.trpgJudgeConfirmBox) {
    els.trpgJudgeConfirmBox.classList.add("hidden");
  }

  // 여기서는 엔딩 체크를 하지 않습니다.
  // 선택지를 보여 준 뒤, 사용자가 선택을 마쳤을 때 종료 조건을 확인해야
  // currentChoicePool / resolvedThisTurn 상태가 유지됩니다.
  render();
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

  // 선택을 마친 뒤에 턴 종료
  clearCurrentTurn(gameState);

  // 이 시점에 종료 조건 확인
  checkEndingCondition(gameState, getScenario(), clearCurrentTurn);
  render();
}

function render() {
  renderAll({
    els,
    gameState,
    scenario: getScenario(),
    getPosLabel,
    getToneLabel,
    getTagLabel
  });
}

function attachEvents() {
  if (els.trpgBookSelect) {
    els.trpgBookSelect.addEventListener("change", () => {
      renderSectionOptions({ els, data: getData() });
    });
  }

  if (els.startScenarioBtn) {
    els.startScenarioBtn.addEventListener("click", startScenario);
  }

  if (els.restartScenarioBtn) {
    els.restartScenarioBtn.addEventListener("click", startScenario);
  }

  if (els.sceneBox) {
    els.sceneBox.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const actionTypeId = button.dataset.actionType;
      if (actionTypeId) {
        startTurnWithAction(actionTypeId);
      }
    });
  }

  if (els.trpgAnswerForm) {
    els.trpgAnswerForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!gameState.currentWord || pendingSubmission || gameState.resolvedThisTurn || gameState.ended) {
        return;
      }

      const userAnswer = els.trpgAnswerInput?.value?.trim() || "";
      beginInterpretation(userAnswer);
    });
  }

  if (els.trpgShowAnswerBtn) {
    els.trpgShowAnswerBtn.addEventListener("click", () => {
      const preset = getDifficultyPreset(gameState.difficulty);
      if (!gameState.currentWord || !els.trpgResultBox || !preset.allowShowAnswer) return;

      els.trpgResultBox.innerHTML =
        `정답: <strong>${gameState.currentWord.meanings.join(" / ")}</strong>`;

      if (typeof preset.showAnswerPenaltyMistake === "number") {
        gameState.mistakeCount += preset.showAnswerPenaltyMistake;
        render();
      }
    });
  }

  if (els.trpgConfirmCorrectBtn) {
    els.trpgConfirmCorrectBtn.addEventListener("click", () => finalizeInterpretation(true));
  }

  if (els.trpgConfirmWrongBtn) {
    els.trpgConfirmWrongBtn.addEventListener("click", () => finalizeInterpretation(false));
  }

  if (els.choiceButtons) {
    els.choiceButtons.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const choiceId = button.dataset.choiceId;
      if (choiceId) {
        finishTurnWithChoice(choiceId);
      }
    });
  }
}

export async function initTrpgApp() {
  els = getTrpgElements();
  gameState = createInitialGameState();

  const data = getData();

  // select 옵션은 초기화 시 한 번만 채움
  renderBookOptions({ els, data });
  renderSectionOptions({ els, data });
  renderScenarioOptions({ els, scenarios });
  renderDifficultyOptions({ els });

  // 기본 난이도 값 반영
  if (els?.difficultySelect) {
    els.difficultySelect.value = gameState.difficulty;
  }

  attachEvents();
  render();
}
