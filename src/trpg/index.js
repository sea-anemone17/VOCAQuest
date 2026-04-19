import { getData } from "../storage.js";

function getElements() {
  return {
    bookSelect: document.getElementById("trpgBookSelect"),
    sectionSelect: document.getElementById("trpgSectionSelect"),
  };
}

// 책 옵션 렌더
function renderBooks(bookSelect, data) {
  bookSelect.innerHTML = "";

  if (!data.books || data.books.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "책 없음";
    bookSelect.appendChild(opt);
    return;
  }

  data.books.forEach((book, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = book.title || `Book ${idx + 1}`;
    bookSelect.appendChild(opt);
  });
}

// 섹션 옵션 렌더
function renderSections(sectionSelect, data, bookIndex) {
  sectionSelect.innerHTML = "";

  const book = data.books?.[bookIndex];
  if (!book || !book.sections) return;

  book.sections.forEach((section, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = section.title || `Section ${idx + 1}`;
    sectionSelect.appendChild(opt);
  });
}

// 초기화
function init() {
  const { bookSelect, sectionSelect } = getElements();
  const data = getData();

  if (!bookSelect || !sectionSelect) {
    console.error("select 요소 없음");
    return;
  }

  renderBooks(bookSelect, data);

  // 처음 섹션 렌더
  renderSections(sectionSelect, data, bookSelect.value);

  // 책 바뀌면 섹션 갱신
  bookSelect.addEventListener("change", () => {
    renderSections(sectionSelect, data, bookSelect.value);
  });
}

init();
