import { initData, getData } from "../storage.js";
import { scenarios } from "../../scenarios/index.js";

let gameState = null;

function getElements() {
  return {
    bookSelect: document.getElementById("trpgBookSelect"),
    sectionSelect: document.getElementById("trpgSectionSelect"),
    scenarioSelect: document.getElementById("scenarioSelect"),
    difficultySelect: document.getElementById("difficultySelect"),
    startBtn: document.getElementById("startScenarioBtn"),
    restartBtn: document.getElementById("restartScenarioBtn"),

    sceneCounter: document.getElementById("sceneCounter"),
    clueCount: document.getElementById("clueCount"),
    mistakeCount: document.getElementById("mistakeCount"),
    scenarioStatus: document.getElementById("scenarioStatus"),

    scenarioTitle: document.getElementById("scenarioTitle"),
    scenarioIntroBox: document.getElementById("scenarioIntroBox"),
    sceneBox: document.getElementById("sceneBox")
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

  scenarios.forEach((scenario) => {
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

function getScenarioById(scenarioId) {
  return scenarios.find((scenario) => scenario.id === scenarioId) || null;
}

function createGameState({ bookId, sectionId, scenarioId, difficulty }) {
  return {
    bookId,
    sectionId,
    scenarioId,
    difficulty,
    sceneIndex: 0,
    clues: 0,
    mistakes: 0,
    ended: false
  };
}

function updateStats(els) {
  if (!gameState) return;

  const scenario = getScenarioById(gameState.scenarioId);
  const maxTurns = scenario?.loopConfig?.maxTurns ?? 0;

  if (els.sceneCounter) {
    els.sceneCounter.textContent = `${gameState.sceneIndex + 1} / ${maxTurns}`;
  }

  if (els.clueCount) {
    els.clueCount.textContent = String(gameState.clues);
  }

  if (els.mistakeCount) {
    els.mistakeCount.textContent = String(gameState.mistakes);
  }

  if (els.scenarioStatus) {
    els.scenarioStatus.textContent = gameState.ended ? "종결" : "진행 중";
  }
}

function renderIntro(els) {
  if (!gameState) return;

  const scenario = getScenarioById(gameState.scenarioId);
  if (!scenario) return;

  if (els.scenarioTitle) {
    els.scenarioTitle.textContent = scenario.title;
  }

  if (els.scenarioIntroBox) {
    els.scenarioIntroBox.innerHTML = `<p>${scenario.intro}</p>`;
  }
}

function renderActionMenu(els) {
  if (!gameState) return;

  const scenario = getScenarioById(gameState.scenarioId);
  if (!scenario || !els.sceneBox) return;

  const buttonsHtml = (scenario.actionTypes || [])
    .map(
      (action) => `
        <button class="button" type="button" data-action-id="${action.id}">
          ${action.label}
        </button>
      `
    )
    .join("");

  els.sceneBox.innerHTML = `
    <h3>첫 장면</h3>
    <p>어떤 방식으로 조사할지 선택하세요.</p>
    <div class="button-row">${buttonsHtml}</div>
  `;
}

function startScenario(els) {
  const bookId = els.bookSelect?.value || "";
  const sectionId = els.sectionSelect?.value || "";
  const scenarioId = els.scenarioSelect?.value || "";
  const difficulty = els.difficultySelect?.value || "easy";

  if (!bookId || !sectionId || !scenarioId) {
    alert("책, 섹션, 시나리오를 모두 선택해 주세요.");
    return;
  }

  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    alert("시나리오를 찾을 수 없습니다.");
    return;
  }

  gameState = createGameState({
    bookId,
    sectionId,
    scenarioId,
    difficulty
  });

  updateStats(els);
  renderIntro(els);
  renderActionMenu(els);
}

function handleActionClick(event, els) {
  const button = event.target.closest("button[data-action-id]");
  if (!button || !gameState) return;

  const actionId = button.dataset.actionId;
  const scenario = getScenarioById(gameState.scenarioId);
  const action = scenario?.actionTypes?.find((item) => item.id === actionId);

  if (!action || !els.sceneBox) return;

  els.sceneBox.innerHTML = `
    <h3>${action.label}</h3>
    <p>${action.description || "조사를 진행합니다."}</p>
    <div class="button-row">
      <button class="button primary" type="button" id="nextSceneBtn">다음 장면으로</button>
      <button class="button" type="button" id="backToActionsBtn">다시 행동 선택</button>
    </div>
  `;

  const nextBtn = document.getElementById("nextSceneBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      goToNextScene(els);
    });
  }

  const backBtn = document.getElementById("backToActionsBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      renderActionMenu(els);
    });
  }
}

function goToNextScene(els) {
  if (!gameState) return;

  const scenario = getScenarioById(gameState.scenarioId);
  const maxTurns = scenario?.loopConfig?.maxTurns ?? 0;

  gameState.sceneIndex += 1;

  if (gameState.sceneIndex >= maxTurns) {
    gameState.ended = true;

    updateStats(els);

    if (els.sceneBox) {
      els.sceneBox.innerHTML = `
        <h3>조사 종료</h3>
        <p>더 이상 진행할 장면이 없습니다.</p>
      `;
    }

    return;
  }

  updateStats(els);
  renderActionMenu(els);
}

async function init() {
  await initData();

  const els = getElements();
  const data = getData();

  if (!els.bookSelect || !els.sectionSelect || !els.sceneBox) {
    alert("필수 요소를 찾을 수 없습니다.");
    return;
  }

  renderBooks(els.bookSelect, data);
  renderSections(els.sectionSelect, data, els.bookSelect.value);
  renderScenarios(els.scenarioSelect);
  renderDifficulties(els.difficultySelect);

  els.bookSelect.addEventListener("change", () => {
    renderSections(els.sectionSelect, data, els.bookSelect.value);
  });

  if (els.startBtn) {
    els.startBtn.addEventListener("click", () => {
      startScenario(els);
    });
  }

  if (els.restartBtn) {
    els.restartBtn.addEventListener("click", () => {
      if (!gameState) return;
      startScenario(els);
    });
  }

  els.sceneBox.addEventListener("click", (event) => {
    handleActionClick(event, els);
  });
}

init();
