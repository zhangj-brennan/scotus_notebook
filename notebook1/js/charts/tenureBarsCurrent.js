function drawTenureBars(rows, {
  selector = "#tenureBars",
  width = 900,
  rowHeight = 18,
  barHeight = 10,
  margin = { top: 24, right: 30, bottom: 30, left: 260 },
  maxRows = null // set to e.g. 30 for “Top 30”
} = {}) {
  const parseMDY = d3.timeParse("%m/%d/%Y");
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  // Clear
  d3.select(selector).selectAll("*").remove();

  // Build derived rows
  const data = rows
    .map(d => {
      const start_dt = parseMDY(d.start);
      const end_dt = parseMDY(d.end);
      if (!start_dt || !end_dt) return null;

      // tenure years (prefer days/term)
      let tenure_years = null;
      const daysTerm = Number(String(d["days/term"] ?? "").replace(/,/g, ""));
      if (Number.isFinite(daysTerm) && daysTerm > 0) {
        tenure_years = daysTerm / 365.25;
      } else {
        tenure_years = (end_dt - start_dt) / MS_PER_YEAR;
      }

      const startYear = start_dt.getFullYear();
      const endYear = end_dt.getFullYear();

      return {
        ...d,
        name: d["first last"] ?? d.name ?? "",
        start_dt,
        end_dt,
        startYear,
        endYear,
        rangeLabel: `${startYear}–${endYear}`,
        tenure_years
      };
    })
    .filter(d => d && Number.isFinite(d.tenure_years));

  // Sort longest -> shortest
  data.sort((a, b) => b.tenure_years - a.tenure_years);

  const view = maxRows ? data.slice(0, maxRows) : data;

  const innerW = width - margin.left - margin.right;
  const height = margin.top + margin.bottom + view.length * rowHeight;

  const svg = d3.select(selector).append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("width", width + "px")
    .style("max-width", "none");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(view, d => d.tenure_years) || 1])
    .nice()
    .range([0, innerW]);

  // X axis (top or bottom; bottom here)
  g.append("g")
    .attr("transform", `translate(0,${view.length * rowHeight})`)
    .call(d3.axisBottom(x).ticks(8));

  // Rows
  const row = g.selectAll(".tenureRow")
    .data(view, d => (d["justice number order"] ?? d.name) + "_" + d.start)
    .enter()
    .append("g")
    .attr("class", "tenureRow")
    .attr("transform", (d, i) => `translate(0,${i * rowHeight})`);

  // Bars
  row.append("rect")
    .attr("x", 0)
    .attr("y", (rowHeight - barHeight) / 2)
    .attr("width", d => x(d.tenure_years))
    .attr("height", barHeight)
    .attr("fill", "#000")
    .attr("opacity", 0.85);

  // Labels on the left: Name + year range
  row.append("text")
    .attr("x", -10)
    .attr("y", rowHeight / 2 + 4)
    .attr("text-anchor", "end")
    .attr("font-size", 12)
    .text(d => `${d.name} (${d.rangeLabel})`);

  // Value label at bar end (optional but nice)
  row.append("text")
    .attr("x", d => x(d.tenure_years) + 6)
    .attr("y", rowHeight / 2 + 4)
    .attr("font-size", 11)
    .text(d => `${d.tenure_years.toFixed(1)}y`);
}