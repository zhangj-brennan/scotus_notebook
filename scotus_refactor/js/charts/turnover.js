/**
 * Count NEW justice starts per decade (ignores ends entirely).
 * Assumes one row per justice (consolidated).
 */
function computeDecadeStarts(justices, {
  idKey = "justice number order",
  startKey = "start_dt"
} = {}) {

  const rows = justices
    .map(d => {
      const id = String(d?.[idKey] ?? "").trim();
      const s = d?.[startKey];
      if (!id || !(s instanceof Date)) return null;
      return { ...d, _id: id, _s: s };
    })
    .filter(Boolean);

  const decade = (year) => Math.floor(year / 10) * 10;

  const counts = d3.rollup(
    rows,
    v => v.length,
    d => decade(d._s.getFullYear())
  );

  const decades = Array.from(counts.keys()).sort((a,b) => a - b);

  return decades.map(dec => ({
    decade: dec,
    starts: counts.get(dec) || 0
  }));
}
function drawDecadeStartsBar(decadeStarts, {
  selector = "#decadeChanges",
  width = 800,
  height = 260,
  margin = { top: 20, right: 20, bottom: 36, left: 44 }
} = {}) {

  const root = d3.select(selector);
  root.selectAll("*").remove();

  if (!decadeStarts || !decadeStarts.length) {
    root.append("div").text("No decade start data available.");
    return;
  }

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = root.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(decadeStarts.map(d => String(d.decade)))
    .range([0, innerW])
    .padding(0.15);

  const y = d3.scaleLinear()
    .domain([0, d3.max(decadeStarts, d => d.starts) || 1])
    .nice()
    .range([innerH, 0]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(
      d3.axisBottom(x)
        .tickValues(
          decadeStarts.map(d => String(d.decade)).filter((d,i) => i % 2 === 0)
        )
    );

  g.append("g")
    .call(d3.axisLeft(y).ticks(5));

  // Bars
  const bars = g.selectAll("rect")
    .data(decadeStarts)
    .enter()
    .append("rect")
    .attr("x", d => x(String(d.decade)))
    .attr("y", d => y(d.starts))
    .attr("width", x.bandwidth())
    .attr("height", d => innerH - y(d.starts))
    .attr("fill", COLORS?.grey || "#B0B0B0")
    .attr("opacity", 0.9);

  // Value labels
  g.selectAll(".bar-label")
    .data(decadeStarts)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(String(d.decade)) + x.bandwidth() / 2)
    .attr("y", d => y(d.starts) - 6)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#000")
    .text(d => d.starts);

  // Axis labels
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 30)
    .attr("text-anchor", "middle")
    .text("Decade");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -36)
    .attr("text-anchor", "middle")
    .text("New justice starts");
}