export const QUIZ_MODES = {
  WORD_TO_MEANING: "wordToMeaning",
  MEANING_TO_WORD: "meaningToWord",
  ALL_MEANINGS: "allMeanings"
};

export const QUIZ_MODE_LABELS = {
  [QUIZ_MODES.WORD_TO_MEANING]: "단어 → 뜻",
  [QUIZ_MODES.MEANING_TO_WORD]: "뜻 → 단어",
  [QUIZ_MODES.ALL_MEANINGS]: "전체 뜻 복원"
};

export const DIFFICULTY_PRESETS = {
  easy: {
    key: "easy",
    label: "Easy",
    allowedQuizModes: [QUIZ_MODES.WORD_TO_MEANING],
    requireAllMeanings: false,
    minMeaningsToMatch: 1,
    usePrimaryMeaningsOnly: false,
    showPos: true,
    showTone: true,
    showTags: true,
    allowShowAnswer: true,
    showAnswerPenaltyMistake: 0,
    timeLimitSec: null,
    partialMatch: true
  },
  normal: {
    key: "normal",
    label: "Normal",
    allowedQuizModes: [QUIZ_MODES.WORD_TO_MEANING, QUIZ_MODES.MEANING_TO_WORD],
    requireAllMeanings: false,
    minMeaningsToMatch: 1,
    usePrimaryMeaningsOnly: true,
    showPos: true,
    showTone: true,
    showTags: false,
    allowShowAnswer: true,
    showAnswerPenaltyMistake: 1,
    timeLimitSec: 20,
    partialMatch: false
  },
  hard: {
    key: "hard",
    label: "Hard",
    allowedQuizModes: [
      QUIZ_MODES.WORD_TO_MEANING,
      QUIZ_MODES.MEANING_TO_WORD,
      QUIZ_MODES.ALL_MEANINGS
    ],
    requireAllMeanings: true,
    minMeaningsToMatch: null,
    usePrimaryMeaningsOnly: false,
    showPos: false,
    showTone: false,
    showTags: false,
    allowShowAnswer: false,
    showAnswerPenaltyMistake: null,
    timeLimitSec: 10,
    partialMatch: false
  }
};

export function getDifficultyPreset(difficultyKey = "easy") {
  return DIFFICULTY_PRESETS[difficultyKey] || DIFFICULTY_PRESETS.easy;
}
