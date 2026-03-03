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
  binSize = 1,      // years
  maxYears = null   // cap (e.g., 40); otherwise uses max observed tenure
} = {}) {

  const rows = justices
    .map(d => ({
      tenure: Number(d.tenure_years),
      event: !d.isCurrent  // true if they exited; false if censored/current
    }))
    .filter(d => Number.isFinite(d.tenure) && d.tenure >= 0);

  if (!rows.length) return [];

  const maxT = maxYears != null
    ? maxYears
    : Math.ceil(d3.max(rows, d => d.tenure) / binSize) * binSize;

  const bins = [];
  for (let t0 = 0; t0 < maxT; t0 += binSize) {
    bins.push({ t0, t1: t0 + binSize });
  }

  const out = bins.map(b => {
    // at risk at start: tenure >= t0
    const atRisk = rows.filter(r => r.tenure >= b.t0).length;

    // exits occur if event && tenure in [t0, t1)
    const exits = rows.filter(r => r.event && r.tenure >= b.t0 && r.tenure < b.t1).length;

    // censored in bin if !event && tenure in [t0, t1)
    const censored = rows.filter(r => !r.event && r.tenure >= b.t0 && r.tenure < b.t1).length;

    const hazard = atRisk > 0 ? exits / atRisk : null;

    return {
      ...b,
      mid: (b.t0 + b.t1) / 2,
      atRisk,
      exits,
      censored,
      hazard
    };
  });

  // drop empty tail bins (no one at risk)
  return out.filter(d => d.atRisk > 0);
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