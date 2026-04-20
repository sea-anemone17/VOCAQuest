import { generateId, nowISO, normalizeText, uniqueArray } from './utils.js';
import { supabase, getCurrentUserId } from './supabase.js';

const STORAGE_KEY = 'vocaquest_app_data_v1';
const SCHEMA_VERSION = 2;

/* =========================
   Core shape
========================= */

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

/* =========================
   Basic normalizers
========================= */

function parseMeanings(raw) {
  if (Array.isArray(raw)) {
    return uniqueArray(
      raw.map((v) => String(v).trim()).filter(Boolean)
    );
  }

  return uniqueArray(
    String(raw ?? '')
      .split(/\n+/)
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

function parseTags(raw) {
  if (!Array.isArray(raw)) return [];
  return uniqueArray(raw.map((v) => String(v).trim()).filter(Boolean));
}

function normalizeEntry(entry = {}) {
  return {
    id: entry.id || generateId('entry'),
    pos: entry.pos || 'other',
    meanings: parseMeanings(entry.meanings ?? entry.meaning ?? ''),
    tone: entry.tone || 'neutral',
    tags: parseTags(entry.tags),
    example: String(entry.example || '').trim(),
    memo: String(entry.memo || '').trim(),
    createdAt: entry.createdAt || nowISO(),
    updatedAt: entry.updatedAt || nowISO()
  };
}

function applyCompatibilityFields(word) {
  const firstEntry = Array.isArray(word.entries) && word.entries.length
    ? word.entries[0]
    : normalizeEntry({});

  return {
    ...word,

    // 기존 코드 호환용
    word: word.headword,
    meanings: firstEntry.meanings,
    pos: firstEntry.pos,
    tone: firstEntry.tone,
    tags: firstEntry.tags,
    example: firstEntry.example,
    memo: firstEntry.memo
  };
}

/* =========================
   Word migration
========================= */

function migrateWord(rawWord) {
  // 이미 새 구조인 경우
  if (Array.isArray(rawWord.entries)) {
    const headword = String(rawWord.headword ?? rawWord.word ?? '').trim();
    const entries = rawWord.entries
      .map(normalizeEntry)
      .filter((entry) => entry.meanings.length > 0 || entry.example || entry.memo);

    const migrated = {
      id: rawWord.id || generateId('word'),
      bookId: rawWord.bookId || '',
      sectionId: rawWord.sectionId || '',
      headword,
      normalizedWord: normalizeText(headword),
      entries,
      favorite: Boolean(rawWord.favorite),
      createdAt: rawWord.createdAt || nowISO(),
      updatedAt: rawWord.updatedAt || nowISO()
    };

    return applyCompatibilityFields(migrated);
  }

  // 구 구조(품사별로 단어 하나씩 저장)인 경우 → entry 1개짜리 word로 변환
  const headword = String(rawWord.word ?? rawWord.headword ?? '').trim();
  const singleEntry = normalizeEntry({
    id: rawWord.entryId,
    pos: rawWord.pos,
    meanings: rawWord.meanings ?? rawWord.meaning ?? '',
    tone: rawWord.tone,
    tags: rawWord.tags,
    example: rawWord.example,
    memo: rawWord.memo,
    createdAt: rawWord.createdAt,
    updatedAt: rawWord.updatedAt
  });

  const migrated = {
    id: rawWord.id || generateId('word'),
    bookId: rawWord.bookId || '',
    sectionId: rawWord.sectionId || '',
    headword,
    normalizedWord: normalizeText(headword),
    entries: [singleEntry],
    favorite: Boolean(rawWord.favorite),
    createdAt: rawWord.createdAt || nowISO(),
    updatedAt: rawWord.updatedAt || nowISO()
  };

  return applyCompatibilityFields(migrated);
}

function mergeEntries(entries) {
  const grouped = new Map();

  for (const rawEntry of entries) {
    const entry = normalizeEntry(rawEntry);
    const key = entry.pos;

    if (!grouped.has(key)) {
      grouped.set(key, entry);
      continue;
    }

    const prev = grouped.get(key);
    grouped.set(key, {
      ...prev,
      meanings: uniqueArray([...prev.meanings, ...entry.meanings]),
      tags: uniqueArray([...prev.tags, ...entry.tags]),
      tone: prev.tone || entry.tone || 'neutral',
      example: prev.example || entry.example,
      memo: prev.memo || entry.memo,
      updatedAt: nowISO()
    });
  }

  return [...grouped.values()];
}

function groupMigratedWords(words) {
  const grouped = new Map();

  for (const rawWord of words) {
    const word = migrateWord(rawWord);
    const key = `${word.bookId}::${word.sectionId}::${word.normalizedWord}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...word,
        entries: mergeEntries(word.entries)
      });
      continue;
    }

    const prev = grouped.get(key);
    grouped.set(key, applyCompatibilityFields({
      ...prev,
      favorite: prev.favorite || word.favorite,
      entries: mergeEntries([...prev.entries, ...word.entries]),
      updatedAt: nowISO()
    }));
  }

  return [...grouped.values()].map(applyCompatibilityFields);
}

/* =========================
   Other migrations
========================= */

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

function buildLegacyWordIdToEntryIdMap(words) {
  const map = new Map();

  words.forEach((word) => {
    if (!Array.isArray(word.entries) || !word.entries.length) return;
    map.set(word.id, word.entries[0].id);
  });

  return map;
}

function migrateStudyRecord(record, legacyMap = new Map()) {
  const fallbackEntryId = legacyMap.get(record.wordId) || '';

  return {
    id: record.id || generateId('record'),
    wordId: record.wordId || '',
    entryId: record.entryId || fallbackEntryId,
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

  data.words = data.words
    .filter((item) => bookIds.has(item.bookId) && sectionIds.has(item.sectionId))
    .map((word) => {
      const entries = Array.isArray(word.entries) ? word.entries.map(normalizeEntry) : [];
      const filteredEntries = entries.filter(
        (entry) => entry.meanings.length > 0 || entry.example || entry.memo
      );

      return applyCompatibilityFields({
        ...word,
        headword: String(word.headword ?? word.word ?? '').trim(),
        normalizedWord: normalizeText(word.headword ?? word.word ?? ''),
        entries: mergeEntries(filteredEntries),
        favorite: Boolean(word.favorite),
        createdAt: word.createdAt || nowISO(),
        updatedAt: word.updatedAt || nowISO()
      });
    })
    .filter((word) => word.headword && word.entries.length > 0);

  const wordIds = new Set(data.words.map((item) => item.id));
  const entryIds = new Set(
    data.words.flatMap((word) => word.entries.map((entry) => entry.id))
  );

  data.studyRecords = data.studyRecords.filter(
    (item) => wordIds.has(item.wordId) && entryIds.has(item.entryId)
  );

  return data;
}

function migrateData(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};

  const books = (source.books || []).map(migrateBook);
  const sections = (source.sections || []).map(migrateSection);
  const words = groupMigratedWords(source.words || []);

  const legacyMap = buildLegacyWordIdToEntryIdMap(words);
  const studyRecords = (source.studyRecords || []).map((record) =>
    migrateStudyRecord(record, legacyMap)
  );

  return enforceIntegrity({
    schemaVersion: SCHEMA_VERSION,
    lastUpdatedAt: source.lastUpdatedAt || nowISO(),
    books,
    sections,
    words,
    studyRecords
  });
}

/* =========================
   Cache / persistence
========================= */

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

  const { error } = await supabase
    .from('user_data')
    .upsert(payload, { onConflict: 'user_id' });

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

/* =========================
   Books / sections
========================= */

export function addBook(title) {
  const data = getData();

  const book = {
    id: generateId('book'),
    title: String(title).trim(),
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  data.books.push(book);
  return saveData(data);
}

export function deleteBook(bookId) {
  const data = getData();
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

  data.sections.push({
    id: generateId('section'),
    bookId,
    title: String(title).trim(),
    order,
    createdAt: nowISO(),
    updatedAt: nowISO()
  });

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

/* =========================
   Word helpers
========================= */

export function getWordById(wordId) {
  const word = getData().words.find((item) => item.id === wordId) || null;
  return word ? applyCompatibilityFields(word) : null;
}

export function getEntryById(entryId) {
  for (const word of getData().words) {
    const entry = word.entries.find((item) => item.id === entryId);
    if (entry) {
      return {
        word: applyCompatibilityFields(word),
        entry
      };
    }
  }
  return null;
}

export function flattenEntries(words = []) {
  return words.flatMap((word) =>
    word.entries.map((entry) => ({
      wordId: word.id,
      entryId: entry.id,
      headword: word.headword,
      word: word.headword, // 호환
      favorite: word.favorite,
      bookId: word.bookId,
      sectionId: word.sectionId,
      pos: entry.pos,
      meanings: entry.meanings,
      tone: entry.tone,
      tags: entry.tags,
      example: entry.example,
      memo: entry.memo,
      entry,
      parentWord: applyCompatibilityFields(word)
    }))
  );
}

export function getSectionWords(sectionId) {
  return getData().words
    .filter((word) => word.sectionId === sectionId)
    .map(applyCompatibilityFields);
}

export function getSectionEntries(sectionId) {
  const words = getData().words.filter((word) => word.sectionId === sectionId);
  return flattenEntries(words);
}

export function isDuplicateWordInSection(sectionId, wordText, excludeWordId = null) {
  const target = normalizeText(wordText);

  return getData().words.some(
    (word) =>
      word.sectionId === sectionId &&
      word.id !== excludeWordId &&
      normalizeText(word.headword) === target
  );
}

/* =========================
   Word CRUD
========================= */

export function addWord(payload) {
  const data = getData();

  const headword = String(payload.headword ?? payload.word ?? '').trim();

  const entries = Array.isArray(payload.entries) && payload.entries.length
    ? payload.entries.map(normalizeEntry)
    : [
        normalizeEntry({
          pos: payload.pos,
          meanings: payload.meanings,
          tone: payload.tone,
          tags: payload.tags,
          example: payload.example,
          memo: payload.memo
        })
      ];

  const word = applyCompatibilityFields({
    id: generateId('word'),
    bookId: payload.bookId,
    sectionId: payload.sectionId,
    headword,
    normalizedWord: normalizeText(headword),
    entries: mergeEntries(entries),
    favorite: Boolean(payload.favorite),
    createdAt: nowISO(),
    updatedAt: nowISO()
  });

  data.words.push(word);
  return saveData(data);
}

export function updateWord(wordId, patch) {
  const data = getData();
  const target = data.words.find((word) => word.id === wordId);
  if (!target) return null;

  const nextHeadword = patch.headword !== undefined || patch.word !== undefined
    ? String(patch.headword ?? patch.word ?? '').trim()
    : target.headword;

  let nextEntries = target.entries;

  if (Array.isArray(patch.entries)) {
    nextEntries = mergeEntries(patch.entries.map(normalizeEntry));
  } else if (
    patch.meanings !== undefined ||
    patch.pos !== undefined ||
    patch.tone !== undefined ||
    patch.tags !== undefined ||
    patch.example !== undefined ||
    patch.memo !== undefined
  ) {
    const first = normalizeEntry({
      ...(target.entries[0] || {}),
      pos: patch.pos ?? target.entries[0]?.pos,
      meanings: patch.meanings ?? target.entries[0]?.meanings,
      tone: patch.tone ?? target.entries[0]?.tone,
      tags: patch.tags ?? target.entries[0]?.tags,
      example: patch.example ?? target.entries[0]?.example,
      memo: patch.memo ?? target.entries[0]?.memo
    });

    nextEntries = [first, ...target.entries.slice(1)];
  }

  const updated = applyCompatibilityFields({
    ...target,
    headword: nextHeadword,
    normalizedWord: normalizeText(nextHeadword),
    entries: mergeEntries(nextEntries),
    favorite: typeof patch.favorite === 'boolean' ? patch.favorite : target.favorite,
    updatedAt: nowISO()
  });

  Object.assign(target, updated);
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

/* =========================
   Study records
========================= */

export function addStudyRecord(payload) {
  const data = getData();
  const word = data.words.find((item) => item.id === payload.wordId);
  if (!word) return saveData(data);

  const entryId = payload.entryId || word.entries[0]?.id || '';
  if (!entryId) return saveData(data);

  data.studyRecords.unshift({
    id: generateId('record'),
    wordId: payload.wordId,
    entryId,
    userAnswer: String(payload.userAnswer || '').trim(),
    autoJudgedCorrect: Boolean(payload.autoJudgedCorrect),
    finalCorrect: Boolean(payload.finalCorrect),
    source: payload.source || 'study',
    studiedAt: nowISO()
  });

  data.studyRecords = data.studyRecords.slice(0, 500);
  return saveData(data);
}

export function getWrongWordIdsBySection(sectionId) {
  const wordIds = new Set(getSectionWords(sectionId).map((word) => word.id));
  const wrong = new Set();

  getData().studyRecords.forEach((record) => {
    if (wordIds.has(record.wordId) && !record.finalCorrect) {
      wrong.add(record.wordId);
    }
  });

  return [...wrong];
}

export function getWrongEntryIdsBySection(sectionId) {
  const entryIds = new Set(getSectionEntries(sectionId).map((item) => item.entryId));
  const wrong = new Set();

  getData().studyRecords.forEach((record) => {
    if (entryIds.has(record.entryId) && !record.finalCorrect) {
      wrong.add(record.entryId);
    }
  });

  return [...wrong];
}

export function clearWrongNoteByWord(wordId) {
  const data = getData();
  data.studyRecords = data.studyRecords.filter(
    (record) => !(record.wordId === wordId && !record.finalCorrect)
  );
  return saveData(data);
}

export function clearWrongNoteByEntry(entryId) {
  const data = getData();
  data.studyRecords = data.studyRecords.filter(
    (record) => !(record.entryId === entryId && !record.finalCorrect)
  );
  return saveData(data);
}

export function getWrongNoteEntriesBySection(sectionId) {
  const entries = getSectionEntries(sectionId);
  const entryMap = new Map(entries.map((item) => [item.entryId, item]));
  const grouped = new Map();

  getData().studyRecords.forEach((record) => {
    if (!entryMap.has(record.entryId) || record.finalCorrect) return;

    if (!grouped.has(record.entryId)) {
      grouped.set(record.entryId, []);
    }

    grouped.get(record.entryId).push(record);
  });

  return [...grouped.entries()].map(([entryId, records]) => {
    const entryInfo = entryMap.get(entryId);

    return {
      word: entryInfo.parentWord,
      entry: entryInfo.entry,
      flattened: entryInfo,
      records
    };
  });
}

export function getRecentStudyRecords(limit = 10) {
  const words = getData().words;
  const wordMap = new Map(words.map((word) => [word.id, applyCompatibilityFields(word)]));
  const entryMap = new Map(
    flattenEntries(words).map((item) => [item.entryId, item])
  );

  return getData()
    .studyRecords
    .slice(0, limit)
    .map((record) => ({
      ...record,
      word: wordMap.get(record.wordId) || null,
      entry: entryMap.get(record.entryId)?.entry || null,
      flattened: entryMap.get(record.entryId) || null
    }));
}

export function getRecentStudyStats(limit = 10) {
  const records = getData().studyRecords.slice(0, limit);
  const total = records.length;
  const correct = records.filter((item) => item.finalCorrect).length;

  return {
    total,
    correct,
    wrong: total - correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0
  };
}

export function getStudyStatsBySection(sectionId) {
  const sectionEntryIds = new Set(getSectionEntries(sectionId).map((item) => item.entryId));

  const records = getData().studyRecords.filter((record) =>
    sectionEntryIds.has(record.entryId)
  );

  const total = records.length;
  const correct = records.filter((record) => record.finalCorrect).length;

  return {
    total,
    correct,
    wrong: total - correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0
  };
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
    entryCount: data.words.reduce((sum, word) => sum + word.entries.length, 0),
    recordCount: data.studyRecords.length,
    favoriteCount: data.words.filter((word) => word.favorite).length
  };
}
