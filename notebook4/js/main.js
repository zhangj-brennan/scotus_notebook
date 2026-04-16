import { loadData } from "./data.js";
import { ScatterSurvivalChart } from "./chart.js";
import { getSceneConfigs } from "./scenes.js";

let allData = [];
let hideCurrent = false;
let includeAlito = false;
let includeThomas = false;
let includeRoberts = false;

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

    <div class="justice-segment-group js-justice-group" aria-label="Include individual current justices">
      <button class="toggle-btn segment-btn js-alito-toggle" type="button">Alito</button>
      <button class="toggle-btn segment-btn js-thomas-toggle" type="button">Thomas</button>
      <button class="toggle-btn segment-btn js-roberts-toggle" type="button">Roberts</button>
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

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isJusticeMatch(name, targetLastName) {
  return normalizeName(name).includes(targetLastName.toLowerCase());
}

function isIncludedException(d) {
  if (includeAlito && isJusticeMatch(d.name, "alito")) return true;
  if (includeThomas && isJusticeMatch(d.name, "thomas")) return true;
  if (includeRoberts && isJusticeMatch(d.name, "roberts")) return true;
  return false;
}

function getFilteredData() {
  return allData.filter(d => {
    if (!hideCurrent) return true;
    if (!d.isCurrent) return true;
    return isIncludedException(d);
  });
}

function rerenderFromControls() {
  updateControls();
  chart.updateData(getFilteredData());
}

function setupControls() {
  els.figureControls.innerHTML = toggleMarkup;

  els.figureControls.querySelectorAll(".js-current-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      hideCurrent = !hideCurrent;

      if (!hideCurrent) {
        includeAlito = false;
        includeThomas = false;
        includeRoberts = false;
      }

      rerenderFromControls();
    });
  });

  els.figureControls.querySelectorAll(".js-alito-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!hideCurrent) return;
      includeAlito = !includeAlito;
      rerenderFromControls();
    });
  });

  els.figureControls.querySelectorAll(".js-thomas-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!hideCurrent) return;
      includeThomas = !includeThomas;
      rerenderFromControls();
    });
  });

  els.figureControls.querySelectorAll(".js-roberts-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!hideCurrent) return;
      includeRoberts = !includeRoberts;
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

  document.querySelectorAll(".js-alito-toggle").forEach(btn => {
    btn.classList.toggle("active", includeAlito);
    btn.disabled = !hideCurrent;
    btn.setAttribute("aria-pressed", includeAlito ? "true" : "false");
  });

  document.querySelectorAll(".js-thomas-toggle").forEach(btn => {
    btn.classList.toggle("active", includeThomas);
    btn.disabled = !hideCurrent;
    btn.setAttribute("aria-pressed", includeThomas ? "true" : "false");
  });

  document.querySelectorAll(".js-roberts-toggle").forEach(btn => {
    btn.classList.toggle("active", includeRoberts);
    btn.disabled = !hideCurrent;
    btn.setAttribute("aria-pressed", includeRoberts ? "true" : "false");
  });

  document.querySelectorAll(".js-justice-group").forEach(group => {
    group.classList.toggle("is-disabled", !hideCurrent);
  });

  let noteText = "Showing all justices.";

  if (hideCurrent) {
    const included = [];
    if (includeAlito) included.push("Alito");
    if (includeThomas) included.push("Thomas");
    if (includeRoberts) included.push("Roberts");

    noteText = included.length
      ? `Showing former justices, plus ${included.join(", ")}.`
      : "Showing former justices only.";
  }

  document.querySelectorAll(".js-current-note").forEach(note => {
    note.textContent = noteText;
  });
}

function setupScroller() {
  const steps = Array.from(document.querySelectorAll(".step"));

  function onScroll() {
    const targetY = window.innerHeight * 0.42;

    let bestStep = null;
    let bestDistance = Infinity;

    steps.forEach(step => {
      const rect = step.getBoundingClientRect();
      const stepCenter = rect.top + rect.height / 2;
      const distance = Math.abs(stepCenter - targetY);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestStep = step;
      }
    });

    if (!bestStep) return;

    const nextScene = bestStep.dataset.scene;

    if (nextScene !== currentSceneId) {
      currentSceneId = nextScene;
      activateScene(nextScene);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

function activateScene(sceneId) {
  document.querySelectorAll(".step").forEach(step => {
    step.classList.toggle("is-active", step.dataset.scene === sceneId);
  });

  const scene = sceneConfigs.find(d => d.id === sceneId);
  if (!scene) return;

  chart.renderScene(scene.id, { ...scene }, getFilteredData());
}