import { getData, replaceData } from "./storage.js";

function makeBackupFilename() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `word-trpg-backup-${yyyy}${mm}${dd}-${hh}${mi}.json`;
}

export function exportBackup() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = makeBackupFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    };

    reader.readAsText(file, "utf-8");
  });
}

function validateBackupShape(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("백업 파일 형식이 올바르지 않습니다.");
  }

  const hasBooks = Array.isArray(parsed.books);
  const hasSections = Array.isArray(parsed.sections);
  const hasWords = Array.isArray(parsed.words);
  const hasStudyRecords = Array.isArray(parsed.studyRecords);

  if (!hasBooks || !hasSections || !hasWords || !hasStudyRecords) {
    throw new Error("백업 파일에 필요한 데이터가 없습니다.");
  }
}

export async function importBackupFile(file) {
  const text = await readFileAsText(file);
  const parsed = JSON.parse(text);
  validateBackupShape(parsed);
  replaceData(parsed);
  return true;
}
