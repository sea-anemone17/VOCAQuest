import { initData, getData } from "../storage.js";

function getElements() {
  return {
    bookSelect: document.getElementById("trpgBookSelect"),
    sectionSelect: document.getElementById("trpgSectionSelect"),
    scenarioSelect: document.getElementById("scenarioSelect"),
    difficultySelect: document.getElementById("difficultySelect"),
    startBtn: document.getElementById("startScenarioBtn")
  };
}

function renderBooks(bookSelect, data) {
  bookSelect.innerHTML = "";

  const books = data.books || [];

  if (books.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "책 없음";
    bookSelect.appendChild(opt);
    return;
  }

  books.forEach((book) => {
    const opt = document.createElement("option");
    opt.value = book.id;
    opt.textContent = book.title || "제목 없음";
    bookSelect.appendChild(opt);
  });
}

function renderSections(sectionSelect, data, bookId) {
  sectionSelect.innerHTML = "";

  const sections = (data.sections || [])
    .filter((section) => section.bookId === bookId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (sections.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "섹션 없음";
    sectionSelect.appendChild(opt);
    return;
  }

  sections.forEach((section) => {
    const opt = document.createElement("option");
    opt.value = section.id;
    opt.textContent = section.title || "제목 없음";
    sectionSelect.appendChild(opt);
  });
}

function renderScenarios(scenarioSelect) {
  if (!scenarioSelect) return;

  scenarioSelect.innerHTML = "";

  const demoScenarios = [
    { id: "closed-corridor", title: "닫힌 복도" },
    { id: "archive-beneath-dust", title: "먼지 아래의 기록보관소" },
    { id: "signal-lost-station", title: "신호가 끊긴 역" },
    { id: "city-noise-walk", title: "도시의 소음 산책" },
    { id: "forest-unmarked-path", title: "표식 없는 숲길" }
  ];

  demoScenarios.forEach((scenario) => {
    const opt = document.createElement("option");
    opt.value = scenario.id;
    opt.textContent = scenario.title;
    scenarioSelect.appendChild(opt);
  });
}

function renderDifficulties(difficultySelect) {
  if (!difficultySelect) return;

  difficultySelect.innerHTML = `
    <option value="easy">Easy</option>
    <option value="normal">Normal</option>
    <option value="hard">Hard</option>
  `;
}

async function init() {
  await initData();

  const els = getElements();
  const data = getData();

  if (!els.bookSelect || !els.sectionSelect) {
    alert("책/섹션 select를 찾을 수 없습니다.");
    return;
  }

  renderBooks(els.bookSelect, data);

  const firstBookId = els.bookSelect.value;
  renderSections(els.sectionSelect, data, firstBookId);

  renderScenarios(els.scenarioSelect);
  renderDifficulties(els.difficultySelect);

  els.bookSelect.addEventListener("change", () => {
    renderSections(els.sectionSelect, data, els.bookSelect.value);
  });

  if (els.startBtn) {
    els.startBtn.addEventListener("click", () => {
      alert(
        [
          `책: ${els.bookSelect.value || "(없음)"}`,
          `섹션: ${els.sectionSelect.value || "(없음)"}`,
          `시나리오: ${els.scenarioSelect?.value || "(없음)"}`,
          `난이도: ${els.difficultySelect?.value || "(없음)"}`
        ].join("\n")
      );
    });
  }
}

init();
