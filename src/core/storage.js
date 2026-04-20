import { generateId, nowISO, normalizeText, uniqueArray } from './utils.js';
import { supabase, getCurrentUserId } from './supabase.js';

const STORAGE_KEY = 'vocaquest_app_data_v1';
const SCHEMA_VERSION = 1;

function createEmptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    lastUpdatedAt: nowISO(),
    books: [],
    sections: [],
    words: [],
    studyRecords: []
  };
}

function parseMeanings(raw) {
  if (Array.isArray(raw)) return uniqueArray(raw.map((v) => String(v).trim()).filter(Boolean));
  return uniqueArray(
    String(raw ?? '')
      .split(/\n+/)
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

function migrateWord(word) {
  return {
    id: word.id || generateId('word'),
    bookId: word.bookId || '',
    sectionId: word.sectionId || '',
    word: String(word.word || '').trim(),
    meanings: parseMeanings(word.meanings ?? word.meaning ?? ''),
    pos: word.pos || 'other',
    tone: word.tone || 'neutral',
    tags: Array.isArray(word.tags) ? uniqueArray(word.tags.map((v) => String(v).trim()).filter(Boolean)) : [],
    favorite: Boolean(word.favorite),
    example: String(word.example || '').trim(),
    memo: String(word.memo || '').trim(),
    createdAt: word.createdAt || nowISO(),
    updatedAt: word.updatedAt || nowISO()
  };
}

function migrateSection(section) {
  return {
    id: section.id || generateId('section'),
    bookId: section.bookId || '',
    title: String(section.title || '').trim(),
    order: Number.isFinite(section.order) ? section.order : 0,
    createdAt: section.createdAt || nowISO(),
    updatedAt: section.updatedAt || nowISO()
  };
}

function migrateBook(book) {
  return {
    id: book.id || generateId('book'),
    title: String(book.title || '').trim(),
    createdAt: book.createdAt || nowISO(),
    updatedAt: book.updatedAt || nowISO()
  };
}

function migrateStudyRecord(record) {
  return {
    id: record.id || generateId('record'),
    wordId: record.wordId || '',
    userAnswer: String(record.userAnswer || '').trim(),
    autoJudgedCorrect: Boolean(record.autoJudgedCorrect ?? record.correct),
    finalCorrect: Boolean(record.finalCorrect ?? record.correct),
    source: record.source || 'study',
    studiedAt: record.studiedAt || record.createdAt || nowISO()
  };
}

function enforceIntegrity(data) {
  const bookIds = new Set(data.books.map((item) => item.id));
  data.sections = data.sections.filter((item) => bookIds.has(item.bookId));
  const sectionIds = new Set(data.sections.map((item) => item.id));
  data.words = data.words.filter((item) => bookIds.has(item.bookId) && sectionIds.has(item.sectionId));
  const wordIds = new Set(data.words.map((item) => item.id));
  data.studyRecords = data.studyRecords.filter((item) => wordIds.has(item.wordId));
  return data;
}

function migrateData(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return enforceIntegrity({
    schemaVersion: SCHEMA_VERSION,
    lastUpdatedAt: source.lastUpdatedAt || nowISO(),
    books: (source.books || []).map(migrateBook),
    sections: (source.sections || []).map(migrateSection),
    words: (source.words || []).map(migrateWord),
    studyRecords: (source.studyRecords || []).map(migrateStudyRecord)
  });
}

let cache = null;
let pendingSave = null;

function persistLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  cache = data;
}

export function getData() {
  if (cache) return cache;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    cache = createEmptyData();
    return cache;
  }
  try {
    cache = migrateData(JSON.parse(raw));
  } catch {
    cache = createEmptyData();
  }
  return cache;
}

async function loadDefaultData() {
  const response = await fetch('./defaultBooks.json');
  if (!response.ok) throw new Error('defaultBooks.json load failed');
  const raw = await response.json();
  return migrateData(raw);
}

export async function loadCloudData() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_data')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('cloud load failed', error);
    return null;
  }

  if (!data?.data) return null;
  return migrateData(data.data);
}

export async function saveCloudData(data) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const payload = {
    user_id: userId,
    data,
    updated_at: nowISO()
  };
  const { error } = await supabase.from('user_data').upsert(payload, { onConflict: 'user_id' });
  if (error) console.warn('cloud save failed', error);
}

export function saveData(nextData, options = {}) {
  const migrated = migrateData(nextData);
  migrated.lastUpdatedAt = nowISO();
  persistLocal(migrated);

  if (!options.skipCloud) {
    if (pendingSave) clearTimeout(pendingSave);
    pendingSave = setTimeout(() => {
      saveCloudData(migrated);
      pendingSave = null;
    }, 250);
  }
  return migrated;
}

export async function initData() {
  const cloud = await loadCloudData();
  if (cloud) {
    persistLocal(cloud);
    return cloud;
  }
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return getData();
  try {
    const defaults = await loadDefaultData();
    return saveData(defaults);
  } catch {
    const empty = createEmptyData();
    persistLocal(empty);
    return empty;
  }
}

export function replaceData(rawData) {
  return saveData(rawData);
}

export function exportData() {
  return JSON.stringify(getData(), null, 2);
}

export function importData(rawText) {
  const parsed = JSON.parse(rawText);
  return saveData(parsed);
}

export function addBook(title) {
  const data = getData();
  const book = { id: generateId('book'), title: String(title).trim(), createdAt: nowISO(), updatedAt: nowISO() };
  data.books.push(book);
  return saveData(data);
}

export function deleteBook(bookId) {
  const data = getData();
  const sectionIds = data.sections.filter((s) => s.bookId === bookId).map((s) => s.id);
  const wordIds = data.words.filter((w) => w.bookId === bookId).map((w) => w.id);
  data.books = data.books.filter((b) => b.id !== bookId);
  data.sections = data.sections.filter((s) => s.bookId !== bookId);
  data.words = data.words.filter((w) => w.bookId !== bookId);
  data.studyRecords = data.studyRecords.filter((r) => !wordIds.includes(r.wordId));
  return saveData(data);
}

export function addSection(bookId, title) {
  const data = getData();
  const order = data.sections.filter((s) => s.bookId === bookId).length + 1;
  data.sections.push({ id: generateId('section'), bookId, title: String(title).trim(), order, createdAt: nowISO(), updatedAt: nowISO() });
  return saveData(data);
}

export function deleteSection(sectionId) {
  const data = getData();
  const wordIds = data.words.filter((w) => w.sectionId === sectionId).map((w) => w.id);
  data.sections = data.sections.filter((s) => s.id !== sectionId);
  data.words = data.words.filter((w) => w.sectionId !== sectionId);
  data.studyRecords = data.studyRecords.filter((r) => !wordIds.includes(r.wordId));
  return saveData(data);
}

export function isDuplicateWordInSection(sectionId, wordText, excludeWordId = null) {
  const target = normalizeText(wordText);
  return getData().words.some((word) => word.sectionId === sectionId && word.id !== excludeWordId && normalizeText(word.word) === target);
}

export function addWord(payload) {
  const data = getData();
  data.words.push({
    id: generateId('word'),
    bookId: payload.bookId,
    sectionId: payload.sectionId,
    word: String(payload.word).trim(),
    meanings: parseMeanings(payload.meanings),
    pos: payload.pos || 'other',
    tone: payload.tone || 'neutral',
    tags: Array.isArray(payload.tags) ? uniqueArray(payload.tags) : [],
    favorite: Boolean(payload.favorite),
    example: String(payload.example || '').trim(),
    memo: String(payload.memo || '').trim(),
    createdAt: nowISO(),
    updatedAt: nowISO()
  });
  return saveData(data);
}

export function updateWord(wordId, patch) {
  const data = getData();
  const target = data.words.find((word) => word.id === wordId);
  if (!target) return null;
  target.word = patch.word !== undefined ? String(patch.word).trim() : target.word;
  target.meanings = patch.meanings !== undefined ? parseMeanings(patch.meanings) : target.meanings;
  target.pos = patch.pos ?? target.pos;
  target.tone = patch.tone ?? target.tone;
  target.tags = patch.tags ? uniqueArray(patch.tags) : target.tags;
  target.favorite = typeof patch.favorite === 'boolean' ? patch.favorite : target.favorite;
  target.example = patch.example !== undefined ? String(patch.example).trim() : target.example;
  target.memo = patch.memo !== undefined ? String(patch.memo).trim() : target.memo;
  target.updatedAt = nowISO();
  saveData(data);
  return target;
}

export function deleteWord(wordId) {
  const data = getData();
  data.words = data.words.filter((word) => word.id !== wordId);
  data.studyRecords = data.studyRecords.filter((record) => record.wordId !== wordId);
  return saveData(data);
}

export function toggleFavorite(wordId) {
  const data = getData();
  const target = data.words.find((word) => word.id === wordId);
  if (!target) return false;
  target.favorite = !target.favorite;
  target.updatedAt = nowISO();
  saveData(data);
  return target.favorite;
}

export function getWordById(wordId) {
  return getData().words.find((word) => word.id === wordId) || null;
}

export function addStudyRecord(payload) {
  const data = getData();
  data.studyRecords.unshift({
    id: generateId('record'),
    wordId: payload.wordId,
    userAnswer: String(payload.userAnswer || '').trim(),
    autoJudgedCorrect: Boolean(payload.autoJudgedCorrect),
    finalCorrect: Boolean(payload.finalCorrect),
    source: payload.source || 'study',
    studiedAt: nowISO()
  });
  data.studyRecords = data.studyRecords.slice(0, 500);
  return saveData(data);
}

export function getSectionWords(sectionId) {
  return getData().words.filter((word) => word.sectionId === sectionId);
}

export function getWrongWordIdsBySection(sectionId) {
  const wordIds = new Set(getSectionWords(sectionId).map((word) => word.id));
  const wrong = new Set();
  getData().studyRecords.forEach((record) => {
    if (wordIds.has(record.wordId) && !record.finalCorrect) wrong.add(record.wordId);
  });
  return [...wrong];
}

export function clearWrongNoteByWord(wordId) {
  const data = getData();
  data.studyRecords = data.studyRecords.filter((record) => !(record.wordId === wordId && !record.finalCorrect));
  return saveData(data);
}

export function getWrongNoteEntriesBySection(sectionId) {
  const words = getSectionWords(sectionId);
  const wordMap = new Map(words.map((word) => [word.id, word]));
  const grouped = new Map();
  getData().studyRecords.forEach((record) => {
    if (!wordMap.has(record.wordId) || record.finalCorrect) return;
    if (!grouped.has(record.wordId)) grouped.set(record.wordId, []);
    grouped.get(record.wordId).push(record);
  });
  return [...grouped.entries()].map(([wordId, records]) => ({ word: wordMap.get(wordId), records }));
}

export function getRecentStudyRecords(limit = 10) {
  const wordMap = new Map(getData().words.map((word) => [word.id, word]));
  return getData().studyRecords.slice(0, limit).map((record) => ({ ...record, word: wordMap.get(record.wordId) || null }));
}

export function getRecentStudyStats(limit = 10) {
  const records = getData().studyRecords.slice(0, limit);
  const total = records.length;
  const correct = records.filter((item) => item.finalCorrect).length;
  return { total, correct, wrong: total - correct, accuracy: total ? Math.round((correct / total) * 100) : 0 };
}

export function getStudyStatsBySection(sectionId) {
  const sectionWordIds = new Set(getSectionWords(sectionId).map((word) => word.id));
  const records = getData().studyRecords.filter((record) => sectionWordIds.has(record.wordId));
  const total = records.length;
  const correct = records.filter((record) => record.finalCorrect).length;
  return { total, correct, wrong: total - correct, accuracy: total ? Math.round((correct / total) * 100) : 0 };
}

export function getSectionDifficulty(sectionId) {
  const { total, accuracy } = getStudyStatsBySection(sectionId);
  if (!total) return { label: '분석 전', tone: 'easy' };
  if (accuracy >= 85) return { label: '쉬움', tone: 'easy' };
  if (accuracy >= 60) return { label: '보통', tone: 'normal' };
  return { label: '어려움', tone: 'hard' };
}

export function getStorageSummary() {
  const data = getData();
  return {
    lastUpdatedAt: data.lastUpdatedAt,
    bookCount: data.books.length,
    sectionCount: data.sections.length,
    wordCount: data.words.length,
    recordCount: data.studyRecords.length,
    favoriteCount: data.words.filter((word) => word.favorite).length
  };
}
