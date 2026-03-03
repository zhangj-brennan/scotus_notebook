function drawTenureScatterGrid(justices, {
  selector = "#tenureScatterGrid",
  width = 400,
  height = 220,
  margin = { top: 12, right: 10, bottom: 32, left: 62 }
} = {}) {
  width = 400

  const HILITE_X0 = new Date(1976, 0, 1);
  const HILITE_X1 = new Date();   // present
  const HILITE_Y0 = 0;
  const HILITE_Y1 = 20;

  // ---- container split: meta + grid ----
  const container = d3.select(selector);
  container.selectAll("*").remove();

  const meta = container.append("div")
    .attr("class", "scatter-meta")
    .style("font-family", "Benton")
    .style("font-size", "13px")
    .style("margin", "6px 0 10px");

  const root = container.append("div")
    .attr("class", "scatter-grid");

  // Shared tooltip (reuse existing #tooltip if present)
  const tooltip = d3.select("#tooltip").empty()
    ? d3.select("body").append("div").attr("id","tooltip").attr("class","tooltip")
    : d3.select("#tooltip");

  // ---- helpers ----
  const parseBirthYear = (v) => {
    const y = Number(String(v ?? "").trim());
    if (!Number.isFinite(y)) return null;
    return new Date(y, 0, 1);
  };

  const ageYears = (birthYear, at) => {
    if (!(at instanceof Date)) return null;
    const birth_dt = parseBirthYear(birthYear);
    if (!birth_dt) return null;
    return (at - birth_dt) / (365.2425 * 24 * 60 * 60 * 1000);
  };

  const getEndReason = (d) => String(d.endReason ?? d["end reason"] ?? "").trim();

  const colorFor = (d) => {
    // CURRENT = red (per your key)
    if (d.isCurrent) return COLORS.red;
    return COLORS.grey;
  };

  const idFor = (d) => String(d["justice number order"] ?? d["first last"] ?? "").trim();

  const data = justices
    .map(d => ({
      ...d,
      _id: idFor(d),
      startAge: ageYears(d.birth, d.start_dt),
      endAge: ageYears(d.birth, d.end_dt)
    }))
    .filter(d => d._id && Number.isFinite(d.tenure_years));

  // ---- shared Y scale (tenure) ----
  const innerH = height - margin.top - margin.bottom;

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.tenure_years))
    .nice()
    .range([innerH, 0]);

  const yAxis = d3.axisLeft(y).ticks(5);

  // ---- panel definitions ----
  const panels = [
    { key: "start_dt", label: "Start date",   scale: d3.scaleTime() },
    { key: "end_dt",   label: "End date",     scale: d3.scaleTime() },
    { key: "startAge", label: "Age at start", scale: d3.scaleLinear() },
    { key: "endAge",   label: "Age at end",   scale: d3.scaleLinear() }
  ];

  // =========================
  // Cross-brushing state
  // =========================
  let selectedIds = new Set(); // persistent selection from brushing
  let lastBrushText = "Brush: —";

  const fmtYear = d3.timeFormat("%Y");
  const fmtNum = (v) => (Number.isFinite(v) ? v.toFixed(1) : "—");

const medianTenureOfSelection = () => {
  if (selectedIds.size === 0) return null;
  const vals = data
    .filter(d => selectedIds.has(d._id))
    .map(d => d.tenure_years)
    .filter(Number.isFinite)
    .sort((a,b) => a - b);

  if (!vals.length) return null;
  const mid = Math.floor(vals.length / 2);
  return (vals.length % 2)
    ? vals[mid]
    : (vals[mid - 1] + vals[mid]) / 2;
};

function updateMetaText() {
  const n = selectedIds.size;
  const med = medianTenureOfSelection();
  const medTxt = Number.isFinite(med) ? `${fmtNum(med)} yrs` : "—";

  meta.html(
    `<strong>Selected:</strong> ${n} justice${n === 1 ? "" : "s"} ` +
    `(<strong>Median tenure:</strong> ${medTxt})` +
    ` &nbsp; | &nbsp; <strong>${lastBrushText}</strong>`
  );
}

  function brushRangeText(panel, sel, xScale) {
    if (!sel) return "Brush: —";

    const [[x0, y0], [x1, y1]] = sel;

    // X range
    const xv0 = xScale.invert(Math.min(x0, x1));
    const xv1 = xScale.invert(Math.max(x0, x1));

    let xText = "";
    if (panel.key === "start_dt" || panel.key === "end_dt") {
      xText = `${fmtYear(xv0)}–${fmtYear(xv1)}`;
    } else {
      xText = `${fmtNum(xv0)}–${fmtNum(xv1)}`;
    }

    // Tenure (Y) range (note: y pixel increases downward)
    const tMax = y.invert(Math.min(y0, y1)); // top of brush = higher tenure
    const tMin = y.invert(Math.max(y0, y1)); // bottom of brush = lower tenure
    const yText = `${fmtNum(tMin)}–${fmtNum(tMax)} yrs`;

    return `Brush: X (${panel.label}) ${xText} • Tenure ${yText}`;
  }

  function applySelection(){
    const dots = root.selectAll(".scatter-dot");

    if (selectedIds.size === 0){
      dots.classed("is-dim", false)
        .classed("is-selected", false)
        .classed("is-active", false)
        .attr("r", 3);
      updateMetaText();
      return;
    }

    dots
      .classed("is-selected", function(){ return selectedIds.has(this.getAttribute("data-id")); })
      .classed("is-dim", function(){ return !selectedIds.has(this.getAttribute("data-id")); })
      .classed("is-active", false)
      .attr("r", function(){
        const id = this.getAttribute("data-id");
        return selectedIds.has(id) ? 5 : 3;
      });

    updateMetaText();
  }

  function clearSelection(){
    selectedIds = new Set();
    lastBrushText = "Brush: —";
    applySelection();
  }

  // ---- hover highlight controller (respects brushing) ----
  function setActive(activeId, event, d){
    const dots = root.selectAll(".scatter-dot");

    if (selectedIds.size === 0){
      dots.classed("is-dim", true).classed("is-active", false).attr("r", 3);

      dots.filter(function(){
        return this.getAttribute("data-id") === activeId;
      })
      .classed("is-dim", false)
      .classed("is-active", true)
      .attr("r", 6)
      .raise();
    } else {
      dots.filter(function(){
        return this.getAttribute("data-id") === activeId;
      })
      .attr("r", 7)
      .raise();
    }

    const name = d["first last"] ?? d.name ?? "";
    const sy = d.start_dt ? d.start_dt.getFullYear() : "—";
    const ey = d.isCurrent ? "Present" : (d.end_dt ? d.end_dt.getFullYear() : "—");
    const reason = getEndReason(d) || (d.isCurrent ? "Current" : "");

    tooltip
      .style("opacity", 1)
      .html(`
        <strong>${name}</strong><br>
        Tenure: ${d.tenure_label ?? (d.tenure_years.toFixed(1) + " years")}<br>
        ${sy}–${ey}<br>
        ${reason}
      `)
      .style("left", (event.clientX + 10) + "px")
      .style("top", (event.clientY + 10) + "px");
  }

  function clearActive(){
    tooltip.style("opacity", 0);
    applySelection();
  }

  // =========================
  // Draw panels + add brushes
  // =========================
  panels.forEach(panel => {
    const card = root.append("div").attr("class","scatter-card");

    card.append("div")
      .attr("class","scatter-title")
      .text(panel.label);

    const svg = card.append("svg")
      .attr("width", width)
      .attr("height", height);

    const innerW = width - margin.left - margin.right;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // x scale
    const vals = data.map(d => d[panel.key]).filter(v => v != null);
    panel.scale
      .domain(d3.extent(vals))
      .nice()
      .range([0, innerW]);

    const xAxis = d3.axisBottom(panel.scale).ticks(5);

    // axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis);

    g.append("g").call(yAxis);

    // y-axis label (per panel)
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -margin.left + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text("Tenure in Years");

    // Highlight region for time-based panels only
    if (panel.key === "start_dt" || panel.key === "end_dt") {
      const x0 = panel.scale(HILITE_X0);
      const x1 = panel.scale(HILITE_X1);
      const yTop = y(HILITE_Y1);
      const yBot = y(HILITE_Y0);

      g.append("rect")
        .attr("class", "focus-box")
        .attr("x", Math.min(x0, x1))
        .attr("y", Math.min(yTop, yBot))
        .attr("width", Math.abs(x1 - x0))
        .attr("height", Math.abs(yBot - yTop))
        .attr("fill", COLORS.yellow)
        .attr("fill-opacity", 0.18)
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.35);
    }

    // dots
    g.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "scatter-dot")
      .attr("data-id", d => d._id)
      .attr("cx", d => panel.scale(d[panel.key]))
      .attr("cy", d => y(d.tenure_years))
      .attr("r", 3)
      .attr("fill", colorFor)
      .attr("opacity", 0.75)
      .on("mouseenter", function(event, d){ setActive(d._id, event, d); })
      .on("mousemove", function(event){
        tooltip
          .style("left", (event.clientX + 10) + "px")
          .style("top", (event.clientY + 10) + "px");
      })
      .on("mouseleave", function(){ clearActive(); });

    // -------------------------
    // Brush layer (cross-panel)
    // -------------------------
    const brush = d3.brush()
      .extent([[0, 0], [innerW, innerH]])
      .on("start brush end", brushed);

    const brushG = g.append("g")
      .attr("class", "brush")
      .call(brush);
brushG.lower();
    function brushed(event){
      const sel = event.selection;

      // keep the meta range updated while brushing
      lastBrushText = brushRangeText(panel, sel, panel.scale);
      updateMetaText();

      // If brush cleared
      if (!sel){
        if (event.type === "end" && !event.sourceEvent?.shiftKey){
          clearSelection();
        }
        return;
      }

      const [[x0, y0], [x1, y1]] = sel;

      // IDs inside brush for THIS panel
      const idsInBrush = new Set();
      for (const d of data){
        const xv = d[panel.key];
        if (xv == null) continue;

        const cx = panel.scale(xv);
        const cy = y(d.tenure_years);

        if (cx >= Math.min(x0,x1) && cx <= Math.max(x0,x1) && cy >= Math.min(y0,y1) && cy <= Math.max(y0,y1)){
          idsInBrush.add(d._id);
        }
      }

      // Shift-add; otherwise replace
      const shift = !!event.sourceEvent?.shiftKey;
      if (shift){
        for (const id of idsInBrush) selectedIds.add(id);
      } else {
        selectedIds = idsInBrush;
      }

      applySelection();
    }
  });

  // initial state
  lastBrushText = "Brush: —";
  applySelection();
}