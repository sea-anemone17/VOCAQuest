import {
  initData,
  getData,
  addBook,
  deleteBook,
  addSection,
  deleteSection,
  addWord,
  deleteWord
} from "./storage.js";
import {
  POS_OPTIONS,
  TONE_OPTIONS,
  TAG_OPTIONS,
  getPosLabel,
  getToneLabel,
  getTagLabel
} from "./tags.js";
import { escapeHtml } from "./utils.js";

let selectedBookId = null;
let selectedSectionId = null;

const bookForm = document.getElementById("bookForm");
const sectionForm = document.getElementById("sectionForm");
const wordForm = document.getElementById("wordForm");

const bookList = document.getElementById("bookList");
const sectionList = document.getElementById("sectionList");
const wordList = document.getElementById("wordList");

const selectedBookInfo = document.getElementById("selectedBookInfo");
const selectedSectionInfo = document.getElementById("selectedSectionInfo");

const posSelect = document.getElementById("posSelect");
const toneSelect = document.getElementById("toneSelect");
const tagSelect = document.getElementById("tagSelect");

function fillSelect(selectElement, options) {
  selectElement.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
}

function fillTagSelect(pos) {
  const options = TAG_OPTIONS[pos] || [];
  tagSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
}

function renderBooks() {
  const data = getData();

  if (!data.books.length) {
    bookList.innerHTML = `<div class="empty-state">아직 책이 없습니다.</div>`;
    return;
  }

  bookList.innerHTML = data.books
    .map((book) => {
      const isSelected = book.id === selectedBookId;
      const sectionCount = data.sections.filter((s) => s.bookId === book.id).length;
      const wordCount = data.words.filter((w) => w.bookId === book.id).length;

      return `
        <div class="list-item">
          <strong>${escapeHtml(book.title)}</strong>
          <div class="book-meta">섹션 ${sectionCount}개 · 단어 ${wordCount}개</div>
          <div class="small-actions">
            <button class="button ${isSelected ? "primary" : "inline-accent"}" data-action="select-book" data-id="${book.id}">
              ${isSelected ? "선택됨" : "선택"}
            </button>
            <button class="button inline-danger" data-action="delete-book" data-id="${book.id}">삭제</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSections() {
  const data = getData();
  const book = data.books.find((b) => b.id === selectedBookId);

  if (!book) {
    selectedBookInfo.textContent = "책을 선택하세요.";
    sectionList.innerHTML = `<div class="empty-state">선택된 책이 없습니다.</div>`;
    return;
  }

  selectedBookInfo.textContent = `선택한 책: ${book.title}`;

  const sections = data.sections
    .filter((section) => section.bookId === selectedBookId)
    .sort((a, b) => a.order - b.order);

  if (!sections.length) {
    sectionList.innerHTML = `<div class="empty-state">아직 섹션이 없습니다.</div>`;
    return;
  }

  sectionList.innerHTML = sections
    .map((section) => {
      const isSelected = section.id === selectedSectionId;
      const wordCount = data.words.filter((w) => w.sectionId === section.id).length;

      return `
        <div class="list-item">
          <strong>${escapeHtml(section.title)}</strong>
          <div class="section-meta">단어 ${wordCount}개</div>
          <div class="small-actions">
            <button class="button ${isSelected ? "primary" : "inline-accent"}" data-action="select-section" data-id="${section.id}">
              ${isSelected ? "선택됨" : "선택"}
            </button>
            <button class="button inline-danger" data-action="delete-section" data-id="${section.id}">삭제</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderWords() {
  const data = getData();
  const section = data.sections.find((s) => s.id === selectedSectionId);

  if (!section) {
    selectedSectionInfo.textContent = "섹션을 선택하세요.";
    wordList.innerHTML = `<div class="empty-state">선택된 섹션이 없습니다.</div>`;
    return;
  }

  selectedSectionInfo.textContent = `선택한 섹션: ${section.title}`;

  const words = data.words.filter((word) => word.sectionId === selectedSectionId);

  if (!words.length) {
    wordList.innerHTML = `<div class="empty-state">아직 단어가 없습니다.</div>`;
    return;
  }

  wordList.innerHTML = words
    .map((word) => {
      const tagHtml = word.tags
        .map((tag) => `<span class="tag">${escapeHtml(getTagLabel(word.pos, tag))}</span>`)
        .join("");

      return `
        <div class="list-item">
          <strong>${escapeHtml(word.word)}</strong>
          <div class="word-meta">${escapeHtml(word.meaning)}</div>
          <div class="word-meta">품사: ${getPosLabel(word.pos)} · 정서: ${getToneLabel(word.tone)}</div>
          <div>${tagHtml}</div>
          ${word.example ? `<div class="word-meta">예문: ${escapeHtml(word.example)}</div>` : ""}
          ${word.memo ? `<div class="word-meta">메모: ${escapeHtml(word.memo)}</div>` : ""}
          <div class="small-actions">
            <button class="button inline-danger" data-action="delete-word" data-id="${word.id}">삭제</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAll() {
  renderBooks();
  renderSections();
  renderWords();
}

function attachEvents() {
  posSelect.addEventListener("change", (event) => {
    fillTagSelect(event.target.value);
  });

  bookForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("bookTitleInput");
    const title = input.value.trim();
    if (!title) return;

    const newBook = addBook(title);
    selectedBookId = newBook.id;
    selectedSectionId = null;
    input.value = "";
    renderAll();
  });

  sectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedBookId) {
      alert("먼저 책을 선택하세요.");
      return;
    }

    const input = document.getElementById("sectionTitleInput");
    const title = input.value.trim();
    if (!title) return;

    const newSection = addSection(selectedBookId, title);
    selectedSectionId = newSection.id;
    input.value = "";
    renderAll();
  });

  wordForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!selectedBookId || !selectedSectionId) {
      alert("먼저 책과 섹션을 선택하세요.");
      return;
    }

    const word = document.getElementById("wordInput").value.trim();
    const meaning = document.getElementById("meaningInput").value.trim();
    const pos = posSelect.value;
    const tone = toneSelect.value;
    const tag = tagSelect.value;
    const example = document.getElementById("exampleInput").value;
    const memo = document.getElementById("memoInput").value;

    if (!word || !meaning) {
      alert("단어와 뜻을 입력하세요.");
      return;
    }

    addWord({
      bookId: selectedBookId,
      sectionId: selectedSectionId,
      word,
      meaning,
      pos,
      tone,
      tags: tag ? [tag] : [],
      example,
      memo
    });

    wordForm.reset();
    fillSelect(posSelect, POS_OPTIONS);
    fillSelect(toneSelect, TONE_OPTIONS);
    fillTagSelect(posSelect.value);
    renderAll();
  });

  bookList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "select-book") {
      selectedBookId = id;
      selectedSectionId = null;
      renderAll();
    }

    if (action === "delete-book") {
      const ok = confirm("이 책과 관련 섹션/단어를 모두 삭제할까요?");
      if (!ok) return;
      deleteBook(id);
      if (selectedBookId === id) {
        selectedBookId = null;
        selectedSectionId = null;
      }
      renderAll();
    }
  });

  sectionList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "select-section") {
      selectedSectionId = id;
      renderAll();
    }

    if (action === "delete-section") {
      const ok = confirm("이 섹션과 관련 단어를 모두 삭제할까요?");
      if (!ok) return;
      deleteSection(id);
      if (selectedSectionId === id) {
        selectedSectionId = null;
      }
      renderAll();
    }
  });

  wordList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "delete-word") {
      const ok = confirm("이 단어를 삭제할까요?");
      if (!ok) return;
      deleteWord(id);
      renderAll();
    }
  });
}

async function main() {
  await initData();

  fillSelect(posSelect, POS_OPTIONS);
  fillSelect(toneSelect, TONE_OPTIONS);
  fillTagSelect(posSelect.value);

  const data = getData();
  if (data.books.length) {
    selectedBookId = data.books[0].id;
  }
  if (data.sections.length) {
    const firstSection = data.sections.find((s) => s.bookId === selectedBookId);
    selectedSectionId = firstSection?.id || null;
  }

  attachEvents();
  renderAll();
}

main();
