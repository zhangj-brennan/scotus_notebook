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
  chart: document.getElementById("figureChart"),
  stepsWrap: document.getElementById("steps")
};

const toggleMarkup = `
  <div class="step-toggle">
    <button class="toggle-btn js-current-toggle" type="button">Hide current justices</button>
    <button class="toggle-btn js-alito-toggle" type="button">Include Alito</button>
    <button class="toggle-btn js-thomas-toggle" type="button">Include Thomas</button>
    <button class="toggle-btn js-roberts-toggle" type="button">Include Roberts</button>
    <div class="controls-note js-current-note">Showing all justices.</div>
  </div>
`;

const chart = new ScatterSurvivalChart({
  container: els.chart,
  summaryContainer: els.figureSummary,
  hintContainer: els.figureHint
});

init();

async function init() {
  if (!els.stepsWrap || !els.chart || !els.figureSummary || !els.figureHint) {
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
        <div class="step-toggle-slot"></div>
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
  document.querySelectorAll(".step-toggle-slot").forEach(slot => {
    slot.innerHTML = toggleMarkup;
  });

  document.querySelectorAll(".js-current-toggle").forEach(btn => {
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

  document.querySelectorAll(".js-alito-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!hideCurrent) return;
      includeAlito = !includeAlito;
      rerenderFromControls();
    });
  });

  document.querySelectorAll(".js-thomas-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!hideCurrent) return;
      includeThomas = !includeThomas;
      rerenderFromControls();
    });
  });

  document.querySelectorAll(".js-roberts-toggle").forEach(btn => {
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
    btn.textContent = includeAlito ? "Remove Alito" : "Include Alito";
    btn.classList.toggle("active", includeAlito);
    btn.disabled = !hideCurrent;
  });

  document.querySelectorAll(".js-thomas-toggle").forEach(btn => {
    btn.textContent = includeThomas ? "Remove Thomas" : "Include Thomas";
    btn.classList.toggle("active", includeThomas);
    btn.disabled = !hideCurrent;
  });

  document.querySelectorAll(".js-roberts-toggle").forEach(btn => {
    btn.textContent = includeRoberts ? "Remove Roberts" : "Include Roberts";
    btn.classList.toggle("active", includeRoberts);
    btn.disabled = !hideCurrent;
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

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    activateScene(visible.target.dataset.scene);
  }, {
    threshold: [0.2, 0.45, 0.7],
    rootMargin: "-6% 0px -45% 0px"
  });

  steps.forEach(step => observer.observe(step));
}

function activateScene(sceneId) {
  document.querySelectorAll(".step").forEach(step => {
    step.classList.toggle("is-active", step.dataset.scene === sceneId);
  });

  const scene = sceneConfigs.find(d => d.id === sceneId);
  if (!scene) return;

  chart.renderScene(scene.id, { ...scene }, getFilteredData());
}