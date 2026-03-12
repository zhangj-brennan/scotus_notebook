/**
 * Compute a binned hazard curve over tenure length.
 *
 * Inputs per justice:
 *  - tenure_years (Number)
 *  - isCurrent (Boolean)  // if true => censored (no exit event)
 *
 * Hazard in bin [t, t+binSize):
 *   hazard = exits_in_bin / atRisk_at_bin_start
 *
 * Returns: [{ t0, t1, mid, atRisk, exits, censored, hazard }]
 */
/**
 * Compute a binned hazard curve over tenure length.
 *
 * Inputs per justice:
 *  - tenure_years (Number)
 *  - isCurrent (Boolean)  // if true => censored (no exit event)
 *
 * Hazard in bin [t, t+binSize):
 *   hazard = exits_in_bin / atRisk_at_bin_start
 *
 * Returns: [{ t0, t1, mid, atRisk, exits, censored, hazard }]
 */
function computeHazardByTenureBins(justices, {
  binSize = 1,        // years
  maxYears = null,    // cap (e.g., 40); otherwise uses max observed tenure
  minAtRisk = 10      // NEW: minimum number at risk to keep bin
} = {}) {

  // Normalize inputs
  const rows = justices
    .map(d => ({
      tenure: Number(d.tenure_years),
      event: !d.isCurrent   // true if exited; false if censored/current
    }))
    .filter(d => Number.isFinite(d.tenure) && d.tenure >= 0);

  if (!rows.length) return [];

  // Determine maximum tenure boundary
  const maxT = maxYears != null
    ? maxYears
    : Math.ceil(d3.max(rows, d => d.tenure) / binSize) * binSize;

  // Build bins
  const bins = [];
  for (let t0 = 0; t0 < maxT; t0 += binSize) {
    bins.push({ t0, t1: t0 + binSize });
  }

  // Compute hazard per bin
  const out = bins.map(b => {

    // At risk at start of bin
    const atRisk = rows.filter(r => r.tenure >= b.t0).length;

    // Exits in bin
    const exits = rows.filter(r =>
      r.event &&
      r.tenure >= b.t0 &&
      r.tenure < b.t1
    ).length;

    // Censored in bin
    const censored = rows.filter(r =>
      !r.event &&
      r.tenure >= b.t0 &&
      r.tenure < b.t1
    ).length;

    const hazard = atRisk > 0
      ? exits / atRisk
      : null;

    return {
      ...b,
      mid: (b.t0 + b.t1) / 2,
      atRisk,
      exits,
      censored,
      hazard
    };
  });

  // Drop bins where risk set is too small
  return out.filter(d => d.atRisk >= minAtRisk);
}
function drawHazardCurve(hazardBins, {
  selector = "#hazardChart",
  width = 700,
  height = 320,
  margin = { top: 20, right: 20, bottom: 36, left: 50 }
} = {}) {

  const root = d3.select(selector);
  root.selectAll("*").remove();

  const data = hazardBins.filter(d => d.hazard != null && Number.isFinite(d.hazard));

  if (!data.length) {
    root.append("div").text("No hazard data available.");
    return;
  }

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = root.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(hazardBins, d => d.t1) || 1])
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.hazard) || 0.05])
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(10));

  g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2f")));

  const line = d3.line()
    .defined(d => d.hazard != null && Number.isFinite(d.hazard))
    .x(d => x(d.mid))
    .y(d => y(d.hazard));

  g.append("path")
    .datum(hazardBins)
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  g.selectAll(".haz-dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "haz-dot")
    .attr("cx", d => x(d.mid))
    .attr("cy", d => y(d.hazard))
    .attr("r", 3)
    .attr("fill", "#000")
    .attr("opacity", 0.85);

  // Labels
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 30)
    .attr("text-anchor", "middle")
    .text("Years on Court (tenure)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .text("Hazard (exit probability per bin)");
}


/**
 * Build multiple hazard curves (splits) by a grouping function.
 *
 * justices rows need:
 *  - tenure_years (Number)
 *  - isCurrent (Boolean)
 *
 * groupFn(d) returns a string key like "1950s" or "Retired" etc.
 *
 * Returns:
 *  [
 *    { key: "1950s", bins: [ {t0,t1,mid,atRisk,exits,censored,hazard}, ... ] },
 *    ...
 *  ]
 */
function computeHazardSplitsByGroup(justices, groupFn, {
  binSize = 1,
  maxYears = null,
  minAtRisk = 10,
  minGroupSize = 15
} = {}) {
  // Group rows
  const groups = new Map();
  for (const d of justices) {
    const keyRaw = groupFn(d);
    const key = (keyRaw == null || keyRaw === "") ? "Unknown" : String(keyRaw);

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }

  // Compute each group’s hazard bins
  const splits = [];
  for (const [key, rows] of groups.entries()) {
    if (rows.length < minGroupSize) continue; // drop tiny groups

    const bins = computeHazardByTenureBins(rows, {
      binSize,
      maxYears,
      minAtRisk
    });

    if (bins.length) splits.push({ key, bins, n: rows.length });
  }

  // Stable ordering: biggest groups first
  splits.sort((a, b) => b.n - a.n);
  return splits;
}

function drawHazardCurveSplits(hazardSplits, {
  selector = "#hazard1",
  width = 900,
  height = 360,
  margin = { top: 20, right: 180, bottom: 36, left: 55 },
  yMax = null
} = {}) {
  const root = d3.select(selector);
  root.selectAll("*").remove();

  if (!hazardSplits || !hazardSplits.length) {
    root.append("div").text("No hazard split data available.");
    return;
  }

  const all = hazardSplits.flatMap(s => s.bins).filter(d => Number.isFinite(d.hazard));
  if (!all.length) {
    root.append("div").text("No hazard values available.");
    return;
  }

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = root.append("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const xMax = d3.max(all, d => d.t1) || 1;
  const yTop = yMax ?? (d3.max(all, d => d.hazard) || 0.05);

  const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, yTop]).nice().range([innerH, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(10));

  g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2f")));

  const color = d3.scaleOrdinal()
    .domain(hazardSplits.map(d => d.key))
    .range(d3.schemeTableau10);

  const line = d3.line()
    .defined(d => Number.isFinite(d.hazard))
    .x(d => x(d.mid))
    .y(d => y(d.hazard));

  // draw each split
  const splitG = g.selectAll(".haz-split")
    .data(hazardSplits)
    .enter()
    .append("g")
    .attr("class", "haz-split");

  splitG.append("path")
    .attr("fill", "none")
    .attr("stroke", d => color(d.key))
    .attr("stroke-width", 1.75)
    .attr("opacity", 0.9)
    .attr("d", d => line(d.bins));

  // labels
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 30)
    .attr("text-anchor", "middle")
    .text("Years on Court (tenure)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Hazard (exit probability per bin)");

  // legend on the right
  const leg = svg.append("g")
    .attr("transform", `translate(${margin.left + innerW + 14},${margin.top})`);

  const legItem = leg.selectAll(".leg")
    .data(hazardSplits)
    .enter()
    .append("g")
    .attr("class", "leg")
    .attr("transform", (d,i) => `translate(0,${i * 18})`);

  legItem.append("line")
    .attr("x1", 0).attr("x2", 18)
    .attr("y1", 7).attr("y2", 7)
    .attr("stroke", d => color(d.key))
    .attr("stroke-width", 3);

  legItem.append("text")
    .attr("x", 24)
    .attr("y", 10)
    .style("font-size", "12px")
    .text(d => `${d.key} (n=${d.n})`);
}