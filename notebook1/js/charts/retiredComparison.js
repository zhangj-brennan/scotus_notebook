// ============================================================
// 3×3 Histogram Grid: Everyone vs Retired vs Died-on-Court
// Metrics: Age at start, Age at end, Tenure length
// Shared X scale + shared bins + shared Y scale PER metric
// Includes Mean + Median text + global Percent toggle (counts ↔ %)
// Assumes consolidated "justices" objects have:
//   - start_dt (Date)
//   - end_dt (Date)
//   - tenure_years (Number)
//   - isCurrent (Boolean)   (optional; not required for groups below)
//   - birth (date string)
//   - end reason (string) OR endReason (string)
// End reason values are standardized to: "Retired" and "Died" (per user).
// ============================================================

// ---------- 1) Small helper: wire one toggle for all charts ----------
function wireHistogramPercentToggle(justices, {
  toggleSelector = "#histPercentToggle",
  chartSelector = "#histGrid",
  bins = 18,
  width = 360,
  height = 150
} = {}) {
  let histAsPercent = false;

  function render() {
    drawHistGrid3Groups(justices, {
      selector: chartSelector,
      bins,
      width,
      height,
      asPercent: histAsPercent
    });
  }

  // initial
  render();

  // toggle
  d3.select(toggleSelector).on("change", function () {
    histAsPercent = !!this.checked;
    render();
  });
}

// ---------- 2) Main draw: 3 groups × 3 metrics = 9 charts ----------
function drawHistGrid3Groups(justices, {
  selector = "#histGrid",
  width = 360,
  height = 150,
  margin = { top: 10, right: 10, bottom: 26, left: 38 },
  bins = 18,
  asPercent = false
} = {}) {
  const root = d3.select(selector);
  root.selectAll("*").remove();

  // Ensure grid is 3 columns (you can also do this in CSS)
  root.style("display", "grid")
    .style("grid-template-columns", "1fr 1fr 1fr")
    .style("gap", "14px");

  // ----- date parsing (birth) -----
  const isNA = (v) => {
    const s = String(v ?? "").trim().toUpperCase();
    return s === "" || s === "NA" || s === "N/A" || s === "NULL" || s === "NONE";
  };

  const parseDateFlexible = (v) => {
    const s = String(v ?? "").trim();
    if (isNA(s)) return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const dt = new Date(s + "T00:00:00");
      return isNaN(dt) ? null : dt;
    }
    // M/D/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));

    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
  };

  // Age in years (float)
  const ageYears = (birth, at) => {
    if (!(birth instanceof Date) || !(at instanceof Date)) return null;
    return (at - birth) / (365.2425 * 24 * 60 * 60 * 1000);
  };

  const getEndReason = (d) => {
    // prefer normalized camelCase if present, else raw header
    const r = String(d.endReason ?? d["end reason"] ?? "").trim();
    return r;
  };

  // ----- derive metrics -----
  const data = justices.map(d => {
    const birth_dt = parseDateFlexible(d.birth);
    return {
      ...d,
      birth_dt,
      startAge: ageYears(birth_dt, d.start_dt),
      endAge: ageYears(birth_dt, d.end_dt),
      tenureYears: Number.isFinite(d.tenure_years) ? d.tenure_years : null,
      endReasonNorm: getEndReason(d)
    };
  });

  // Groups (authoritative rules per user)
  const everyone = data;
  const retiredOnly = data.filter(d => d.endReasonNorm === "Retired");
  const diedOnCourt = data.filter(d => d.endReasonNorm === "Died");

  // Colors (falls back if COLORS not defined)
  const C = (typeof COLORS !== "undefined" && COLORS) ? COLORS : {
    grey: "#B0B0B0",
    yellow: "#FFCF01",
    red: "#ED1C24"
  };

  const groups = [
    { key: "everyone", label: "Everyone", rows: everyone, fill: C.grey },
    { key: "retired",  label: "Retired",  rows: retiredOnly, fill: C.dark },
    { key: "died",     label: "Died",     rows: diedOnCourt, fill: C.grey }
  ];

  const metrics = [
    { key: "tenureYears", label: "Tenure", fmt: v => v.toFixed(1) },
    { key: "startAge",    label: "Age at start",  fmt: v => v.toFixed(1) },
    { key: "endAge",      label: "Age at end",    fmt: v => v.toFixed(1) }
  ];

  // ----- precompute shared X, shared bins, shared Y per metric -----
  const prep = new Map();

  for (const m of metrics) {
    // Use everyone for the x-domain (stable comparison baseline)
    const valsAll = everyone.map(d => d[m.key]).filter(Number.isFinite);
    if (!valsAll.length) continue;

    const xTmp = d3.scaleLinear().domain(d3.extent(valsAll)).nice();
    const thresholds = xTmp.ticks(bins);

    const binGen = d3.bin()
      .domain(xTmp.domain())
      .thresholds(thresholds);

    const binnedByGroup = {};
    const nByGroup = {};
    const statsByGroup = {};

    for (const gspec of groups) {
      const vals = gspec.rows.map(d => d[m.key]).filter(Number.isFinite);
      nByGroup[gspec.key] = vals.length;

      binnedByGroup[gspec.key] = binGen(vals);

      statsByGroup[gspec.key] = {
        mean: d3.mean(vals),
        median: d3.median(vals),
        n: vals.length
      };
    }

    // shared yMax across all 3 columns for this metric
    const yMax = Math.max(
      ...groups.map(gspec => {
        const b = binnedByGroup[gspec.key];
        const n = Math.max(1, nByGroup[gspec.key]);
        const heights = b.map(d => asPercent ? (d.length / n * 100) : d.length);
        return d3.max(heights) || 0;
      }),
      1
    );

    prep.set(m.key, {
      xDomain: xTmp.domain(),
      yMax,
      binned: binnedByGroup,
      n: nByGroup,
      stats: statsByGroup
    });
  }

  // ----- draw order: metric rows, group columns -----
  for (const m of metrics) {
    const p = prep.get(m.key);
    if (!p) continue;

    for (const gspec of groups) {
      // Card container
      const card = root.append("div")
        .style("border", "1px solid " + (C.border || "#000"))
        .style("padding", "10px");

      card.append("div")
        .style("font-family", "BentonStrong, Benton, sans-serif")
        .style("font-size", "14px")
        .style("margin", "0 0 8px 0")
        .text(`${m.label} — ${gspec.label}`);

      const svg = card.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("width", width + "px")
        .style("max-width", "none");

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain(p.xDomain)
        .range([0, innerW]);

      const y = d3.scaleLinear()
        .domain([0, p.yMax])
        .nice()
        .range([innerH, 0]);

      const binned = p.binned[gspec.key];
      const n = Math.max(1, p.n[gspec.key]);

      // Bars
      g.selectAll("rect")
        .data(binned)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0) + 1)
        .attr("y", d => {
          const h = asPercent ? (d.length / n * 100) : d.length;
          return y(h);
        })
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
        .attr("height", d => {
          const h = asPercent ? (d.length / n * 100) : d.length;
          return innerH - y(h);
        })
        .attr("fill", gspec.fill)
        .attr("opacity", 0.85);

      // Axes
      g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(5));

      g.append("g")
        .call(
          asPercent
            ? d3.axisLeft(y).ticks(4).tickFormat(d => d + "%")
            : d3.axisLeft(y).ticks(4)
        );

      // Mean/Median + N (text)
      const st = p.stats[gspec.key];
      const meanTxt = Number.isFinite(st.mean) ? m.fmt(st.mean) : "—";
      const medTxt  = Number.isFinite(st.median) ? m.fmt(st.median) : "—";

      g.append("text")
        .attr("x", innerW)
        .attr("y", 20)
        .attr("text-anchor", "end")
        .attr("font-size", 11)
        .text(`Median ${medTxt}`);

      g.append("text")
        .attr("x", innerW)
        .attr("y", 30)
        .attr("text-anchor", "end")
        .attr("font-size", 11)
        .text(`Mean ${meanTxt}`);

      g.append("text")
        .attr("x", innerW)
        .attr("y", 10)
        .attr("text-anchor", "end")
        .attr("font-size", 11)
        .text(`n = ${st.n}`);
    }
  }
}