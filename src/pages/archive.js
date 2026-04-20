import {
  initData,
  getData,
  addBook,
  deleteBook,
  addSection,
  deleteSection,
  addWord,
  updateWord,
  deleteWord,
  toggleFavorite,
  isDuplicateWordInSection,
  getStorageSummary
} from '../core/storage.js';
import { getCurrentUser } from '../core/supabase.js';
import { POS_OPTIONS, TAG_OPTIONS, TONE_OPTIONS, getPosLabel, getTagLabel, getToneLabel } from '../core/tags.js';
import { escapeHtml, formatDateTime } from '../core/utils.js';

let selectedBookId = null;
let selectedSectionId = null;
let editingWordId = null;

const authGuard = document.getElementById('auth-guard');
const app = document.getElementById('archive-app');
const bookList = document.getElementById('bookList');
const sectionList = document.getElementById('sectionList');
const wordList = document.getElementById('wordList');
const bookTitleInput = document.getElementById('bookTitleInput');
const sectionTitleInput = document.getElementById('sectionTitleInput');
const selectedBookInfo = document.getElementById('selectedBookInfo');
const selectedSectionInfo = document.getElementById('selectedSectionInfo');
const wordForm = document.getElementById('wordForm');
const wordSearchInput = document.getElementById('wordSearchInput');
const wordFilterFavorite = document.getElementById('wordFilterFavorite');
const wordInput = document.getElementById('wordInput');
const meaningsInput = document.getElementById('meaningsInput');
const posSelect = document.getElementById('posSelect');
const toneSelect = document.getElementById('toneSelect');
const tagSelect = document.getElementById('tagSelect');
const exampleInput = document.getElementById('exampleInput');
const memoInput = document.getElementById('memoInput');
const cancelEditBtn = document.getElementById('cancelEditBtn');

function ensureSelection() {
  const data = getData();
  if (!selectedBookId) selectedBookId = data.books[0]?.id || null;
  if (!data.books.some((book) => book.id === selectedBookId)) selectedBookId = data.books[0]?.id || null;
  const sections = data.sections.filter((section) => section.bookId === selectedBookId).sort((a,b)=>a.order-b.order);
  if (!selectedSectionId) selectedSectionId = sections[0]?.id || null;
  if (!sections.some((section) => section.id === selectedSectionId)) selectedSectionId = sections[0]?.id || null;
}

function renderOptions() {
  posSelect.innerHTML = POS_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
  toneSelect.innerHTML = TONE_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
  tagSelect.innerHTML = `<option value="">선택 안 함</option>` + TAG_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
}

function renderBooks() {
  const data = getData();
  if (!data.books.length) {
    bookList.innerHTML = `<div class="empty-state">아직 책이 없습니다.</div>`;
    return;
  }
  bookList.innerHTML = data.books.map((book) => {
    const sectionCount = data.sections.filter((section) => section.bookId === book.id).length;
    const wordCount = data.words.filter((word) => word.bookId === book.id).length;
    return `<div class="list-item">
      <strong>${escapeHtml(book.title)}</strong>
      <div class="muted small-note">섹션 ${sectionCount}개 · 단어 ${wordCount}개</div>
      <div class="small-actions">
        <button class="button ${book.id === selectedBookId ? 'primary' : ''}" data-action="select-book" data-id="${book.id}">${book.id === selectedBookId ? '선택됨' : '선택'}</button>
        <button class="button danger" data-action="delete-book" data-id="${book.id}">삭제</button>
      </div>
    </div>`;
  }).join('');
}

function renderSections() {
  const data = getData();
  const book = data.books.find((item) => item.id === selectedBookId);
  selectedBookInfo.textContent = book ? `선택한 책: ${book.title}` : '책을 선택하세요.';
  const sections = data.sections.filter((item) => item.bookId === selectedBookId).sort((a,b)=>a.order-b.order);
  if (!sections.length) {
    sectionList.innerHTML = `<div class="empty-state">아직 섹션이 없습니다.</div>`;
    return;
  }
  sectionList.innerHTML = sections.map((section) => {
    const wordCount = data.words.filter((word) => word.sectionId === section.id).length;
    return `<div class="list-item">
      <strong>${escapeHtml(section.title)}</strong>
      <div class="muted small-note">단어 ${wordCount}개</div>
      <div class="small-actions">
        <button class="button ${section.id === selectedSectionId ? 'primary' : ''}" data-action="select-section" data-id="${section.id}">${section.id === selectedSectionId ? '선택됨' : '선택'}</button>
        <button class="button danger" data-action="delete-section" data-id="${section.id}">삭제</button>
      </div>
    </div>`;
  }).join('');
}

function filteredWords() {
  const search = wordSearchInput.value.trim().toLowerCase();
  const favOnly = wordFilterFavorite.value === 'favorite';
  return getData().words.filter((word) => {
    if (word.sectionId !== selectedSectionId) return false;
    if (favOnly && !word.favorite) return false;
    if (!search) return true;
    const blob = [word.word, ...(word.meanings || []), word.example, word.memo].join(' ').toLowerCase();
    return blob.includes(search);
  });
}

function renderWords() {
  const section = getData().sections.find((item) => item.id === selectedSectionId);
  selectedSectionInfo.textContent = section ? `선택한 섹션: ${section.title}` : '섹션을 선택하세요.';
  const words = filteredWords();
  if (!words.length) {
    wordList.innerHTML = `<div class="empty-state">조건에 맞는 단어가 없습니다.</div>`;
    return;
  }
  wordList.innerHTML = words.map((word) => {
    const tags = (word.tags || []).map((tag) => `<span class="tag">${escapeHtml(getTagLabel(word.pos, tag))}</span>`).join('');
    return `<div class="list-item">
      <div class="word-head">
        <div>
          <strong>${escapeHtml(word.word)}</strong>
          <div class="muted small-note">${getPosLabel(word.pos)} · ${getToneLabel(word.tone)} · ${formatDateTime(word.updatedAt)}</div>
        </div>
        <button class="favorite-btn ${word.favorite ? 'favorite-on' : ''}" data-action="favorite" data-id="${word.id}">${word.favorite ? '⭐' : '☆'}</button>
      </div>
      <ul class="meaning-list">${word.meanings.map((meaning) => `<li>${escapeHtml(meaning)}</li>`).join('')}</ul>
      <div>${tags}</div>
      ${word.example ? `<div class="muted small-note">예문: ${escapeHtml(word.example)}</div>` : ''}
      ${word.memo ? `<div class="muted small-note">메모: ${escapeHtml(word.memo)}</div>` : ''}
      <div class="small-actions">
        <button class="button" data-action="edit-word" data-id="${word.id}">수정</button>
        <button class="button danger" data-action="delete-word" data-id="${word.id}">삭제</button>
      </div>
    </div>`;
  }).join('');
}

function resetForm() {
  editingWordId = null;
  wordForm.reset();
  toneSelect.value = 'neutral';
  posSelect.value = 'noun';
  cancelEditBtn.classList.add('hidden');
}

function fillForm(word) {
  editingWordId = word.id;
  wordInput.value = word.word;
  meaningsInput.value = (word.meanings || []).join('\n');
  posSelect.value = word.pos;
  toneSelect.value = word.tone;
  tagSelect.value = word.tags?.[0] || '';
  exampleInput.value = word.example || '';
  memoInput.value = word.memo || '';
  cancelEditBtn.classList.remove('hidden');
}

function renderAll() {
  ensureSelection();
  renderBooks();
  renderSections();
  renderWords();
}

document.getElementById('addBookBtn').addEventListener('click', () => {
  const title = bookTitleInput.value.trim();
  if (!title) return;
  addBook(title);
  bookTitleInput.value = '';
  renderAll();
});

document.getElementById('addSectionBtn').addEventListener('click', () => {
  if (!selectedBookId) return;
  const title = sectionTitleInput.value.trim();
  if (!title) return;
  addSection(selectedBookId, title);
  sectionTitleInput.value = '';
  renderAll();
});

wordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!selectedBookId || !selectedSectionId) return;
  const wordText = wordInput.value.trim();
  if (!wordText) return;
  if (isDuplicateWordInSection(selectedSectionId, wordText, editingWordId)) {
    alert('같은 섹션에 같은 단어가 이미 있습니다.');
    return;
  }
  const payload = {
    bookId: selectedBookId,
    sectionId: selectedSectionId,
    word: wordText,
    meanings: meaningsInput.value,
    pos: posSelect.value,
    tone: toneSelect.value,
    tags: tagSelect.value ? [tagSelect.value] : [],
    example: exampleInput.value,
    memo: memoInput.value
  };
  if (editingWordId) {
    updateWord(editingWordId, payload);
  } else {
    addWord(payload);
  }
  resetForm();
  renderAll();
});

cancelEditBtn.addEventListener('click', resetForm);
wordSearchInput.addEventListener('input', renderWords);
wordFilterFavorite.addEventListener('change', renderWords);

bookList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'select-book') {
    selectedBookId = id;
    selectedSectionId = null;
  } else if (action === 'delete-book') {
    if (confirm('이 책을 삭제할까요?')) deleteBook(id);
  }
  renderAll();
});

sectionList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'select-section') {
    selectedSectionId = id;
  } else if (action === 'delete-section') {
    if (confirm('이 섹션을 삭제할까요?')) deleteSection(id);
  }
  renderAll();
});

wordList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'favorite') {
    toggleFavorite(id);
  } else if (action === 'edit-word') {
    const word = getData().words.find((item) => item.id === id);
    if (word) fillForm(word);
  } else if (action === 'delete-word') {
    if (confirm('이 단어를 삭제할까요?')) deleteWord(id);
  }
  renderAll();
});

(async function init() {
  renderOptions();
  const user = await getCurrentUser();
  if (!user) {
    authGuard.classList.remove('hidden');
    return;
  }
  await initData();
  const summary = getStorageSummary();
  document.title = `VOCA Quest - Archive (${summary.wordCount} words)`;
  app.classList.remove('hidden');
  renderAll();
  resetForm();
})();
