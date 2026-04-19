import { normalizeText } from "../utils.js";

export function splitUserMeanings(userAnswer = "") {
  return userAnswer
    .split(/[,/;\n]+/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

export function normalizeMeaningList(meanings = []) {
  return (meanings || []).map((meaning) => normalizeText(meaning)).filter(Boolean);
}

function isMeaningMatch(input, target, { partialMatch = false } = {}) {
  if (!input || !target) return false;
  if (input === target) return true;

  if (partialMatch) {
    return input.includes(target) || target.includes(input);
  }

  return false;
}

export function judgeAnyMeaning(userAnswer, meanings, options = {}) {
  const normalizedInputs = splitUserMeanings(userAnswer);
  const normalizedMeanings = normalizeMeaningList(meanings);

  const matchedMeanings = normalizedMeanings.filter((meaning) =>
    normalizedInputs.some((input) => isMeaningMatch(input, meaning, options))
  );

  return {
    isCorrect: matchedMeanings.length >= 1,
    matchedCount: matchedMeanings.length,
    requiredCount: 1,
    matchedMeanings,
    missingMeanings: normalizedMeanings.filter((meaning) => !matchedMeanings.includes(meaning)),
    correctAnswerText: (meanings || []).join(" / ")
  };
}

export function judgeAtLeastNMeanings(userAnswer, meanings, requiredCount, options = {}) {
  const normalizedInputs = splitUserMeanings(userAnswer);
  const normalizedMeanings = normalizeMeaningList(meanings);

  const matchedMeanings = normalizedMeanings.filter((meaning) =>
    normalizedInputs.some((input) => isMeaningMatch(input, meaning, options))
  );

  return {
    isCorrect: matchedMeanings.length >= requiredCount,
    matchedCount: matchedMeanings.length,
    requiredCount,
    matchedMeanings,
    missingMeanings: normalizedMeanings.filter((meaning) => !matchedMeanings.includes(meaning)),
    correctAnswerText: (meanings || []).join(" / ")
  };
}

export function judgeAllMeanings(userAnswer, meanings, options = {}) {
  const normalizedMeanings = normalizeMeaningList(meanings);
  return judgeAtLeastNMeanings(userAnswer, meanings, normalizedMeanings.length, options);
}

export function judgeWordForm(userAnswer, targetWord) {
  const normalizedUser = normalizeText(userAnswer);
  const normalizedWord = normalizeText(targetWord);

  return {
    isCorrect: !!normalizedUser && !!normalizedWord && normalizedUser === normalizedWord,
    matchedCount: normalizedUser === normalizedWord ? 1 : 0,
    requiredCount: 1,
    matchedMeanings: [],
    missingMeanings: [],
    correctAnswerText: targetWord
  };
}

export function judgeByQuizMode({
  quizMode,
  userAnswer,
  word,
  preset
}) {
  const options = {
    partialMatch: !!preset?.partialMatch
  };

  if (quizMode === "meaningToWord") {
    return {
      ...judgeWordForm(userAnswer, word.word),
      mode: quizMode
    };
  }

  if (quizMode === "allMeanings") {
    return {
      ...judgeAllMeanings(userAnswer, word.meanings || [], options),
      mode: quizMode
    };
  }

  const requiredCount = preset?.minMeaningsToMatch || 1;

  if (requiredCount <= 1) {
    return {
      ...judgeAnyMeaning(userAnswer, word.meanings || [], options),
      mode: quizMode
    };
  }

  return {
    ...judgeAtLeastNMeanings(userAnswer, word.meanings || [], requiredCount, options),
    mode: quizMode
  };
}
