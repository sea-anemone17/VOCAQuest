import { generateId, nowISO, normalizeText } from "./utils.js";

const STORAGE_KEY = "word_trpg_data_v3";
const ARCHIVE_EDIT_TARGET_KEY = "word_trpg_archive_edit_target";

function createEmptyData() {
  return {
    books: [],
    sections: [],
    words: [],
    studyRecords: []
  };
}

function migrateWord(word) {
  const next = { ...word };

  if (!Array.isArray(next.meanings)) {
    if (typeof next.meaning === "string") {
      next.meanings = next.meaning
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    } else {
      next.meanings = [];
    }
  }

  if (!Array.isArray(next.tags)) {
    if (typeof next.tags === "string" && next.tags.trim()) {
      next.tags = [next.tags.trim()];
    } else {
      next.tags = [];
    }
  }

  delete next.meaning;
  return next;
}

function migrateRecord(record) {
  const next = { ...record };

  if (typeof next.autoJudgedCorrect !== "boolean") {
    if (typeof next.correct === "boolean") {
      next.autoJudgedCorrect = next.correct;
    } else {
      next.autoJudgedCorrect = false;
    }
  }

  if (typeof next.finalCorrect !== "boolean") {
    if (typeof next.correct === "boolean") {
      next.finalCorrect = next.correct;
    } else {
      next.finalCorrect = false;
    }
  }

  delete next.correct;
  return next;
}

function migrateData(rawData) {
  return {
    books: (rawData.books || []).map((book) => ({ ...book })),
    sections: (rawData.sections || []).map((section) => ({ ...section })),
    words: (rawData.words || []).map(migrateWord),
    studyRecords: (rawData.studyRecords || []).map(migrateRecord)
  };
}

export function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyData();
  }

  try {
    const parsed = JSON.parse(raw);
    return migrateData(parsed);
  } catch (error) {
    console.error("데이터 파싱 실패:", error);
    return createEmptyData();
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function initData() {
  const existing = getData();
  if (
    existing.books.length ||
    existing.sections.length ||
    existing.words.length ||
    existing.studyRecords.length
  ) {
    saveData(existing);
    return existing;
  }

  try {
    const response = await fetch("./data/defaultBooks.json");
    if (!response.ok) {
      throw new Error("기본 데이터 로드 실패");
    }
    const defaultData = await response.json();
    const migrated = migrateData(defaultData);
    saveData(migrated);
    return migrated;
  } catch (error) {
    console.warn("기본 데이터 없이 빈 데이터로 시작합니다.", error);
    const empty = createEmptyData();
    saveData(empty);
    return empty;
  }
}

export function addBook(title) {
  const data = getData();
  const book = {
    id: generateId("book"),
    title: title.trim(),
    createdAt: nowISO()
  };
  data.books.push(book);
  saveData(data);
  return book;
}

export function deleteBook(bookId) {
  const data = getData();
  const relatedWordIds = data.words
    .filter((word) => word.bookId === bookId)
    .map((word) => word.id);

  data.books = data.books.filter((book) => book.id !== bookId);
  data.sections = data.sections.filter((section) => section.bookId !== bookId);
  data.words = data.words.filter((word) => word.bookId !== bookId);
  data.studyRecords = data.studyRecords.filter(
    (record) => !relatedWordIds.includes(record.wordId)
  );

  saveData(data);
}

export function addSection(bookId, title) {
  const data = getData();
  const order =
    data.sections.filter((section) => section.bookId === bookId).length + 1;

  const section = {
    id: generateId("section"),
    bookId,
    title: title.trim(),
    order
  };

  data.sections.push(section);
  saveData(data);
  return section;
}

export function deleteSection(sectionId) {
  const data = getData();

  const wordIds = data.words
    .filter((word) => word.sectionId === sectionId)
    .map((word) => word.id);

  data.sections = data.sections.filter((section) => section.id !== sectionId);
  data.words = data.words.filter((word) => word.sectionId !== sectionId);
  data.studyRecords = data.studyRecords.filter(
    (record) => !wordIds.includes(record.wordId)
  );

  saveData(data);
}

export function isDuplicateWordInSection(sectionId, wordText, excludeWordId = null) {
  const data = getData();
  const target = normalizeText(wordText);

  return data.words.some((word) => {
    if (word.sectionId !== sectionId) return false;
    if (excludeWordId && word.id === excludeWordId) return false;
    return normalizeText(word.word) === target;
  });
}

export function parseMeanings(inputText) {
  return [...new Set(
    inputText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  )];
}

export function addWord(wordData) {
  const data = getData();

  const word = {
    id: generateId("word"),
    bookId: wordData.bookId,
    sectionId: wordData.sectionId,
    word: wordData.word.trim(),
    meanings: Array.isArray(wordData.meanings) ? wordData.meanings : [],
    pos: wordData.pos,
    tone: wordData.tone,
    tags: Array.isArray(wordData.tags) ? wordData.tags : [],
    example: wordData.example?.trim() || "",
    memo: wordData.memo?.trim() || "",
    createdAt: nowISO()
  };

  data.words.push(word);
  saveData(data);
  return word;
}

export function updateWord(wordId, patch) {
  const data = getData();
  const target = data.words.find((word) => word.id === wordId);
  if (!target) return null;

  target.word = patch.word?.trim() ?? target.word;
  target.meanings = Array.isArray(patch.meanings) ? patch.meanings : target.meanings;
  target.pos = patch.pos ?? target.pos;
  target.tone = patch.tone ?? target.tone;
  target.tags = Array.isArray(patch.tags) ? patch.tags : target.tags;
  target.example = patch.example?.trim() ?? target.example;
  target.memo = patch.memo?.trim() ?? target.memo;

  saveData(data);
  return target;
}

export function getWordById(wordId) {
  const data = getData();
  return data.words.find((word) => word.id === wordId) || null;
}

export function deleteWord(wordId) {
  const data = getData();
  data.words = data.words.filter((word) => word.id !== wordId);
  data.studyRecords = data.studyRecords.filter((record) => record.wordId !== wordId);
  saveData(data);
}

export function addStudyRecord(recordData) {
  const data = getData();
  const record = {
    id: generateId("record"),
    wordId: recordData.wordId,
    userAnswer: recordData.userAnswer || "",
    autoJudgedCorrect: Boolean(recordData.autoJudgedCorrect),
    finalCorrect: Boolean(recordData.finalCorrect),
    studiedAt: nowISO()
  };
  data.studyRecords.push(record);
  saveData(data);
  return record;
}

export function getWrongWordIdsBySection(sectionId) {
  const data = getData();
  const wordIdsInSection = new Set(
    data.words.filter((word) => word.sectionId === sectionId).map((word) => word.id)
  );

  const wrongIds = data.studyRecords
    .filter((record) => !record.finalCorrect && wordIdsInSection.has(record.wordId))
    .map((record) => record.wordId);

  return [...new Set(wrongIds)];
}

export function getStudyStatsBySection(sectionId) {
  const data = getData();
  const wordIdsInSection = new Set(
    data.words.filter((word) => word.sectionId === sectionId).map((word) => word.id)
  );

  const records = data.studyRecords.filter((record) => wordIdsInSection.has(record.wordId));
  const total = records.length;
  const correct = records.filter((record) => record.finalCorrect).length;
  const wrong = total - correct;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  return { total, correct, wrong, accuracy };
}

export function getWrongNoteEntriesBySection(sectionId) {
  const data = getData();
  const words = data.words.filter((word) => word.sectionId === sectionId);

  return words
    .map((word) => {
      const records = data.studyRecords.filter((record) => record.wordId === word.id);
      const wrongCount = records.filter((record) => !record.finalCorrect).length;
      const correctCount = records.filter((record) => record.finalCorrect).length;

      return {
        ...word,
        wrongCount,
        correctCount,
        totalCount: records.length
      };
    })
    .filter((entry) => entry.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount);
}

export function getRecentStudyRecords(limit = 10, sectionId = null) {
  const data = getData();

  let records = [...data.studyRecords].sort(
    (a, b) => new Date(b.studiedAt).getTime() - new Date(a.studiedAt).getTime()
  );

  if (sectionId) {
    const wordIds = new Set(
      data.words.filter((word) => word.sectionId === sectionId).map((word) => word.id)
    );
    records = records.filter((record) => wordIds.has(record.wordId));
  }

  return records.slice(0, limit).map((record) => {
    const word = data.words.find((item) => item.id === record.wordId);
    return {
      ...record,
      word: word || null
    };
  });
}

export function getSectionDifficulty(sectionId) {
  const stats = getStudyStatsBySection(sectionId);

  if (stats.total === 0) {
    return {
      label: "미측정",
      className: "diff-none"
    };
  }

  if (stats.accuracy < 50) {
    return {
      label: "🔴 어려움",
      className: "diff-hard"
    };
  }

  if (stats.accuracy < 80) {
    return {
      label: "🟡 보통",
      className: "diff-mid"
    };
  }

  return {
    label: "🟢 쉬움",
    className: "diff-easy"
  };
}

export function setArchiveEditTarget(wordId) {
  sessionStorage.setItem(ARCHIVE_EDIT_TARGET_KEY, wordId);
}

export function consumeArchiveEditTarget() {
  const target = sessionStorage.getItem(ARCHIVE_EDIT_TARGET_KEY);
  sessionStorage.removeItem(ARCHIVE_EDIT_TARGET_KEY);
  return target;
}
