import { generateId, nowISO, normalizeText, uniqueArray } from "./utils.js";

export const STORAGE_KEY = "word_trpg_data";
export const CURRENT_SCHEMA_VERSION = 2;

let memoryCache = null;

export function createEmptyData() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastUpdatedAt: nowISO(),
    books: [],
    sections: [],
    words: [],
    studyRecords: []
  };
}

function touch(data) {
  data.lastUpdatedAt = nowISO();
  return data;
}

function migrateWord(word) {
  const next = { ...word };

  if (!Array.isArray(next.meanings)) {
    if (typeof next.meaning === "string") {
      next.meanings = next.meaning
        .split(/[,/;\n]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      next.meanings = [];
    }
  }

  if (!Array.isArray(next.tags)) {
    next.tags = [];
  }

  if (!next.headword && next.word) {
    next.headword = normalizeText(next.word);
  }

  if (!Array.isArray(next.primaryMeaningIndexes)) {
    next.primaryMeaningIndexes = [];
  }

  if (!next.createdAt) {
    next.createdAt = nowISO();
  }

  if (!next.updatedAt) {
    next.updatedAt = nowISO();
  }

  return next;
}

function migrateSection(section) {
  const next = { ...section };

  if (typeof next.order !== "number") {
    next.order = 0;
  }

  if (!next.createdAt) {
    next.createdAt = nowISO();
  }

  if (!next.updatedAt) {
    next.updatedAt = nowISO();
  }

  return next;
}

function migrateBook(book) {
  const next = { ...book };

  if (!next.createdAt) {
    next.createdAt = nowISO();
  }

  if (!next.updatedAt) {
    next.updatedAt = nowISO();
  }

  return next;
}

function migrateStudyRecord(record) {
  const next = { ...record };

  if (!next.createdAt) {
    next.createdAt = nowISO();
  }

  return next;
}

function migrateData(raw) {
  const base = createEmptyData();
  const source = raw && typeof raw === "object" ? raw : {};

  const migrated = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastUpdatedAt: source.lastUpdatedAt || nowISO(),
    books: (source.books || []).map(migrateBook),
    sections: (source.sections || []).map(migrateSection),
    words: (source.words || []).map(migrateWord),
    studyRecords: (source.studyRecords || []).map(migrateStudyRecord)
  };

  return {
    ...base,
    ...migrated
  };
}

export async function initData() {
  const rawText = localStorage.getItem(STORAGE_KEY);

  if (!rawText) {
    memoryCache = createEmptyData();
    saveData(memoryCache);
    return memoryCache;
  }

  try {
    const parsed = JSON.parse(rawText);
    memoryCache = migrateData(parsed);
    saveData(memoryCache);
    return memoryCache;
  } catch (error) {
    console.error("저장 데이터 파싱 실패:", error);
    memoryCache = createEmptyData();
    saveData(memoryCache);
    return memoryCache;
  }
}

export function getData() {
  if (!memoryCache) {
    const rawText = localStorage.getItem(STORAGE_KEY);
    if (!rawText) {
      memoryCache = createEmptyData();
      return memoryCache;
    }

    try {
      memoryCache = migrateData(JSON.parse(rawText));
    } catch (error) {
      console.error("저장 데이터 읽기 실패:", error);
      memoryCache = createEmptyData();
    }
  }

  return memoryCache;
}

export function saveData(nextData) {
  const safeData = migrateData(nextData);
  touch(safeData);
  memoryCache = safeData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
  return memoryCache;
}

export function resetAllData() {
  const empty = createEmptyData();
  saveData(empty);
  return empty;
}

export function exportData() {
  return JSON.stringify(getData(), null, 2);
}

export function importData(jsonText) {
  const parsed = JSON.parse(jsonText);
  const migrated = migrateData(parsed);
  saveData(migrated);
  return migrated;
}

/* =========================
   Books
========================= */

export function addBook({ title }) {
  const data = getData();

  const newBook = {
    id: generateId("book"),
    title: String(title || "").trim(),
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  data.books.push(newBook);
  saveData(data);
  return newBook;
}

export function updateBook(bookId, patch = {}) {
  const data = getData();
  const target = data.books.find((book) => book.id === bookId);
  if (!target) return null;

  if (typeof patch.title === "string") {
    target.title = patch.title.trim();
  }

  target.updatedAt = nowISO();
  saveData(data);
  return target;
}

export function deleteBook(bookId) {
  const data = getData();

  const sectionIds = data.sections.filter((section) => section.bookId === bookId).map((section) => section.id);
  const wordIds = data.words
    .filter((word) => sectionIds.includes(word.sectionId))
    .map((word) => word.id);

  data.books = data.books.filter((book) => book.id !== bookId);
  data.sections = data.sections.filter((section) => section.bookId !== bookId);
  data.words = data.words.filter((word) => !sectionIds.includes(word.sectionId));
  data.studyRecords = data.studyRecords.filter((record) => !wordIds.includes(record.wordId));

  saveData(data);
}

/* =========================
   Sections
========================= */

export function addSection({ bookId, title }) {
  const data = getData();

  const sectionsInBook = data.sections.filter((section) => section.bookId === bookId);
  const maxOrder = sectionsInBook.reduce((max, section) => Math.max(max, section.order || 0), 0);

  const newSection = {
    id: generateId("section"),
    bookId,
    title: String(title || "").trim(),
    order: maxOrder + 1,
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  data.sections.push(newSection);
  saveData(data);
  return newSection;
}

export function updateSection(sectionId, patch = {}) {
  const data = getData();
  const target = data.sections.find((section) => section.id === sectionId);
  if (!target) return null;

  if (typeof patch.title === "string") {
    target.title = patch.title.trim();
  }

  if (typeof patch.order === "number") {
    target.order = patch.order;
  }

  target.updatedAt = nowISO();
  saveData(data);
  return target;
}

export function deleteSection(sectionId) {
  const data = getData();
  const wordIds = data.words.filter((word) => word.sectionId === sectionId).map((word) => word.id);

  data.sections = data.sections.filter((section) => section.id !== sectionId);
  data.words = data.words.filter((word) => word.sectionId !== sectionId);
  data.studyRecords = data.studyRecords.filter((record) => !wordIds.includes(record.wordId));

  saveData(data);
}

/* =========================
   Words
========================= */

export function parseMeanings(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(raw ?? "")
    .split(/[\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isDuplicateWordInSection({ sectionId, wordText, excludeWordId = null }) {
  const data = getData();
  const normalized = normalizeText(wordText);

  return data.words.some((word) => {
    if (word.sectionId !== sectionId) return false;
    if (excludeWordId && word.id === excludeWordId) return false;
    return normalizeText(word.word) === normalized;
  });
}

export function addWord({
  sectionId,
  word,
  headword,
  pos = "other",
  tone = "neutral",
  tags = [],
  meanings = [],
  primaryMeaningIndexes = []
}) {
  const data = getData();

  const newWord = migrateWord({
    id: generateId("word"),
    sectionId,
    word: String(word || "").trim(),
    headword: headword ? String(headword).trim() : normalizeText(word),
    pos,
    tone,
    tags: uniqueArray(tags),
    meanings: parseMeanings(meanings),
    primaryMeaningIndexes,
    createdAt: nowISO(),
    updatedAt: nowISO()
  });

  data.words.push(newWord);
  saveData(data);
  return newWord;
}

export function updateWord(wordId, patch = {}) {
  const data = getData();
  const target = data.words.find((word) => word.id === wordId);
  if (!target) return null;

  if (typeof patch.word === "string") {
    target.word = patch.word.trim();
  }

  if (typeof patch.headword === "string") {
    target.headword = patch.headword.trim();
  }

  if (typeof patch.pos === "string") {
    target.pos = patch.pos;
  }

  if (typeof patch.tone === "string") {
    target.tone = patch.tone;
  }

  if (patch.tags) {
    target.tags = uniqueArray(patch.tags);
  }

  if (patch.meanings) {
    target.meanings = parseMeanings(patch.meanings);
  }

  if (Array.isArray(patch.primaryMeaningIndexes)) {
    target.primaryMeaningIndexes = patch.primaryMeaningIndexes;
  }

  target.updatedAt = nowISO();
  saveData(data);
  return target;
}

export function deleteWord(wordId) {
  const data = getData();
  data.words = data.words.filter((word) => word.id !== wordId);
  data.studyRecords = data.studyRecords.filter((record) => record.wordId !== wordId);
  saveData(data);
}

export function getWordsBySection(sectionId) {
  return getData().words.filter((word) => word.sectionId === sectionId);
}

export function getWordById(wordId) {
  return getData().words.find((word) => word.id === wordId) || null;
}

/* =========================
   Study Records
========================= */

export function addStudyRecord({
  wordId,
  mode = "wordToMeaning",
  isCorrect = false,
  userAnswer = ""
}) {
  const data = getData();

  const newRecord = {
    id: generateId("record"),
    wordId,
    mode,
    isCorrect: !!isCorrect,
    userAnswer: String(userAnswer || ""),
    createdAt: nowISO()
  };

  data.studyRecords.push(newRecord);
  saveData(data);
  return newRecord;
}

export function getStudyRecordsByWord(wordId) {
  return getData().studyRecords.filter((record) => record.wordId === wordId);
}

export function getRecentStudyRecords(limit = 10) {
  return [...getData().studyRecords]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

export function getRecentAccuracy(limit = 10) {
  const recent = getRecentStudyRecords(limit);
  if (!recent.length) {
    return {
      total: 0,
      correct: 0,
      accuracy: 0
    };
  }

  const correct = recent.filter((record) => record.isCorrect).length;
  return {
    total: recent.length,
    correct,
    accuracy: Math.round((correct / recent.length) * 100)
  };
}
