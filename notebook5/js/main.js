import { loadData } from "./data.js";
import { ScatterSurvivalChart } from "./chart.js";
import { getSceneConfigs } from "./scenes.js";

let allData = [];
let includeCurrentInCalculations = false;
let assumeCurrentMinYears = null;
window.assumeCurrentAtLeast15 = false;
window.assumeCurrentMinYears = null;

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
      <button class="toggle-btn js-current-toggle" type="button">Include current justices</button>
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
  if (!assumeCurrentMinYears) return data;

  return data.map(d => {
    if (!d.isCurrent || d.tenureYears >= assumeCurrentMinYears) return d;

    return {
      ...d,
      days: assumeCurrentMinYears * DAYS_PER_YEAR,
      tenureYears: assumeCurrentMinYears,
      assumedCurrentMinimum: true
    };
  });
}

function getFilteredData() {
  const displayData = allData.map(d => ({
    ...d,
    includeInCalculations: !d.isCurrent || includeCurrentInCalculations
  }));

  return applyCurrentJusticeAssumption(displayData);
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
      includeCurrentInCalculations = !includeCurrentInCalculations;

      rerenderFromControls();
    });
  });

  

document.querySelectorAll(".js-assume-current-years").forEach(btn => {
  btn.addEventListener("click", () => {
    const years = +btn.dataset.years;

    assumeCurrentMinYears =
      assumeCurrentMinYears === years ? null : years;

    window.assumeCurrentMinYears = assumeCurrentMinYears;
    window.assumeCurrentAtLeast15 = !!assumeCurrentMinYears;

    if (assumeCurrentMinYears) {
      includeCurrentInCalculations = true;
    }

    rerenderFromControls();
  });
});
  updateControls();
}

function updateControls() {
  document.querySelectorAll(".js-current-toggle").forEach(btn => {
    btn.textContent = includeCurrentInCalculations ? "Exclude current justices from calculations" : "Include current justices in calculations";
    btn.classList.toggle("active", includeCurrentInCalculations);
  });

document.querySelectorAll(".js-assume-current-years").forEach(btn => {
  const years = +btn.dataset.years;
  const isActive = assumeCurrentMinYears === years;

  btn.classList.toggle("active", isActive);
  btn.setAttribute("aria-pressed", isActive ? "true" : "false");
});

  document.querySelectorAll(".js-justice-group").forEach(group => {
    group.classList.toggle("is-disabled", includeCurrentInCalculations);
  });

  let noteText = includeCurrentInCalculations
    ? "Current justices are filled and included in calculations."
    : "Current justices are outlined and excluded from calculations.";

  if (assumeCurrentAtLeast15) {
    noteText += ` Current justices under ${assumeCurrentMinYears} years are charted as ${assumeCurrentMinYears} years.`;
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