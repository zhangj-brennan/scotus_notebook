

function computeKM(justices, {
  timeKey = "tenure_years",
  eventFn = d => !d.isCurrent   // exited = event; current = censored
} = {}) {

  const rows = justices
    .map(d => ({
      t: Number(d?.[timeKey]),
      event: !!eventFn(d)
    }))
    .filter(d => Number.isFinite(d.t) && d.t >= 0)
    .sort((a,b) => a.t - b.t);

  if (!rows.length) return [];

  let atRisk = rows.length;
  let survival = 1;

  // group by exact time
  const byTime = d3.group(rows, d => d.t);
  const times = Array.from(byTime.keys()).sort((a,b) => a - b);

  // KM step points: start at (0,1)
  const curve = [{ t: 0, s: 1 }];

  for (const t of times) {
    const group = byTime.get(t) || [];
    const deaths = group.filter(r => r.event).length;
    const censored = group.length - deaths;

    if (deaths > 0) {
      const hazard = deaths / atRisk;
      survival *= (1 - hazard);

      // KM step: vertical drop at time t
      curve.push({ t, s: curve[curve.length - 1].s }); // horizontal to t
      curve.push({ t, s: survival });                  // drop at t
    } else {
      // only censoring at t: survival unchanged
      curve.push({ t, s: curve[curve.length - 1].s });
    }

    atRisk -= (deaths + censored);
    if (atRisk <= 0) break;
  }

  return curve;
}

function buildBeforeAfterSeries(justices, breakYears, {
  minGroupSize = 8
} = {}) {

  const valid = justices.filter(d => d.start_dt instanceof Date);

  return breakYears
    .slice()
    .sort((a,b) => a - b)
    .map(Y => {
      const before = valid.filter(d => d.start_dt.getFullYear() < Y);
      const after  = valid.filter(d => d.start_dt.getFullYear() >= Y);

      const beforeCurve = computeKM(before);
      const afterCurve  = computeKM(after);

      return {
        breakYear: Y,
        before: { label: `< ${Y}`, n: before.length, curve: beforeCurve },
        after:  { label: `≥ ${Y}`, n: after.length,  curve: afterCurve }
      };
    })
    .filter(s =>
      s.before.n >= minGroupSize && s.after.n >= minGroupSize &&
      s.before.curve.length && s.after.curve.length
    );
}


function drawBeforeAfterBreakScan(series, {
  selector = "#survivalBreakScan",
  columns = 2,
  panelWidth = 380,
  panelHeight = 230,
  margin = { top: 18, right: 12, bottom: 28, left: 40 },
  maxYears = 40
} = {}) {

  const root = d3.select(selector);
  root.selectAll("*").remove();

  if (!series || !series.length) {
    root.append("div").text("No break-scan survival series to render.");
    return;
  }

  // shared domains across all panels
  const allT = series.flatMap(s =>
    [...s.before.curve, ...s.after.curve].map(p => p.t)
  ).filter(Number.isFinite);

  const xMax = maxYears != null ? maxYears : (d3.max(allT) || 1);

  const x = d3.scaleLinear().domain([0, xMax]);
  const y = d3.scaleLinear().domain([0, 1]);

  const line = d3.line()
    .x(p => x(p.t))
    .y(p => y(p.s))
    .curve(d3.curveStepAfter);

  // layout grid
  root.style("display", "grid")
    .style("grid-template-columns", `repeat(${columns}, ${panelWidth}px)`)
    .style("gap", "12px")
    .style("align-items", "start");

  series.forEach(s => {
    const card = root.append("div").attr("class", "km-card");

    card.append("div")
      .attr("class", "km-title")
      .text(`${s.breakYear}: before vs after`);

    const svg = card.append("svg")
      .attr("width", panelWidth)
      .attr("height", panelHeight);

    const innerW = panelWidth - margin.left - margin.right;
    const innerH = panelHeight - margin.top - margin.bottom;

    x.range([0, innerW]);
    y.range([innerH, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4));

    g.append("g")
      .call(d3.axisLeft(y).ticks(3));

    // curves: before (light) vs after (dark)
    g.append("path")
      .datum(s.before.curve)
      .attr("fill", "none")
      .attr("stroke", "#bdbdbd")
      .attr("stroke-width", 1.8)
      .attr("d", line);

    g.append("path")
      .datum(s.after.curve)
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", 1.8)
      .attr("d", line);

    // tiny legend text (top-right)
    const leg = g.append("g")
      .attr("transform", `translate(${innerW - 4}, 4)`);

    leg.append("text")
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("y", 12)
      .text(`${s.before.label} (n=${s.before.n})`);

    leg.append("text")
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("y", 26)
      .text(`${s.after.label} (n=${s.after.n})`);

    // optional: median labels for each curve
    const medBefore = medianSurvivalFromKM(s.before.curve);
    const medAfter  = medianSurvivalFromKM(s.after.curve);

    const fmt = d3.format(".1f");
    const medText = [
      medBefore != null ? `Med<: ${fmt(medBefore)}y` : `Med<: —`,
      medAfter  != null ? `Med≥: ${fmt(medAfter)}y`  : `Med≥: —`
    ].join("   ");

    g.append("text")
      .attr("x", 0)
      .attr("y", 12)
      .attr("font-size", 11)
      .text(medText);
  });
}

// same helper from before
function medianSurvivalFromKM(curve) {
  for (const p of curve) {
    if (p.s <= 0.5) return p.t;
  }
  return null;
}
