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
    minMeaningsToMatch: 1,
    requireAllMeanings: false,
    partialMatch: true,
    showPos: true,
    showTone: true,
    showTags: true
  },
  normal: {
    key: "normal",
    label: "Normal",
    allowedQuizModes: [QUIZ_MODES.WORD_TO_MEANING, QUIZ_MODES.MEANING_TO_WORD],
    minMeaningsToMatch: 1,
    requireAllMeanings: false,
    partialMatch: false,
    showPos: true,
    showTone: true,
    showTags: false
  },
  hard: {
    key: "hard",
    label: "Hard",
    allowedQuizModes: [
      QUIZ_MODES.WORD_TO_MEANING,
      QUIZ_MODES.MEANING_TO_WORD,
      QUIZ_MODES.ALL_MEANINGS
    ],
    minMeaningsToMatch: null,
    requireAllMeanings: true,
    partialMatch: false,
    showPos: false,
    showTone: false,
    showTags: false
  }
};

export function getDifficultyPreset(key = "easy") {
  return DIFFICULTY_PRESETS[key] || DIFFICULTY_PRESETS.easy;
}
