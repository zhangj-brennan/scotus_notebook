const CONFIG = {
  tenureCsvPath: "data.csv",
  endReasonCsvPath: "scotus_endReason.csv",
  fields: {
    name: "name",
    days: "days",
    start: "start date",
    isCurrent: "isCurrent",
    endReason: "end reason"
  },
  chartDesktop: {
    width: 1040,
    height: 560,
    margin: { top: 22, right: 26, bottom: 58, left: 74 },
    xTicks: 8,
    yTicks: 6,
    pointRadius: 4.5
  },
  chartMobile: {
    width: 760,
    height: 820,
    margin: { top: 28, right: 22, bottom: 66, left: 72 },
    xTicks: 5,
    yTicks: 6,
    pointRadius: 6
  },
  mobileBreakpoint: 980,
  yAxisMaxPaddingYears: 2,
  initialSplitYear: 1966,
  reasonOrder: [
    "Current",
    "Died",
    "Retired",
    "Resigned",
    "Resigned, nomination having been rejected",
    "Continued as chief justice"
  ]
};

const els = {
  chart: document.getElementById("chart"),
  summary: document.getElementById("summary"),
  filters: document.getElementById("filters"),
  resetFilters: document.getElementById("resetFilters"),
  shareState: document.getElementById("shareState")
};

let allData = [];
let selectedReasons = new Set();
let splitDate = new Date(CONFIG.initialSplitYear, 0, 1);
let chart = null;

function readStateFromUrl() {
  const params = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );

  return {
    year: +(params.get("year") || CONFIG.initialSplitYear),
    reasons: params.get("reasons")
      ? new Set(params.get("reasons").split(","))
      : null
  };
}

function writeStateToUrl() {
  const params = new URLSearchParams();

  params.set("year", d3.timeFormat("%Y")(splitDate));
  params.set("reasons", Array.from(selectedReasons).join(","));

  history.replaceState(null, "", "#" + params.toString());
}

init();

async function init() {
  const [tenureRows, endRows] = await Promise.all([
    d3.csv(CONFIG.tenureCsvPath),
    d3.csv(CONFIG.endReasonCsvPath)
  ]);

  const reasonLookup = buildReasonLookup(endRows);

  allData = tenureRows
    .map(row => parseTenureRow(row, reasonLookup))
    .filter(d => d.startDate && Number.isFinite(d.tenureYears))
    .sort((a, b) => d3.ascending(a.startDate, b.startDate));

  const reasons = getReasonList(allData);
  const urlState = readStateFromUrl();

  splitDate = new Date(urlState.year, 0, 1);

  selectedReasons = urlState.reasons
    ? new Set(reasons.filter(r => urlState.reasons.has(r)))
    : new Set(reasons);

  renderFilters(reasons);

  chart = new MedianSplitChart({
    container: els.chart,
    summaryContainer: els.summary
  });

  chart.init(allData, getFilteredData(), splitDate);

  els.resetFilters.addEventListener("click", () => {
    selectedReasons = new Set(reasons);
    updateFilterButtons();
    updateChart();
    writeStateToUrl();
  });

  if (els.shareState) {
    els.shareState.addEventListener("click", async () => {
      writeStateToUrl();

      await navigator.clipboard.writeText(window.location.href);

      const oldText = els.shareState.textContent;
      els.shareState.textContent = "Copied!";

      setTimeout(() => {
        els.shareState.textContent = oldText;
      }, 1500);
    });
  }

  writeStateToUrl();
}

function updateChart() {
  chart.update(getFilteredData(), splitDate);
}

function getFilteredData() {
  return allData.filter(d => selectedReasons.has(d.endReason));
}

function renderFilters(reasons) {
  els.filters.innerHTML = reasons.map(reason => `
    <button class="filter-btn${selectedReasons.has(reason) ? " active" : ""}" type="button" data-reason="${escapeAttr(reason)}" aria-pressed="${selectedReasons.has(reason) ? "true" : "false"}">
      ${reason}
    </button>
  `).join("");

  els.filters.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const reason = btn.dataset.reason;

      if (selectedReasons.has(reason)) {
        selectedReasons.delete(reason);
      } else {
        selectedReasons.add(reason);
      }

      updateFilterButtons();
      updateChart();
      writeStateToUrl();
    });
  });
}

function updateFilterButtons() {
  els.filters.querySelectorAll(".filter-btn").forEach(btn => {
    const active = selectedReasons.has(btn.dataset.reason);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function getReasonList(data) {
  const seen = new Set(data.map(d => d.endReason));
  const ordered = CONFIG.reasonOrder.filter(reason => seen.has(reason));
  const extras = Array.from(seen)
    .filter(reason => !CONFIG.reasonOrder.includes(reason))
    .sort(d3.ascending);

  return ordered.concat(extras);
}

function buildReasonLookup(rows) {
  const byKey = new Map();

  rows.forEach(row => {
    const parsed = parseEndReasonName(row.name);
    if (!parsed) return;

    const key = `${parsed.first}|${parsed.last}`;

    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row[CONFIG.fields.endReason]);
  });

  return byKey;
}

function parseTenureRow(row, reasonLookup) {
  const startDate = parseDateFlexible(row[CONFIG.fields.start]);
  const days = parseNumberFlexible(row[CONFIG.fields.days]);
  const tenureYears = days / 365.25;
  const isCurrent = parseBooleanFlexible(row[CONFIG.fields.isCurrent]);
  const name = row[CONFIG.fields.name] || "";

  return {
    raw: row,
    name,
    startDate,
    days,
    tenureYears,
    isCurrent,
    endReason: getEndReason(name, isCurrent, reasonLookup)
  };
}

function getEndReason(name, isCurrent, reasonLookup) {
  if (isCurrent) return "Current";

  const continuedAsChief = new Set([
    "Edward Douglass White (CJ)",
    "Harlan F. Stone (CJ)",
    "William Rehnquist (CJ)"
  ]);

  if (continuedAsChief.has(name)) return "Continued as chief justice";

  const parsed = parseMainName(name);
  const reasons = reasonLookup.get(`${parsed.first}|${parsed.last}`) || [];

  if (!reasons.length) return "Unknown";

  const finalReasonPreference = [
    "Died",
    "Retired",
    "Resigned",
    "Resigned, nomination having been rejected",
    "Continued as chief justice",
    "Current"
  ];

  return finalReasonPreference.find(reason => reasons.includes(reason)) || reasons[0];
}

function parseMainName(name) {
  const clean = name
    .replace(/\([^)]*\)/g, "")
    .replace(/[.,]/g, " ")
    .replace(/\b(Jr|Sr|II|III|IV)\b/gi, " ")
    .replace(/[^a-zA-Z'\s-]/g, " ")
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);

  return {
    first: normalizeToken(parts[0] || ""),
    last: normalizeToken(parts[parts.length - 1] || "")
  };
}

function parseEndReasonName(name) {
  if (!name || !name.includes(",")) return null;

  const [lastRaw, restRaw] = name.split(/,(.+)/);
  const rest = restRaw || "";

  const first = rest
    .replace(/[.,]/g, " ")
    .replace(/\b(Jr|Sr|II|III|IV)\b/gi, " ")
    .trim()
    .split(/\s+/)[0] || "";

  return {
    first: normalizeToken(first),
    last: normalizeToken(lastRaw)
  };
}

function normalizeToken(value) {
  return String(value).toLowerCase().replace(/[^a-z]/g, "");
}

function parseDateFlexible(value) {
  if (!value) return null;

  const tryFormats = [
    d3.timeParse("%Y-%m-%d"),
    d3.timeParse("%m/%d/%Y"),
    d3.timeParse("%m/%d/%y"),
    d3.timeParse("%Y/%m/%d"),
    d3.timeParse("%b %d, %Y"),
    d3.timeParse("%B %d, %Y")
  ];

  for (const parse of tryFormats) {
    const dt = parse(value);
    if (dt) return dt;
  }

  const fallback = new Date(value);
  return Number.isNaN(+fallback) ? null : fallback;
}

function parseNumberFlexible(value) {
  if (value == null || value === "") return NaN;
  return +String(value).replace(/,/g, "").trim();
}

function parseBooleanFlexible(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y";
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getChartDimensions(viewportWidth = window.innerWidth) {
  return viewportWidth <= CONFIG.mobileBreakpoint
    ? CONFIG.chartMobile
    : CONFIG.chartDesktop;
}

function splitMedians(data, splitDate) {
  const left = data.filter(d => d.startDate < splitDate);
  const right = data.filter(d => d.startDate >= splitDate);

  return {
    leftCount: left.length,
    rightCount: right.length,
    leftMedian: d3.median(left, d => d.tenureYears),
    rightMedian: d3.median(right, d => d.tenureYears)
  };
}

class MedianSplitChart {
  constructor({ container, summaryContainer }) {
    this.container = container;
    this.summaryContainer = summaryContainer;
    this.svg = null;
    this.tooltip = null;
    this.g = {};
    this.scales = null;
    this.allData = [];
    this.filteredData = [];
    this.splitDate = splitDate;
    this.chartDims = getChartDimensions();
    this.resizeRaf = null;
  }

  init(allData, filteredData, currentSplitDate) {
    this.allData = allData;
    this.filteredData = filteredData;
    this.splitDate = currentSplitDate;
    this.draw();
    this.setupResize();
  }

  setupResize() {
    window.addEventListener("resize", () => {
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);

      this.resizeRaf = requestAnimationFrame(() => {
        const nextDims = getChartDimensions(window.innerWidth);

        const changed =
          nextDims.width !== this.chartDims.width ||
          nextDims.height !== this.chartDims.height;

        if (!changed) return;

        this.draw();
      });
    });
  }

  draw() {
    d3.select(this.container).html("");

    this.chartDims = getChartDimensions(window.innerWidth);

    this.svg = d3.select(this.container)
      .append("svg")
      .attr("viewBox", `0 0 ${this.chartDims.width} ${this.chartDims.height}`);

    this.tooltip = d3.select(this.container)
      .append("div")
      .attr("class", "chart-tooltip")
      .style("display", "none");

    this.drawBase();
    this.update(this.filteredData, this.splitDate);
  }

  drawBase() {
    const { width, height, margin, xTicks, yTicks } = this.chartDims;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxYears = d3.max(this.allData, d => d.tenureYears) || 0;
    const yMax = Math.ceil(maxYears + CONFIG.yAxisMaxPaddingYears);

    const x = d3.scaleTime()
      .domain(d3.extent(this.allData, d => d.startDate))
      .nice()
      .range([margin.left, margin.left + innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([margin.top + innerHeight, margin.top]);

    this.scales = {
      x,
      y,
      yMax,
      width,
      height,
      margin,
      innerWidth,
      innerHeight
    };

    this.svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${margin.top + innerHeight})`)
      .call(d3.axisBottom(x).ticks(xTicks).tickSize(-innerHeight).tickFormat(""));

    this.svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(yTicks).tickSize(-innerWidth).tickFormat(""));

    const xAxis = this.svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${margin.top + innerHeight})`)
      .call(d3.axisBottom(x).ticks(xTicks));

    const yAxis = this.svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(yTicks));

    xAxis.selectAll("text").style("font-size", "24px");
    yAxis.selectAll("text").style("font-size", "24px");

    this.svg.append("text")
      .attr("x", margin.left + innerWidth / 2)
      .attr("y", height - 2)
      .attr("text-anchor", "middle")
      .attr("class", "annotation")
      .text("Start date");

    this.svg.append("text")
      .attr("transform", `translate(10, ${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("class", "annotation")
      .text("Years in office");

    this.g.dots = this.svg.append("g");

    this.g.splitLine = this.svg.append("line")
      .attr("class", "split-line");

    this.g.splitHit = this.svg.append("line")
      .attr("class", "drag-hit");

    this.g.splitLabel = this.svg.append("text")
      .attr("class", "annotation");

    this.g.leftMedian = this.svg.append("text")
      .attr("class", "median-number");

    this.g.leftLabel = this.svg.append("text")
      .attr("class", "median-label");

    this.g.rightMedian = this.svg.append("text")
      .attr("class", "median-number");

    this.g.rightLabel = this.svg.append("text")
      .attr("class", "median-label");

    this.g.dots.selectAll("circle")
      .data(this.allData, d => `${d.name}-${+d.startDate}`)
      .join("circle")
      .attr("class", d => d.isCurrent ? "dot current" : "dot")
      .attr("cx", d => x(d.startDate))
      .attr("cy", d => y(d.tenureYears))
      .attr("r", this.chartDims.pointRadius)
      .on("mouseenter", (event, d) => this.showTooltip(event, d))
      .on("mousemove", event => this.moveTooltip(event))
      .on("mouseleave", () => this.hideTooltip());

    this.g.splitHit.call(
      d3.drag()
        .on("drag", event => {
          const clampedX = Math.max(
            margin.left,
            Math.min(margin.left + innerWidth, event.x)
          );

          this.splitDate = x.invert(clampedX);
          splitDate = this.splitDate;

          this.update(this.filteredData, this.splitDate);
        })
        .on("end", () => {
          writeStateToUrl();
        })
    );
  }

  update(filteredData, currentSplitDate) {
    this.filteredData = filteredData;
    this.splitDate = currentSplitDate;

    const activeKeys = new Set(
      filteredData.map(d => `${d.name}-${+d.startDate}`)
    );

    this.g.dots.selectAll("circle")
      .classed("filtered-out", d => !activeKeys.has(`${d.name}-${+d.startDate}`));

    this.updateSplitView();
  }

  updateSplitView() {
    const { x, margin, innerWidth, innerHeight } = this.scales;

    const xx = x(this.splitDate);
    const splitLabel = d3.timeFormat("%Y")(this.splitDate);
    const medians = splitMedians(this.filteredData, this.splitDate);

    this.g.splitLine
      .attr("y1", margin.top)
      .attr("y2", margin.top + innerHeight)
      .attr("x1", xx)
      .attr("x2", xx);

    this.g.splitHit
      .attr("y1", margin.top)
      .attr("y2", margin.top + innerHeight)
      .attr("x1", xx)
      .attr("x2", xx);

    this.g.splitLabel
      .attr("x", xx + 6)
      .attr("y", margin.top + 16)
      .text(splitLabel);

    const xLeftCenter = (margin.left + xx) / 2;
    const xRightCenter = (xx + margin.left + innerWidth) / 2;
    const yCenter = margin.top + innerHeight / 2;

    const leftText = Number.isFinite(medians.leftMedian)
      ? d3.format(".1f")(medians.leftMedian)
      : "—";

    const rightText = Number.isFinite(medians.rightMedian)
      ? d3.format(".1f")(medians.rightMedian)
      : "—";

    this.g.leftMedian
      .attr("x", xLeftCenter)
      .attr("y", yCenter)
      .text(leftText);

    this.g.leftLabel
      .attr("x", xLeftCenter)
      .attr("y", yCenter + 38)
      .text(`Median years before ${splitLabel} · n=${medians.leftCount}`);

    this.g.rightMedian
      .attr("x", xRightCenter)
      .attr("y", yCenter)
      .text(rightText);

    this.g.rightLabel
      .attr("x", xRightCenter)
      .attr("y", yCenter + 38)
      .text(`Median years after ${splitLabel} · n=${medians.rightCount}`);

    this.summaryContainer.innerHTML = `
      <span class="big">
        Median tenure before vs. after ${splitLabel}:<br>
        ${leftText} years vs. ${rightText} years
      </span>
      Showing ${this.filteredData.length} of ${this.allData.length} justices.
    `;
  }

  showTooltip(event, d) {
    const startYear = d.startDate ? d3.timeFormat("%Y")(d.startDate) : "";

    this.tooltip
      .style("display", "block")
      .html(`
        <div class="tooltip-name">${d.name || "Unknown justice"}</div>
        <div>Tenure: ${d3.format(".1f")(d.tenureYears)} years</div>
        <div>Start: ${startYear}</div>
        <div>End reason: ${d.endReason}</div>
      `);

    this.moveTooltip(event);
  }

  moveTooltip(event) {
    const [x, y] = d3.pointer(event, this.container);
    const containerRect = this.container.getBoundingClientRect();
    const tooltipNode = this.tooltip.node();
    const tooltipRect = tooltipNode.getBoundingClientRect();

    const pad = 12;
    const offsetX = 14;
    const offsetY = 14;

    let left = x + offsetX;
    let top = y - offsetY - tooltipRect.height;

    const maxLeft = containerRect.width - tooltipRect.width - pad;
    const maxTop = containerRect.height - tooltipRect.height - pad;

    if (left > maxLeft) left = x - tooltipRect.width - offsetX;
    if (left < pad) left = pad;

    if (top < pad) top = y + offsetY;
    if (top > maxTop) top = maxTop;
    if (top < pad) top = pad;

    this.tooltip
      .style("left", `${left}px`)
      .style("top", `${top}px`);
  }

  hideTooltip() {
    this.tooltip.style("display", "none");
  }
}