import { CONFIG } from "./config.js";
import { pct, pct1 } from "./utils.js";

export function countSurvivors(data, thresholdYears) {
  const survived = data.filter(d => d.tenureYears >= thresholdYears).length;
  const total = data.length;
  return { survived, total, rate: total ? survived / total : 0 };
}

export function splitCounts(data, splitDate, thresholdYears) {
  const left = data.filter(d => d.startDate < splitDate);
  const right = data.filter(d => d.startDate >= splitDate);

  const leftTop = left.filter(d => d.tenureYears >= thresholdYears).length;
  const leftBottom = left.length - leftTop;
  const rightTop = right.filter(d => d.tenureYears >= thresholdYears).length;
  const rightBottom = right.length - rightTop;

  return {
    left: {
      total: left.length,
      top: leftTop,
      bottom: leftBottom,
      topRate: left.length ? leftTop / left.length : 0,
      bottomRate: left.length ? leftBottom / left.length : 0
    },
    right: {
      total: right.length,
      top: rightTop,
      bottom: rightBottom,
      topRate: right.length ? rightTop / right.length : 0,
      bottomRate: right.length ? rightBottom / right.length : 0
    }
  };
}

export function buildSummaryThreshold(threshold, stats) {
  return `
    <span class="big">${pct1(stats.rate)}</span>
    <div>At <strong>${d3.format(".1f")(threshold)}</strong> years, <strong>${stats.survived}</strong> out of <strong>${stats.total}</strong> justices stayed in office at least that long.</div>
  `;
}

export function buildSummarySplit(splitYear, threshold, counts) {
  return `
    <span class="big">${splitYear} split · ${d3.format(".1f")(threshold)} years</span>
    <div>Before <strong>${splitYear}</strong>, <strong>${counts.left.top}</strong> out of <strong>${counts.left.total}</strong> stayed at least that long: <strong>${pct1(counts.left.topRate)}</strong>.</div>
    <div style="margin-top:8px;">${splitYear} and after, <strong>${counts.right.top}</strong> out of <strong>${counts.right.total}</strong> did: <strong>${pct1(counts.right.topRate)}</strong>.</div>
  `;
}

export class ScatterSurvivalChart {
  constructor({ container, summaryContainer, titleContainer, labelContainer, hintContainer }) {
    this.container = container;
    this.summaryContainer = summaryContainer;
    this.titleContainer = titleContainer;
    this.labelContainer = labelContainer;
    this.hintContainer = hintContainer;

    this.svg = null;
    this.g = {};
    this.scales = null;
    this.state = null;
    this.tooltip = null;
  }

  init(data) {
    d3.select(this.container).html("");

    this.svg = d3.select(this.container)
      .append("svg")
      .attr("viewBox", `0 0 ${CONFIG.chart.width} ${CONFIG.chart.height}`);

    this.tooltip = d3.select(this.container)
      .append("div")
      .attr("class", "chart-tooltip")
      .style("display", "none");

    this.drawBase(data);
  }

  drawBase(data) {
    const { width, height, margin } = CONFIG.chart;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const maxYears = d3.max(data, d => d.tenureYears) || 0;
    const yMax = Math.ceil(maxYears + CONFIG.yAxisMaxPaddingYears);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.startDate))
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
      innerHeight,
      minDate: d3.min(data, d => d.startDate),
      maxDate: d3.max(data, d => d.startDate)
    };

    const xGrid = d3.axisBottom(x).ticks(8).tickSize(-innerHeight).tickFormat("");
    const yGrid = d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat("");

    this.svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${margin.top + innerHeight})`)
      .call(xGrid);

    this.svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yGrid);

    this.svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${margin.top + innerHeight})`)
      .call(d3.axisBottom(x).ticks(8));

    this.svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6));

    this.svg.append("text")
      .attr("x", margin.left + innerWidth / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("class", "annotation")
      .text("Start date");

    this.svg.append("text")
      .attr("transform", `translate(20, ${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("class", "annotation")
      .text("Years in office");

    this.g.dots = this.svg.append("g");

    this.g.hLine = this.svg.append("line")
      .attr("class", "threshold-line")
      .style("display", "none");

    this.g.vLine = this.svg.append("line")
      .attr("class", "threshold-line vertical")
      .style("display", "none");

    this.g.hHit = this.svg.append("line")
      .attr("class", "drag-hit")
      .style("display", "none");

    this.g.vHit = this.svg.append("line")
      .attr("class", "drag-hit vertical")
      .style("display", "none");

    this.g.hLabel = this.svg.append("text")
      .attr("class", "annotation")
      .attr("text-anchor", "end");

    this.g.vLabel = this.svg.append("text")
      .attr("class", "annotation")
      .attr("text-anchor", "start");

    this.g.medianLine = this.svg.append("line")
      .attr("class", "threshold-line median-line")
      .style("display", "none");

    this.g.medianLabel = this.svg.append("text")
      .attr("class", "annotation median-label")
      .attr("text-anchor", "end");

    this.g.quad = {
      tl: this.svg.append("text").attr("class", "quad-label"),
      tlSub: this.svg.append("text").attr("class", "quad-sub"),
      bl: this.svg.append("text").attr("class", "quad-label"),
      blSub: this.svg.append("text").attr("class", "quad-sub"),
      tr: this.svg.append("text").attr("class", "quad-label"),
      trSub: this.svg.append("text").attr("class", "quad-sub"),
      br: this.svg.append("text").attr("class", "quad-label"),
      brSub: this.svg.append("text").attr("class", "quad-sub")
    };

    this.renderDots(data);
    this.hideOverlays();
  }

  renderDots(data) {
    const { x, y } = this.scales;

    this.g.dots.selectAll("circle")
      .data(data, d => `${d.name}-${+d.startDate}-${d.days}`)
      .join("circle")
      .attr("class", d => d.isCurrent ? "dot current" : "dot")
      .attr("cx", d => x(d.startDate))
      .attr("cy", d => y(d.tenureYears))
      .attr("r", CONFIG.pointRadius)
      .on("mouseenter", (event, d) => this.showTooltip(event, d))
      .on("mousemove", (event, d) => this.moveTooltip(event, d))
      .on("mouseleave", () => this.hideTooltip());
  }

  updateData(data) {
    this.renderDots(data);

    if (this.state) {
      this.renderScene(this.state.scene, this.state.sceneConfig, data);
    }
  }

  hideOverlays() {
    this.g.hLine.interrupt().style("display", "none");
    this.g.vLine.interrupt().style("display", "none");
    this.g.hHit.interrupt().style("display", "none");
    this.g.vHit.interrupt().style("display", "none");

    this.g.medianLine.interrupt().style("display", "none");
    this.g.medianLabel.interrupt().text("");

    this.g.hLabel.interrupt().text("");
    this.g.vLabel.interrupt().text("");

    this.g.dots.selectAll("circle")
      .interrupt()
      .classed("above-threshold", false)
      .classed("below-threshold", false);

    Object.values(this.g.quad).forEach(node => node.interrupt().text(""));
    this.hintContainer.textContent = "";
  }

  drawMedianLine(median) {
    const { y, margin, innerWidth } = this.scales;
    const yy = y(median);

    this.g.medianLine
      .style("display", null)
      .attr("x1", margin.left)
      .attr("x2", margin.left + innerWidth)
      .attr("y1", yy)
      .attr("y2", yy);

    this.g.medianLabel
      .attr("x", margin.left + innerWidth - 6)
      .attr("y", yy - 8)
      .text(`Median: ${d3.format(".1f")(median)} years`);
  }

  updateThresholdStyling(threshold) {
    this.g.dots.selectAll("circle")
      .classed("above-threshold", d => d.tenureYears >= threshold)
      .classed("below-threshold", d => d.tenureYears < threshold);
  }

  showTooltip(event, d) {
    const startYear = d.startDate ? d3.timeFormat("%Y")(d.startDate) : "";

    this.tooltip
      .style("display", "block")
      .html(`
        <div class="tooltip-name">${d.name || "Unknown justice"}</div>
        <div>Tenure: ${d3.format(".1f")(d.tenureYears)} years</div>
        <div>Start: ${startYear}</div>
      `);

    this.moveTooltip(event);
  }

  moveTooltip(event) {
    const [x, y] = d3.pointer(event, this.container);

    this.tooltip
      .style("left", `${x + 14}px`)
      .style("top", `${y - 14}px`);
  }

  hideTooltip() {
    this.tooltip.style("display", "none");
  }

  renderScene(sceneName, sceneConfig, data) {
    this.state = { scene: sceneName, sceneConfig };
    this.labelContainer.textContent = sceneConfig.label;
    this.titleContainer.textContent = sceneConfig.title;

    const { x, y, margin, innerWidth, innerHeight } = this.scales;
    this.hideOverlays();

    if (sceneName === "scene1") {
      const median = d3.median(data, d => d.tenureYears) ?? 0;

      this.summaryContainer.innerHTML = `
        <span class="big">${d3.format(".1f")(median)} years</span>
        <div>Overall median tenure of the justices shown.</div>
      `;

      // this.drawMedianLine(median);
      return;
    }
if (sceneConfig.threshold != null) {
  const yy = y(sceneConfig.threshold);
  const animateThreshold = sceneName === "scene2" || sceneName === "scene3";

  this.g.hLine
    .interrupt()
    .style("display", null)
    .attr("x1", margin.left)
    .attr("x2", margin.left + innerWidth);

  this.g.hLabel
    .interrupt()
    .text(`${d3.format(".1f")(sceneConfig.threshold)} years`);

  if (animateThreshold) {
    this.g.hLine
      .transition()
      .duration(700)
      .ease(d3.easeCubicInOut)
      .attr("y1", yy)
      .attr("y2", yy);

    this.g.hLabel
      .transition()
      .duration(700)
      .ease(d3.easeCubicInOut)
      .attr("x", margin.left + innerWidth - 6)
      .attr("y", yy - 8);
  } else {
    this.g.hLine
      .attr("y1", yy)
      .attr("y2", yy);

    this.g.hLabel
      .attr("x", margin.left + innerWidth - 6)
      .attr("y", yy - 8);
  }
}

    if (sceneConfig.splitDate) {
      const xx = x(sceneConfig.splitDate);

      this.g.vLine
        .style("display", null)
        .attr("x1", xx)
        .attr("x2", xx)
        .attr("y1", margin.top)
        .attr("y2", margin.top + innerHeight);

      this.g.vLabel
        .attr("x", xx + 6)
        .attr("y", margin.top + 16)
        .text(d3.timeFormat("%Y")(sceneConfig.splitDate));
    }

    if (sceneName === "scene2" || sceneName === "scene3") {
      const stats = countSurvivors(data, sceneConfig.threshold);
      this.summaryContainer.innerHTML = buildSummaryThreshold(sceneConfig.threshold, stats);
      this.updateThresholdStyling(sceneConfig.threshold);
      return;
    }

    if (sceneName === "scene4") {
      const stats = countSurvivors(data, sceneConfig.threshold);
      this.summaryContainer.innerHTML = buildSummaryThreshold(sceneConfig.threshold, stats);
      this.hintContainer.textContent = "Drag the red dashed line vertically.";
      this.enableHorizontalDrag(data);
      return;
    }

    if (sceneName === "scene5") {
      const counts = splitCounts(data, sceneConfig.splitDate, sceneConfig.threshold);
      this.summaryContainer.innerHTML = buildSummarySplit(sceneConfig.splitYear, sceneConfig.threshold, counts);
      this.renderQuadrants(counts, sceneConfig.splitDate, sceneConfig.threshold);
      return;
    }

    if (sceneName === "scene6") {
      const counts = splitCounts(data, sceneConfig.splitDate, sceneConfig.threshold);
      this.summaryContainer.innerHTML = buildSummarySplit(sceneConfig.splitYear, sceneConfig.threshold, counts);
      this.renderQuadrants(counts, sceneConfig.splitDate, sceneConfig.threshold);
      this.hintContainer.textContent = "Drag the red horizontal line and the blue vertical line.";
      this.enableHorizontalDrag(data, true);
      this.enableVerticalDrag(data);
    }
  }

  renderQuadrants(counts, splitDate, threshold) {
    const { x, y, margin, innerWidth, innerHeight } = this.scales;
    const xx = x(splitDate);
    const yy = y(threshold);
    const splitYearText = d3.timeFormat("%Y")(splitDate);

    const xLeftCenter = (margin.left + xx) / 2;
    const xRightCenter = (xx + margin.left + innerWidth) / 2;
    const yTopCenter = (margin.top + yy) / 2;
    const yBottomCenter = (yy + margin.top + innerHeight) / 2;

    this.g.quad.tl
      .attr("x", xLeftCenter)
      .attr("y", yTopCenter)
      .text(pct(counts.left.topRate));

    this.g.quad.tlSub
      .attr("x", xLeftCenter)
      .attr("y", yTopCenter + 26)
      .text(`before ${splitYearText}: ${counts.left.top}/${counts.left.total}`);

    this.g.quad.bl
      .attr("x", xLeftCenter)
      .attr("y", yBottomCenter)
      .text(pct(counts.left.bottomRate));

    this.g.quad.blSub
      .attr("x", xLeftCenter)
      .attr("y", yBottomCenter + 26)
      .text(`before ${splitYearText}: below`);

    this.g.quad.tr
      .attr("x", xRightCenter)
      .attr("y", yTopCenter)
      .text(pct(counts.right.topRate));

    this.g.quad.trSub
      .attr("x", xRightCenter)
      .attr("y", yTopCenter + 26)
      .text(`${splitYearText}+ : ${counts.right.top}/${counts.right.total}`);

    this.g.quad.br
      .attr("x", xRightCenter)
      .attr("y", yBottomCenter)
      .text(pct(counts.right.bottomRate));

    this.g.quad.brSub
      .attr("x", xRightCenter)
      .attr("y", yBottomCenter + 26)
      .text(`${splitYearText}+ : below`);
  }

  enableHorizontalDrag(data, keepVertical = false) {
    const { y, margin, innerWidth, yMax } = this.scales;

    this.g.hHit
      .style("display", null)
      .attr("x1", margin.left)
      .attr("x2", margin.left + innerWidth)
      .attr("y1", y(this.state.sceneConfig.threshold))
      .attr("y2", y(this.state.sceneConfig.threshold))
      .call(
        d3.drag().on("drag", (event) => {
          this.state.sceneConfig.threshold = Math.max(
            0,
            Math.min(yMax, y.invert(event.y))
          );

          if (!keepVertical) {
            this.renderScene("scene4", this.state.sceneConfig, data);
          } else {
            this.renderScene("scene6", this.state.sceneConfig, data);
          }
        })
      );
  }

  enableVerticalDrag(data) {
    const { x, margin, innerHeight, minDate, maxDate } = this.scales;

    this.g.vHit
      .style("display", null)
      .attr("y1", margin.top)
      .attr("y2", margin.top + innerHeight)
      .attr("x1", x(this.state.sceneConfig.splitDate))
      .attr("x2", x(this.state.sceneConfig.splitDate))
      .call(
        d3.drag().on("drag", (event) => {
          const date = x.invert(event.x);

          this.state.sceneConfig.splitDate = new Date(
            Math.max(+minDate, Math.min(+maxDate, +date))
          );

          this.state.sceneConfig.splitYear = +d3.timeFormat("%Y")(
            this.state.sceneConfig.splitDate
          );

          this.renderScene("scene6", this.state.sceneConfig, data);
        })
      );
  }
}