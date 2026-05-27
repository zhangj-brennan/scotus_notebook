import { loadData } from "./data.js";
import { ScatterSurvivalChart } from "./chart.js";
import { getSceneConfigs } from "./scenes.js";

let allData = [];
let hideCurrent = true;

let assumeCurrentAtLeast15 = false;
window.assumeCurrentAtLeast15 = false;

const ASSUMED_CURRENT_MIN_YEARS = 15;
const DAYS_PER_YEAR = 365.25;

const sceneConfigs = getSceneConfigs();

const els = {
  figureSummary: document.getElementById("figureSummary"),
  figureHint: document.getElementById("figureHint"),
  figureControls: document.getElementById("figureControls"),
  chart: document.getElementById("figureChart"),
  stepsWrap: document.getElementById("steps")
};

const toggleMarkup = `
  <div class="chart-controls">
    <div class="chart-controls-main">
      <button class="toggle-btn js-current-toggle" type="button">Hide current justices</button>
      <div class="controls-note js-current-note">Showing all justices.</div>
    </div>

 
  </div>
`;

const chart = new ScatterSurvivalChart({
  container: els.chart,
  summaryContainer: els.figureSummary,
  hintContainer: els.figureHint
});

let currentSceneId = null;

init();

async function init() {
  if (!els.stepsWrap || !els.chart || !els.figureSummary || !els.figureHint || !els.figureControls) {
    console.warn("Missing required DOM nodes", els);
    return;
  }

  renderSteps();
  allData = await loadData();
  chart.init(getFilteredData());
  setupControls();
  setupScroller();
  activateScene(sceneConfigs[0].id);
}

function renderSteps() {
  els.stepsWrap.innerHTML = sceneConfigs.map((scene, i) => `
    <article class="step${i === 0 ? " is-active" : ""}" data-scene="${scene.id}">
      <div class="step-inner">
        <div class="step-number">${scene.stepLabel || ""}</div>
        <h3>${scene.stepTitle || ""}</h3>
        ${scene.stepBody || ""}
      </div>
    </article>
  `).join("");
}

function applyCurrentJusticeAssumption(data) {
  if (!assumeCurrentAtLeast15) return data;

  return data.map(d => {
    if (!d.isCurrent || d.tenureYears >= ASSUMED_CURRENT_MIN_YEARS) return d;

    return {
      ...d,
      days: ASSUMED_CURRENT_MIN_YEARS * DAYS_PER_YEAR,
      tenureYears: ASSUMED_CURRENT_MIN_YEARS,
      assumedCurrentMinimum: true
    };
  });
}

function getFilteredData() {
  const filtered = allData.filter(d => {
    if (!hideCurrent) return true;
    return !d.isCurrent;
  });

  return applyCurrentJusticeAssumption(filtered);
}

function rerenderFromControls() {
  updateControls();

  const data = getFilteredData();

  chart.init(data);

  if (currentSceneId) {
    activateScene(currentSceneId);
  }
}

function setupControls() {
  els.figureControls.innerHTML = toggleMarkup;

  els.figureControls.querySelectorAll(".js-current-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      hideCurrent = !hideCurrent;

      rerenderFromControls();
    });
  });

  

  document.querySelectorAll(".js-assume-current-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    assumeCurrentAtLeast15 = !assumeCurrentAtLeast15;

    window.assumeCurrentAtLeast15 = assumeCurrentAtLeast15;

    if (assumeCurrentAtLeast15) {
      hideCurrent = false;
    }

    rerenderFromControls();
  });
});

  updateControls();
}

function updateControls() {
  document.querySelectorAll(".js-current-toggle").forEach(btn => {
    btn.textContent = hideCurrent ? "Show all current justices" : "Hide current justices";
    btn.classList.toggle("active", hideCurrent);
  });

  document.querySelectorAll(".js-assume-current-toggle").forEach(btn => {
    btn.classList.toggle("active", assumeCurrentAtLeast15);
    btn.setAttribute("aria-pressed", assumeCurrentAtLeast15 ? "true" : "false");
  });

  document.querySelectorAll(".js-justice-group").forEach(group => {
    group.classList.toggle("is-disabled", !hideCurrent);
  });

  let noteText = "Showing all justices.";

  if (hideCurrent) {
    const included = [];

    noteText = included.length
      ? `Showing former justices, plus ${included.join(", ")}.`
      : "Showing former justices only.";
  }

  if (assumeCurrentAtLeast15) {
    noteText += " Current justices under 15 years are charted as 15 years.";
  }

  document.querySelectorAll(".js-current-note").forEach(note => {
    note.textContent = noteText;
  });
}

function setupScroller() {
  const steps = Array.from(document.querySelectorAll(".step"));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const sceneId = entry.target.dataset.scene;

      if (sceneId === currentSceneId) return;

      currentSceneId = sceneId;

      steps.forEach(step => {
        step.classList.toggle("is-active", step.dataset.scene === sceneId);
      });

      activateScene(sceneId);
    });
  }, {
    threshold: 0.55
  });

  steps.forEach(step => observer.observe(step));
}

function activateScene(sceneId) {
  const scene = sceneConfigs.find(s => s.id === sceneId);

  if (!scene) return;

  chart.renderScene(
    scene.id,
    scene,
    getFilteredData()
  );
}