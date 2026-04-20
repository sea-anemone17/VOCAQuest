import { exportData, importData } from './src/core/storage.js';

export function downloadBackup() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vocaquest-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreBackup(file) {
  return file.text().then((text) => importData(text));
}
