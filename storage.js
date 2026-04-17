import { generateId, nowISO, normalizeText } from "./utils.js";
import { supabase, getCurrentUserId } from "./supabase.js";

const STORAGE_KEY = "word_trpg_data";
const CURRENT_SCHEMA_VERSION = 4;

const LEGACY_KEYS = [
  "word_trpg_data_v3",
  "word_trpg_data_v2",
  "word_trpg_data_v1"
];

const ARCHIVE_EDIT_TARGET_KEY = "word_trpg_archive_edit_target";

function createEmptyData() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastUpdatedAt: nowISO(),
    books: [],
    sections: [],
    words: [],
    studyRecords: []
  };
}

async function loadCloudData() {
  const userId = await getCurrentUserId();

  if (!userId) return null;

  const { data } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.data ?? null;
}

async function saveCloudData(appData) {
  const userId = await getCurrentUserId();

  if (!userId) {
    console.log("로그인 안됨");
    return;
  }

  const payload = {
    user_id: userId,
    data: appData,
    updated_at: nowISO()
  };

  await supabase.from("user_data").delete().eq("user_id", userId);
  await supabase.from("user_data").insert(payload);
}
/* =========================
   🔧 MIGRATION
========================= */

function migrateWord(word) {
  const next = { ...word };

  if (!Array.isArray(next.meanings)) {
    if (typeof next.meaning === "string") {
      next.meanings = next.meaning
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    } else {
      next.meanings = [];
    }
  }

  if (!Array.isArray(next.tags)) {
    next.tags =
      typeof next.tags === "string" && next.tags.trim()
        ? [next.tags.trim()]
        : [];
  }

  if (typeof next.favorite !== "boolean") {
    next.favorite = false;
  }

  delete next.meaning;
  return next;
}

function migrateRecord(record) {
  const next = { ...record };

  if (typeof next.autoJudgedCorrect !== "boolean") {
    next.autoJudgedCorrect = Boolean(next.correct);
  }

  if (typeof next.finalCorrect !== "boolean") {
    next.finalCorrect = Boolean(next.correct);
  }

  delete next.correct;
  return next;
}

/* =========================
   🔒 DATA INTEGRITY
========================= */

function enforceIntegrity(data) {
  const bookIds = new Set(data.books.map((b) => b.id));
  const sectionIds = new Set(data.sections.map((s) => s.id));

  data.sections = data.sections.filter((s) => bookIds.has(s.bookId));

  data.words = data.words.filter(
    (w) => bookIds.has(w.bookId) && sectionIds.has(w.sectionId)
  );

  const wordIds = new Set(data.words.map((w) => w.id));

  data.studyRecords = data.studyRecords.filter((r) =>
    wordIds.has(r.wordId)
  );

  return data;
}

function migrateData(rawData) {
  const migrated = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastUpdatedAt: rawData.lastUpdatedAt || nowISO(),
    books: (rawData.books || []).map((b) => ({ ...b })),
    sections: (rawData.sections || []).map((s) => ({ ...s })),
    words: (rawData.words || []).map(migrateWord),
    studyRecords: (rawData.studyRecords || []).map(migrateRecord)
  };

  return enforceIntegrity(migrated);
}

/* =========================
   📦 CORE STORAGE
========================= */

export function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyData();

  try {
    return migrateData(JSON.parse(raw));
  } catch (e) {
    console.error("데이터 파싱 실패:", e);
    return createEmptyData();
  }
}

export function saveData(data) {
  const safe = migrateData(data);
  safe.lastUpdatedAt = nowISO();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));

  saveCloudData(safe);
}

export function replaceData(newData) {
  const migrated = migrateData(newData);
  saveData(migrated);
  return migrated;
}

/* =========================
   🔄 INIT
========================= */

function tryMigrateLegacyKeys() {
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const migrated = migrateData(JSON.parse(raw));
      saveData(migrated);
      return migrated;
    } catch (e) {
      console.warn(`레거시 마이그레이션 실패: ${key}`, e);
    }
  }
  return null;
}

export async function initData() {
  const cloud = await loadCloudData();
  if (cloud) {
    const migrated = migrateData(cloud);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const data = getData();
    saveData(data);
    return data;
  }

  const legacy = tryMigrateLegacyKeys();
  if (legacy) return legacy;

  try {
    const res = await fetch("./defaultBooks.json");
    if (!res.ok) throw new Error();
    const migrated = migrateData(await res.json());
    saveData(migrated);
    return migrated;
  } catch {
    const empty = createEmptyData();
    saveData(empty);
    return empty;
  }
}

/* =========================
   📚 BOOK / SECTION
========================= */

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

  const wordIds = data.words
    .filter((w) => w.bookId === bookId)
    .map((w) => w.id);

  data.books = data.books.filter((b) => b.id !== bookId);
  data.sections = data.sections.filter((s) => s.bookId !== bookId);
  data.words = data.words.filter((w) => w.bookId !== bookId);
  data.studyRecords = data.studyRecords.filter(
    (r) => !wordIds.includes(r.wordId)
  );

  saveData(data);
}

export function addSection(bookId, title) {
  const data = getData();

  const section = {
    id: generateId("section"),
    bookId,
    title: title.trim(),
    order:
      data.sections.filter((s) => s.bookId === bookId).length + 1
  };

  data.sections.push(section);
  saveData(data);
  return section;
}

export function deleteSection(sectionId) {
  const data = getData();

  const wordIds = data.words
    .filter((w) => w.sectionId === sectionId)
    .map((w) => w.id);

  data.sections = data.sections.filter((s) => s.id !== sectionId);
  data.words = data.words.filter((w) => w.sectionId !== sectionId);
  data.studyRecords = data.studyRecords.filter(
    (r) => !wordIds.includes(r.wordId)
  );

  saveData(data);
}

/* =========================
   🧠 WORD
========================= */

export function addWord(wordData) {
  const data = getData();

  const word = {
    id: generateId("word"),
    bookId: wordData.bookId,
    sectionId: wordData.sectionId,
    word: wordData.word.trim(),
    meanings: wordData.meanings || [],
    pos: wordData.pos,
    tone: wordData.tone,
    tags: wordData.tags || [],
    favorite: Boolean(wordData.favorite),
    example: wordData.example?.trim() || "",
    memo: wordData.memo?.trim() || "",
    createdAt: nowISO()
  };

  data.words.push(word);
  saveData(data);
  return word;
}

export function deleteWord(wordId) {
  const data = getData();
  data.words = data.words.filter((w) => w.id !== wordId);
  data.studyRecords = data.studyRecords.filter(
    (r) => r.wordId !== wordId
  );
  saveData(data);
}

/* =========================
   📊 STUDY
========================= */

export function addStudyRecord(recordData) {
  const data = getData();

  const newRecord = {
    id: generateId("record"),
    wordId: recordData.wordId,
    userAnswer: recordData.userAnswer || "",
    autoJudgedCorrect: Boolean(recordData.autoJudgedCorrect),
    finalCorrect: Boolean(recordData.finalCorrect),
    studiedAt: nowISO()
  };

  data.studyRecords.push(newRecord);
  data.studyRecords = data.studyRecords
    .sort((a, b) => new Date(b.studiedAt) - new Date(a.studiedAt))
    .slice(0, 10);

  saveData(data);
}

/* =========================
   ❌ WRONG NOTE (핵심)
========================= */

function getLatestRecord(records) {
  return records
    .sort((a, b) => new Date(b.studiedAt) - new Date(a.studiedAt))[0];
}

export function clearWrongNoteByWord(wordId) {
  const data = getData();

  data.studyRecords = data.studyRecords.filter(
    (r) => r.wordId !== wordId || r.finalCorrect
  );

  saveData(data);
}

export function getWrongWordIdsBySection(sectionId) {
  const data = getData();

  return data.words
    .filter((w) => w.sectionId === sectionId)
    .filter((word) => {
      const records = data.studyRecords.filter(
        (r) => r.wordId === word.id
      );
      const latest = getLatestRecord(records);
      return latest ? !latest.finalCorrect : false;
    })
    .map((w) => w.id);
}

export function getWrongNoteEntriesBySection(sectionId) {
  const data = getData();

  return data.words
    .filter((w) => w.sectionId === sectionId)
    .map((word) => {
      const records = data.studyRecords.filter(
        (r) => r.wordId === word.id
      );

      const latest = getLatestRecord(records);

      return {
        ...word,
        wrongCount: records.filter((r) => !r.finalCorrect).length,
        correctCount: records.filter((r) => r.finalCorrect).length,
        totalCount: records.length,
        latestWrong: latest ? !latest.finalCorrect : false
      };
    })
    .filter((w) => w.latestWrong)
    .sort((a, b) => b.wrongCount - a.wrongCount);
}

export function getRecentStudyStats(sectionId = null) {
  const data = getData();

  let records = [...data.studyRecords];

  if (sectionId) {
    const wordIds = new Set(
      data.words
        .filter((word) => word.sectionId === sectionId)
        .map((word) => word.id)
    );

    records = records.filter((record) =>
      wordIds.has(record.wordId)
    );
  }

  const total = records.length;
  const correct = records.filter((r) => r.finalCorrect).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  return {
    total,
    correct,
    wrong: total - correct,
    accuracy
  };
}

export function isDuplicateWordInSection(sectionId, wordText, pos, excludeWordId = null) {
  const data = getData();
  const targetWord = normalizeText(wordText);
  const targetPos = pos?.trim();

  return data.words.some((word) => {
    if (word.sectionId !== sectionId) return false;
    if (excludeWordId && word.id === excludeWordId) return false;

    return normalizeText(word.word) === targetWord && word.pos === targetPos;
  });
}

export function parseMeanings(inputText) {
  return [
    ...new Set(
      inputText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
  ];
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
  target.favorite =
    typeof patch.favorite === "boolean" ? patch.favorite : target.favorite;
  target.example = patch.example?.trim() ?? target.example;
  target.memo = patch.memo?.trim() ?? target.memo;

  saveData(data);
  return target;
}

export function toggleFavorite(wordId) {
  const data = getData();
  const target = data.words.find((word) => word.id === wordId);
  if (!target) return null;

  target.favorite = !target.favorite;
  saveData(data);
  return target.favorite;
}

export function getWordById(wordId) {
  const data = getData();
  return data.words.find((word) => word.id === wordId) || null;
}

export function consumeArchiveEditTarget() {
  const target = sessionStorage.getItem(ARCHIVE_EDIT_TARGET_KEY);
  sessionStorage.removeItem(ARCHIVE_EDIT_TARGET_KEY);
  return target;
}

export function getStorageSummary() {
  const data = getData();
  return {
    schemaVersion: data.schemaVersion || CURRENT_SCHEMA_VERSION,
    lastUpdatedAt: data.lastUpdatedAt || null,
    bookCount: data.books.length,
    sectionCount: data.sections.length,
    wordCount: data.words.length,
    recordCount: data.studyRecords.length,
    favoriteCount: data.words.filter((word) => word.favorite).length
  };
}

export function getStudyStatsBySection(sectionId) {
  const data = getData();
  const wordIdsInSection = new Set(
    data.words
      .filter((word) => word.sectionId === sectionId)
      .map((word) => word.id)
  );

  const records = data.studyRecords.filter((record) =>
    wordIdsInSection.has(record.wordId)
  );

  const total = records.length;
  const correct = records.filter((record) => record.finalCorrect).length;
  const wrong = total - correct;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  return { total, correct, wrong, accuracy };
}

export function getRecentStudyRecords(limit = 10, sectionId = null) {
  const data = getData();

  let records = [...data.studyRecords].sort(
    (a, b) => new Date(b.studiedAt).getTime() - new Date(a.studiedAt).getTime()
  );

  if (sectionId) {
    const wordIds = new Set(
      data.words
        .filter((word) => word.sectionId === sectionId)
        .map((word) => word.id)
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
