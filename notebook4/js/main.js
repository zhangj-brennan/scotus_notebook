import { loadData } from "./data.js";
import { ScatterSurvivalChart } from "./chart.js";
import { getSceneConfigs } from "./scenes.js";

let allData = [];
let hideCurrent = false;
const sceneConfigs = getSceneConfigs();

const els = {
  sceneLabel: document.getElementById("sceneLabel"),
  figureTitle: document.getElementById("figureTitle"),
  figureSummary: document.getElementById("figureSummary"),
  figureHint: document.getElementById("figureHint"),
  chart: document.getElementById("figureChart"),
  steps: Array.from(document.querySelectorAll(".step"))
};

const toggleMarkup = `
  <div class="step-toggle">
    <button class="toggle-btn js-current-toggle" type="button">Hide current justices</button>
    <div class="controls-note js-current-note">Showing all justices.</div>
  </div>
`;

const chart = new ScatterSurvivalChart({
  container: els.chart,
  summaryContainer: els.figureSummary,
  titleContainer: els.figureTitle,
  labelContainer: els.sceneLabel,
  hintContainer: els.figureHint
});

init();

async function init() {
  allData = await loadData();
  chart.init(getFilteredData());
  setupControls();
  setupScroller();
  activateScene("scene1");
}

function getFilteredData() {
  return hideCurrent ? allData.filter(d => !d.isCurrent) : [...allData];
}

function setupControls() {
  document.querySelectorAll(".step-toggle-slot").forEach(slot => {
    slot.innerHTML = toggleMarkup;
  });

  document.querySelectorAll(".js-current-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      hideCurrent = !hideCurrent;
      updateControls();
      chart.updateData(getFilteredData());
    });
  });

  updateControls();
}

function updateControls() {
  document.querySelectorAll(".js-current-toggle").forEach(btn => {
    if (hideCurrent) {
      btn.textContent = "Show current justices";
      btn.classList.add("active");
    } else {
      btn.textContent = "Hide current justices";
      btn.classList.remove("active");
    }
  });

  document.querySelectorAll(".js-current-note").forEach(note => {
    note.textContent = hideCurrent
      ? "Showing former justices only."
      : "Showing all justices.";
  });
}

function setupScroller() {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    const sceneName = visible.target.dataset.scene;
    activateScene(sceneName);
  }, {
    threshold: [0.35, 0.6, 0.85],
    rootMargin: "-10% 0px -25% 0px"
  });

  els.steps.forEach(step => observer.observe(step));
}

function activateScene(sceneName) {
  els.steps.forEach(step => {
    step.classList.toggle("is-active", step.dataset.scene === sceneName);
  });

  const data = getFilteredData();
  chart.renderScene(sceneName, { ...sceneConfigs[sceneName] }, data);
}
