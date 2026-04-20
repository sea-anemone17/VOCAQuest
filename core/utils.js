export function generateId(prefix = 'id') {
  const seed = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${seed}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function normalizeText(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function shuffleArray(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function uniqueArray(values = []) {
  return [...new Set(values.filter(Boolean))];
}
