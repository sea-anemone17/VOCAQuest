export function createInitialGameState() {
  return {
    scenarioId: null,
    sectionId: null,
    difficulty: "easy",

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

    currentQuizMode: null,
    currentPromptText: "",

    resolvedThisTurn: false,
    ended: false,

    timerStartedAt: null,
    timerLimitSec: null,

    routeCounts: {},
    choiceRouteCounts: {}
  };
}

export function clearCurrentTurn(gameState) {
  gameState.currentActionType = null;
  gameState.currentWord = null;
  gameState.currentChoicePool = [];
  gameState.currentDescriptionText = "";
  gameState.currentSuccessText = "";
  gameState.currentFailureText = "";
  gameState.currentQuizMode = null;
  gameState.currentPromptText = "";
  gameState.resolvedThisTurn = false;
  gameState.timerStartedAt = null;
  gameState.timerLimitSec = null;
}

export function resetProgressState(gameState) {
  gameState.turnCount = 0;
  gameState.clueCount = 0;
  gameState.mistakeCount = 0;
  gameState.journal = [];
  gameState.usedWordIds = [];
  gameState.ended = false;
  gameState.routeCounts = {};
  gameState.choiceRouteCounts = {};

  clearCurrentTurn(gameState);
}
