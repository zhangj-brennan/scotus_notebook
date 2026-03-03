/**
 * For each justice, count how many OTHER justices they overlap with (any time overlap).
 * Adds overlapCount + overlapIds.
 * ALSO returns summary stats on overlapCount: mean + median.
 *
 * Returns:
 *   { rows: justicesWithOverlap[], stats: { n, mean, median, min, max } }
 */
function addOverlapCounts(justices, {
  idKey = "justice number order",
  startKey = "start_dt",
  endKey = "end_dt"
} = {}) {

  const asId = d => String(d?.[idKey] ?? "").trim();
  const asDate = (d, key) => (d?.[key] instanceof Date ? d[key] : null);

  const rows = justices
    .map(d => {
      const id = asId(d);
      const s = asDate(d, startKey);
      const e = asDate(d, endKey);
      if (!id || !(s instanceof Date) || !(e instanceof Date)) return null;
      return { ...d, _id: id, _start: s, _end: e };
    })
    .filter(Boolean);

  const sorted = rows.slice().sort((a, b) => a._start - b._start);

  const overlaps = new Map();
  for (const d of sorted) overlaps.set(d._id, new Set());

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];

    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];

      if (b._start > a._end) break;

      const overlap = (a._start <= b._end) && (b._start <= a._end);
      if (overlap) {
        overlaps.get(a._id).add(b._id);
        overlaps.get(b._id).add(a._id);
      }
    }
  }

  const out = rows.map(d => {
    const set = overlaps.get(d._id) || new Set();
    const overlapIds = Array.from(set).sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });

    return {
      ...d,
      overlapCount: overlapIds.length,
      overlapIds
    };
  });

  const counts = out.map(d => d.overlapCount).filter(Number.isFinite);
  const stats = {
    n: counts.length,
    mean: d3.mean(counts),
    median: d3.median(counts),
    min: d3.min(counts),
    max: d3.max(counts)
  };

  return { rows: out, stats };
}

function drawOverlapHistogram(justicesWithOverlap, {
  selector = "#overlapHistogram",
  width = 400,
  height = 320,
  margin = { top: 30, right: 30, bottom: 40, left: 50 }
} = {}) {

  const root = d3.select(selector);
  root.selectAll("*").remove();

  const data = justicesWithOverlap
    .map(d => d.overlapCount)
    .filter(Number.isFinite);

  if (!data.length) {
    root.append("div").text("No overlap data available.");
    return;
  }

  const mean = d3.mean(data);
  const median = d3.median(data);
  const fmt = d3.format(".2f");

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = root.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X scale
  const x = d3.scaleLinear()
    .domain(d3.extent(data))
    .nice()
    .range([0, innerW]);

  // Histogram bins
  const bins = d3.bin()
    .domain(x.domain())
    .thresholds(d3.range(
      Math.floor(x.domain()[0]),
      Math.ceil(x.domain()[1]) + 1,
      1
    ))(data);

  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .nice()
    .range([innerH, 0]);

  // Bars
  g.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", d => innerH - y(d.length))
    .attr("fill", COLORS?.grey || "#B0B0B0")
    .attr("opacity", 0.85);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

  g.append("g")
    .call(d3.axisLeft(y).ticks(6));

  // Axis labels
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 35)
    .attr("text-anchor", "middle")
    .text("Number of Other Justices Overlapped With");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Number of Justices");

  // ---- Mean / Median text (upper right corner) ----
  const statsG = g.append("g")
    .attr("transform", `translate(${innerW - 5}, 5)`);

  statsG.append("text")
    .attr("text-anchor", "end")
    .attr("font-size", 12)
    .attr("y", 14)
    .text(`Mean: ${fmt(mean)}`);

  statsG.append("text")
    .attr("text-anchor", "end")
    .attr("font-size", 12)
    .attr("y", 30)
    .text(`Median: ${fmt(median)}`);
}
function drawOverlapMedianByInterval(justicesWithOverlap, {
  selector = "#overlapMedianByDecade",
  width = 400,
  height = 220,
  margin = { top: 20, right: 20, bottom: 36, left: 44 },
  interval = 30,              // <-- 30 year bins
  labelPoints = true
} = {}) {

  const root = d3.select(selector);
  root.selectAll("*").remove();

  const rows = justicesWithOverlap
    .map(d => {
      if (!(d.start_dt instanceof Date)) return null;
      const year = d.start_dt.getFullYear();
      const binStart = Math.floor(year / interval) * interval;
      if (!Number.isFinite(d.overlapCount)) return null;
      return { binStart, v: d.overlapCount };
    })
    .filter(Boolean);

  if (!rows.length) {
    root.append("div").text("No overlap data available.");
    return;
  }

  const bins = Array.from(
    d3.group(rows, d => d.binStart),
    ([binStart, arr]) => ({
      binStart,
      median: d3.median(arr, d => d.v),
      n: arr.length
    })
  )
  .filter(d => Number.isFinite(d.median))
  .sort((a,b) => a.binStart - b.binStart);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = root.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(bins, d => d.binStart))
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.median) || 1])
    .nice()
    .range([innerH, 0]);

  // axes
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(
      d3.axisBottom(x)
        .ticks(bins.length)
        .tickFormat(d => `${d}`)
    );

  g.append("g")
    .call(d3.axisLeft(y).ticks(5));

  // line
  const line = d3.line()
    .x(d => x(d.binStart))
    .y(d => y(d.median));

  g.append("path")
    .datum(bins)
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  // points
  g.selectAll("circle")
    .data(bins)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.binStart))
    .attr("cy", d => y(d.median))
    .attr("r", 3)
    .attr("fill", "#000");

  if (labelPoints) {
    g.selectAll(".ptLabel")
      .data(bins)
      .enter()
      .append("text")
      .attr("class","ptLabel")
      .attr("x", d => x(d.binStart))
      .attr("y", d => y(d.median) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .text(d => d3.format(".1f")(d.median));
  }

  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 30)
    .attr("text-anchor", "middle")
    .text(`Start year (${interval}-year bins)`);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -36)
    .attr("text-anchor", "middle")
    .text("Median overlaps");
}