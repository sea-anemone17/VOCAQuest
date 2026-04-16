import { generateId, nowISO, normalizeText } from "./utils.js";

const STORAGE_KEY = "word_trpg_data_v2";

function createEmptyData() {
  return {
    books: [],
    sections: [],
    words: [],
    studyRecords: []
  };
}

export function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyData();
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      books: parsed.books || [],
      sections: parsed.sections || [],
      words: parsed.words || [],
      studyRecords: parsed.studyRecords || []
    };
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
    return existing;
  }

  try {
    const response = await fetch("./data/defaultBooks.json");
    if (!response.ok) {
      throw new Error("기본 데이터 로드 실패");
    }
    const defaultData = await response.json();
    saveData(defaultData);
    return defaultData;
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

export function addWord(wordData) {
  const data = getData();

  const word = {
    id: generateId("word"),
    bookId: wordData.bookId,
    sectionId: wordData.sectionId,
    word: wordData.word.trim(),
    meaning: wordData.meaning.trim(),
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
  target.meaning = patch.meaning?.trim() ?? target.meaning;
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
    correct: Boolean(recordData.correct),
    userAnswer: recordData.userAnswer || "",
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
    .filter((record) => !record.correct && wordIdsInSection.has(record.wordId))
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
  const correct = records.filter((record) => record.correct).length;
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
      const wrongCount = records.filter((record) => !record.correct).length;
      const correctCount = records.filter((record) => record.correct).length;

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
