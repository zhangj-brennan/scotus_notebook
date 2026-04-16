import { CONFIG, getChartDimensions } from "./config.js";
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
    <div>At <strong>${d3.format(".1f")(threshold)}</strong> years, <strong>${stats.survived}</strong> out of <strong>${stats.total}</strong> justices stayed at least that long.</div>
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
  constructor({ container, summaryContainer, hintContainer }) {
    this.container = container;
    this.summaryContainer = summaryContainer;
    this.hintContainer = hintContainer;

    this.svg = null;
    this.g = {};
    this.scales = null;
    this.state = null;
    this.tooltip = null;
    this.chartDims = getChartDimensions();
    this.resizeRaf = null;
  }

  init(data) {
    d3.select(this.container).html("");

    this.chartDims = getChartDimensions(window.innerWidth);

    this.svg = d3.select(this.container)
      .append("svg")
      .attr("viewBox", `0 0 ${this.chartDims.width} ${this.chartDims.height}`);

    this.tooltip = d3.select(this.container)
      .append("div")
      .attr("class", "chart-tooltip")
      .style("display", "none");

    this.drawBase(data);
    this.setupResize(data);
  }

  setupResize(data) {
    window.addEventListener("resize", () => {
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);

      this.resizeRaf = requestAnimationFrame(() => {
        const nextDims = getChartDimensions(window.innerWidth);
        const changed =
          nextDims.width !== this.chartDims.width ||
          nextDims.height !== this.chartDims.height;

        if (!changed) return;

        this.chartDims = nextDims;
        d3.select(this.container).html("");

        this.svg = d3.select(this.container)
          .append("svg")
          .attr("viewBox", `0 0 ${this.chartDims.width} ${this.chartDims.height}`);

        this.tooltip = d3.select(this.container)
          .append("div")
          .attr("class", "chart-tooltip")
          .style("display", "none");

        this.g = {};
        this.drawBase(data);

        if (this.state) {
          this.renderScene(this.state.scene, this.state.sceneConfig, data);
        }
      });
    });
  }

  drawBase(data) {
    const { width, height, margin, xTicks, yTicks } = this.chartDims;
    const isMobile = window.innerWidth <= CONFIG.mobileBreakpoint;
    const axisFontSize = isMobile ? 24 : 24;
    const annotationFontSize = isMobile ? 30 : 24;
    const quadFontSize = isMobile ? 52 : 40;
    const quadSubFontSize = isMobile ? 16 : 13;

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

    const xGrid = d3.axisBottom(x).ticks(xTicks).tickSize(-innerHeight).tickFormat("");
    const yGrid = d3.axisLeft(y).ticks(yTicks).tickSize(-innerWidth).tickFormat("");

    this.svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${margin.top + innerHeight})`)
      .call(xGrid);

    this.svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yGrid);

    const xAxis = this.svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${margin.top + innerHeight})`)
      .call(d3.axisBottom(x).ticks(xTicks));

    const yAxis = this.svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(yTicks));

    xAxis.selectAll("text").style("font-size", `${axisFontSize}px`);
    yAxis.selectAll("text").style("font-size", `${axisFontSize}px`);

    this.svg.append("text")
      .attr("x", margin.left + innerWidth / 2)
      .attr("y", height - 2)
      .attr("text-anchor", "middle")
      .attr("class", "annotation")
      .style("font-size", `${annotationFontSize}px`)
      .text("Start date");

    this.svg.append("text")
      .attr("transform", `translate(10, ${margin.top + innerHeight / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("class", "annotation")
      .style("font-size", `${annotationFontSize}px`)
      .text("Years in office");

    this.g.dots = this.svg.append("g");

    this.g.hLine = this.svg.append("line")
      .attr("class", "threshold-line")
      .style("display", "none")
      .style("opacity", 1);

    this.g.vLine = this.svg.append("line")
      .attr("class", "threshold-line vertical")
      .style("display", "none")
      .style("opacity", 1);

    this.g.hHit = this.svg.append("line")
      .attr("class", "drag-hit")
      .style("display", "none");

    this.g.vHit = this.svg.append("line")
      .attr("class", "drag-hit vertical")
      .style("display", "none");

    this.g.hLabel = this.svg.append("text")
      .attr("class", "annotation")
      .attr("text-anchor", "end")
      .style("opacity", 1)
      .style("font-size", `${annotationFontSize}px`);

    this.g.vLabel = this.svg.append("text")
      .attr("class", "annotation")
      .attr("text-anchor", "start")
      .style("opacity", 1)
      .style("font-size", `${annotationFontSize}px`);

    this.g.medianLine = this.svg.append("line")
      .attr("class", "threshold-line median-line")
      .style("display", "none");

    this.g.medianLabel = this.svg.append("text")
      .attr("class", "annotation median-label")
      .attr("text-anchor", "end")
      .style("font-size", `${annotationFontSize}px`);

    this.g.quad = {
      tl: this.svg.append("text").attr("class", "quad-label").style("font-size", `${quadFontSize}px`),
      tlSub: this.svg.append("text").attr("class", "quad-sub").style("font-size", `${quadSubFontSize}px`),
      bl: this.svg.append("text").attr("class", "quad-label").style("font-size", `${quadFontSize}px`),
      blSub: this.svg.append("text").attr("class", "quad-sub").style("font-size", `${quadSubFontSize}px`),
      tr: this.svg.append("text").attr("class", "quad-label").style("font-size", `${quadFontSize}px`),
      trSub: this.svg.append("text").attr("class", "quad-sub").style("font-size", `${quadSubFontSize}px`),
      br: this.svg.append("text").attr("class", "quad-label").style("font-size", `${quadFontSize}px`),
      brSub: this.svg.append("text").attr("class", "quad-sub").style("font-size", `${quadSubFontSize}px`)
    };

    this.renderDots(data);
    this.hideOverlays();
  }

  renderDots(data) {
    const { x, y } = this.scales;
    const r = this.chartDims.pointRadius;

    this.g.dots.selectAll("circle")
      .data(data, d => `${d.name}-${+d.startDate}-${d.days}`)
      .join("circle")
      .attr("class", d => d.isCurrent ? "dot current" : "dot")
      .attr("cx", d => x(d.startDate))
      .attr("cy", d => y(d.tenureYears))
      .attr("r", r)
      .on("mouseenter", (event, d) => this.showTooltip(event, d))
      .on("mousemove", (event) => this.moveTooltip(event))
      .on("mouseleave", () => this.hideTooltip());
  }

  updateData(data) {
    this.renderDots(data);
    if (this.state) {
      this.renderScene(this.state.scene, this.state.sceneConfig, data);
    }
  }

  setHorizontalLineInteractive(isInteractive) {
    this.g.hLine.classed("is-draggable", isInteractive);
    this.g.hLabel.classed("is-draggable-label", isInteractive);
  }

  setVerticalLineInteractive(isInteractive) {
    this.g.vLine.classed("is-draggable", isInteractive);
    this.g.vLabel.classed("is-draggable-label", isInteractive);
  }

  hideOverlays() {
    this.setHorizontalLineInteractive(false);
    this.setVerticalLineInteractive(false);

    this.g.hLine.interrupt().style("display", "none").style("opacity", 1);
    this.g.vLine.interrupt().style("display", "none").style("opacity", 1);
    this.g.hHit.interrupt().style("display", "none");
    this.g.vHit.interrupt().style("display", "none");

    this.g.medianLine.interrupt().style("display", "none");
    this.g.medianLabel.interrupt().style("display", "none").text("");

    this.g.hLabel.interrupt().text("").style("opacity", 1);
    this.g.vLabel.interrupt().text("").style("opacity", 1);

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
    .style("display", null)
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

  setThresholdPosition(threshold) {
    const { y, margin, innerWidth } = this.scales;
    const yy = y(threshold);

    this.g.hLine
      .interrupt()
      .style("display", null)
      .attr("x1", margin.left)
      .attr("x2", margin.left + innerWidth)
      .attr("y1", yy)
      .attr("y2", yy);

    this.g.hHit
      .interrupt()
      .style("display", null)
      .attr("x1", margin.left)
      .attr("x2", margin.left + innerWidth)
      .attr("y1", yy)
      .attr("y2", yy);

    this.g.hLabel
      .interrupt()
      .attr("x", margin.left + innerWidth - 6)
      .attr("y", yy - 8)
      .text(`${d3.format(".1f")(threshold)} years`);
  }

  animateScene4Bounce(data, fromThreshold, toThreshold) {
    const { y, margin, innerWidth, yMax } = this.scales;

    const clampedTo = Math.max(0, Math.min(yMax, toThreshold));
    const direction = clampedTo > fromThreshold ? 1 : -1;
    const overshoot = Math.max(0.6, Math.min(1.4, Math.abs(clampedTo - fromThreshold) * 0.22));
    const bounceTarget = Math.max(0, Math.min(yMax, clampedTo + direction * overshoot));

    const bounceY = y(bounceTarget);
    const finalY = y(clampedTo);

    this.g.hLine
      .style("display", null)
      .attr("x1", margin.left)
      .attr("x2", margin.left + innerWidth)
      .attr("y1", y(fromThreshold))
      .attr("y2", y(fromThreshold))
      .transition()
      .duration(420)
      .ease(d3.easeBackOut.overshoot(2))
      .attr("y1", bounceY)
      .attr("y2", bounceY)
      .transition()
      .duration(220)
      .ease(d3.easeCubicOut)
      .attr("y1", finalY)
      .attr("y2", finalY);

    this.g.hHit
      .style("display", null)
      .attr("x1", margin.left)
      .attr("x2", margin.left + innerWidth)
      .attr("y1", y(fromThreshold))
      .attr("y2", y(fromThreshold))
      .transition()
      .duration(420)
      .ease(d3.easeBackOut.overshoot(2))
      .attr("y1", bounceY)
      .attr("y2", bounceY)
      .transition()
      .duration(220)
      .ease(d3.easeCubicOut)
      .attr("y1", finalY)
      .attr("y2", finalY);

    this.g.hLabel
      .attr("x", margin.left + innerWidth - 6)
      .attr("y", y(fromThreshold) - 8)
      .text(`${d3.format(".1f")(fromThreshold)} years`)
      .transition()
      .duration(420)
      .ease(d3.easeBackOut.overshoot(2))
      .attr("y", bounceY - 8)
      .tween("text", () => {
        const interp = d3.interpolateNumber(fromThreshold, bounceTarget);
        return (t) => {
          this.g.hLabel.text(`${d3.format(".1f")(interp(t))} years`);
        };
      })
      .transition()
      .duration(220)
      .ease(d3.easeCubicOut)
      .attr("y", finalY - 8)
      .tween("text", () => {
        const interp = d3.interpolateNumber(bounceTarget, clampedTo);
        return (t) => {
          this.g.hLabel.text(`${d3.format(".1f")(interp(t))} years`);
        };
      });

    d3.transition()
      .duration(420)
      .ease(d3.easeBackOut.overshoot(2))
      .tween("scene4-summary-a", () => {
        const interp = d3.interpolateNumber(fromThreshold, bounceTarget);
        return (t) => {
          const threshold = interp(t);
          const stats = countSurvivors(data, threshold);
          this.summaryContainer.innerHTML = buildSummaryThreshold(threshold, stats);
          this.updateThresholdStyling(threshold);
        };
      })
      .on("end", () => {
        d3.transition()
          .duration(220)
          .ease(d3.easeCubicOut)
          .tween("scene4-summary-b", () => {
            const interp = d3.interpolateNumber(bounceTarget, clampedTo);
            return (t) => {
              const threshold = interp(t);
              const stats = countSurvivors(data, threshold);
              this.summaryContainer.innerHTML = buildSummaryThreshold(threshold, stats);
              this.updateThresholdStyling(threshold);
            };
          });
      });

    this.state.sceneConfig.threshold = clampedTo;
  }

  renderScene(sceneName, sceneConfig, data) {
    const prevScene = this.state?.scene || null;
    const prevSceneConfig = this.state?.sceneConfig || null;
    this.state = { scene: sceneName, sceneConfig };

    const { x, y, margin, innerWidth, innerHeight } = this.scales;
    this.hideOverlays();

    if (sceneName === "scene1") {
      const median = d3.median(data, d => d.tenureYears) ?? 0;
      const threshold = sceneConfig.threshold ?? 10; // fallback if needed
      const stats = countSurvivors(data, threshold);

      this.summaryContainer.innerHTML = `
        <span class="big">Median tenure: ${d3.format(".1f")(median)} years<br>
        </span>
        <div>${stats.survived} out of ${stats.total} Justices, or 50% of all justices have served on the court over ${d3.format(".1f")(median)} years</div>
      `;

        this.drawMedianLine(median);

      // if (sceneConfig.threshold != null) {
      //   this.setThresholdPosition(sceneConfig.threshold);
      //   this.updateThresholdStyling(sceneConfig.threshold);
      // }

      return;
    }

    if (sceneConfig.threshold != null && sceneName !== "scene4") {
      const yy = y(sceneConfig.threshold);
      const prevThreshold = prevSceneConfig?.threshold;
      const shouldAnimateThreshold =
        prevScene &&
        prevScene !== sceneName &&
        prevThreshold != null &&
        sceneName !== "scene6";

      this.g.hLine
        .style("display", null)
        .attr("x1", margin.left)
        .attr("x2", margin.left + innerWidth);

      this.g.hLabel
        .text(`${d3.format(".1f")(sceneConfig.threshold)} years`);

      if (shouldAnimateThreshold) {
        const prevY = y(prevThreshold);

        this.g.hLine
          .attr("y1", prevY)
          .attr("y2", prevY)
          .transition()
          .duration(700)
          .ease(d3.easeCubicInOut)
          .attr("y1", yy)
          .attr("y2", yy);

        this.g.hLabel
          .attr("x", margin.left + innerWidth - 6)
          .attr("y", prevY - 8)
          .transition()
          .duration(700)
          .ease(d3.easeCubicInOut)
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
      const prevSplit = prevSceneConfig?.splitDate;
      const shouldAnimateSplit =
        prevScene &&
        prevScene !== sceneName &&
        prevSplit &&
        sceneName !== "scene6";

      this.g.vLine
        .style("display", null)
        .attr("y1", margin.top)
        .attr("y2", margin.top + innerHeight);

      this.g.vLabel
        .text(d3.timeFormat("%Y")(sceneConfig.splitDate));

      if (shouldAnimateSplit) {
        this.g.vLine
          .transition()
          .duration(700)
          .ease(d3.easeCubicInOut)
          .attr("x1", xx)
          .attr("x2", xx);

        this.g.vLabel
          .transition()
          .duration(700)
          .ease(d3.easeCubicInOut)
          .attr("x", xx + 6)
          .attr("y", margin.top + 16);
      } else {
        this.g.vLine
          .attr("x1", xx)
          .attr("x2", xx);

        this.g.vLabel
          .attr("x", xx + 6)
          .attr("y", margin.top + 16);
      }
    }

    if (sceneName === "scene2" || sceneName === "scene3") {
      const stats = countSurvivors(data, sceneConfig.threshold);
      this.summaryContainer.innerHTML = buildSummaryThreshold(sceneConfig.threshold, stats);
      this.updateThresholdStyling(sceneConfig.threshold);
      return;
    }

    if (sceneName === "scene4") {
      const cameFromThresholdScene =
        prevScene &&
        prevScene !== sceneName &&
        prevSceneConfig &&
        prevSceneConfig.threshold != null;

      this.hintContainer.textContent = "Drag the red dashed line vertically.";
      this.setHorizontalLineInteractive(true);

      if (cameFromThresholdScene) {
        this.animateScene4Bounce(data, prevSceneConfig.threshold, sceneConfig.threshold);
      } else {
        const stats = countSurvivors(data, sceneConfig.threshold);
        this.summaryContainer.innerHTML = buildSummaryThreshold(sceneConfig.threshold, stats);
        this.updateThresholdStyling(sceneConfig.threshold);
        this.setThresholdPosition(sceneConfig.threshold);
      }

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
      this.setThresholdPosition(sceneConfig.threshold);
      this.setHorizontalLineInteractive(true);
      this.setVerticalLineInteractive(true);
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

    this.g.quad.tl.attr("x", xLeftCenter).attr("y", yTopCenter).text(pct(counts.left.topRate));
    this.g.quad.tlSub.attr("x", xLeftCenter).attr("y", yTopCenter + 26).text(`before ${splitYearText}: ${counts.left.top}/${counts.left.total}`);

    this.g.quad.bl.attr("x", xLeftCenter).attr("y", yBottomCenter).text(pct(counts.left.bottomRate));
    this.g.quad.blSub.attr("x", xLeftCenter).attr("y", yBottomCenter + 26).text(`before ${splitYearText}: below`);

    this.g.quad.tr.attr("x", xRightCenter).attr("y", yTopCenter).text(pct(counts.right.topRate));
    this.g.quad.trSub.attr("x", xRightCenter).attr("y", yTopCenter + 26).text(`${splitYearText}+ : ${counts.right.top}/${counts.right.total}`);

    this.g.quad.br.attr("x", xRightCenter).attr("y", yBottomCenter).text(pct(counts.right.bottomRate));
    this.g.quad.brSub.attr("x", xRightCenter).attr("y", yBottomCenter + 26).text(`${splitYearText}+ : below`);
  }

  enableHorizontalDrag(data, keepVertical = false) {
    const { y, margin, innerWidth, yMax } = this.scales;
    const initialY = y(this.state.sceneConfig.threshold);

    this.g.hHit
      .style("display", null)
      .attr("x1", margin.left)
      .attr("x2", margin.left + innerWidth)
      .attr("y1", initialY)
      .attr("y2", initialY)
      .call(
        d3.drag().on("drag", (event) => {
          const threshold = Math.max(0, Math.min(yMax, y.invert(event.y)));
          this.state.sceneConfig.threshold = threshold;

          const yy = y(threshold);

          this.g.hLine
            .interrupt()
            .attr("y1", yy)
            .attr("y2", yy);

          this.g.hHit
            .interrupt()
            .attr("y1", yy)
            .attr("y2", yy);

          this.g.hLabel
            .interrupt()
            .attr("x", margin.left + innerWidth - 6)
            .attr("y", yy - 8)
            .text(`${d3.format(".1f")(threshold)} years`);

          this.updateThresholdStyling(threshold);

          if (!keepVertical) {
            const stats = countSurvivors(data, threshold);
            this.summaryContainer.innerHTML = buildSummaryThreshold(threshold, stats);
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

          this.state.sceneConfig.splitYear = +d3.timeFormat("%Y")(this.state.sceneConfig.splitDate);
          this.renderScene("scene6", this.state.sceneConfig, data);
        })
      );
  }
}