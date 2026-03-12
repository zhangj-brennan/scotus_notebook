function drawCareerDiagonals(rows, {
  selector = "#intro",
  margin = { top: 60, right: 30, bottom: 40, left: 60 },
  maxYears = null,          // set to a number to cap, else auto
  showDots = true
} = {}) {
  
  width = 1400
  height = 300

  d3.select(selector).selectAll("*").remove();
  const parseMDY = d3.timeParse("%m/%d/%Y");
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  const data = rows
    .map(d => {
      const start = parseMDY(d.start);
      const end = parseMDY(d.end);
      if(!start || !end) return null;

      // tenure years: prefer days/term if present
      let tenureYears = null;
      const daysTerm = Number(String(d["days/term"] ?? "").replace(/,/g, ""));
      if (Number.isFinite(daysTerm) && daysTerm > 0) {
        tenureYears = daysTerm / 365.25;
      } else {
        tenureYears = (end - start) / MS_PER_YEAR;
      }

      return {
        ...d,
        start_dt: start,
        end_dt: end,
        tenure_years: tenureYears,
        name: d["first last"] ?? ""
      };
    })
    .filter(Boolean);
  const svg = d3.select(selector).append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("width", width + "px")
  .style("height", height + "px")
  .style("max-width", "none");   // add this
    console.log("SVG width attr:", svg.attr("width"), "computed:", svg.node().getBoundingClientRect().width);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;


  // --- legend ---
const legend = svg.append("g")
  .attr("class", "career-legend")
  .attr(
    "transform",
    `translate(${margin.left},${margin.top - 40})`
  );

const legendItems = [
  { label: "Start", color: "green" }, // green
  { label: "End",   color: "red" }  // red
];

const item = legend.selectAll(".legend-item")
  .data(legendItems)
  .enter()
  .append("g")
  .attr("class", "legend-item")
  .attr("transform", (d, i) => `translate(${i * 60},0)`);

item.append("circle")
  .attr("r", 3)
  .attr("cx", 0)
  .attr("cy", 0)
  .attr("fill", d => d.color);

item.append("text")
  .attr("x", 5)
  .attr("y", 5)
  .attr("font-size", 10)
  .text(d => d.label);
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain(d3.extent(data.flatMap(d => [d.start_dt, d.end_dt])))
    .range([0, innerW]);

  const maxTenure = maxYears ?? d3.max(data, d => d.tenure_years) ?? 1;

  // y: 0 years at bottom, max years near top
  const y = d3.scaleLinear()
    .domain([0, maxTenure])
    .range([innerH, 0])
    .nice();

  // axes
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(10));

  // g.append("g")
  //   .call(d3.axisLeft(y).ticks(5));
// horizontal grid lines (y ticks across full width)
g.append("g")
  .attr("class", "y-grid")
  .call(
    d3.axisLeft(y)
      .ticks(5)
      .tickSize(-innerW)   // extend ticks across chart
      //.tickFormat("")     // no labels
  );
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 38)
    .attr("text-anchor", "middle")
    .text("Time (start → end)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -44)
    .attr("text-anchor", "middle")
    .text("Tenure length (years)");

  // draw lines
  const lines = g.selectAll(".careerLine")
    .data(data)
    .enter()
    .append("line")
    .attr("class", "careerLine")
    .attr("x1", d => x(d.start_dt))
    .attr("y1", innerH)
    .attr("x2", d => x(d.end_dt))
    .attr("y2", d => y(d.tenure_years))
    .attr("stroke", "#000")
    .attr("stroke-width", 3)
    .attr("opacity", 0.3);

  if (showDots) {
    g.selectAll(".startDot")
      .data(data)
      .enter()
      .append("circle")
      .attr("r", 2.5)
      .attr("cx", d => x(d.start_dt))
      .attr("cy", innerH)
      .attr("fill", "green");

    g.selectAll(".endDot")
      .data(data)
      .enter()
      .append("circle")
      .attr("r", 2.5)
      .attr("cx", d => x(d.end_dt))
      .attr("cy", d => y(d.tenure_years))
      .attr("fill", "red");
  }

  // optional: tooltip via title
  lines.append("title").text(d =>
    `${d.name}\nStart: ${d.start_dt.toISOString().slice(0,10)}\nEnd: ${d.end_dt.toISOString().slice(0,10)}\nTenure: ${d.tenure_years.toFixed(1)} years`
  );

  const tooltip = d3.select("#tooltip");

lines
  .on("mouseenter", function(event, d){
    d3.select(this)
      .attr("stroke-width", 5)
      .attr("opacity", 1);

    tooltip
      .style("opacity", 1)
      .html(`
        <strong>${d.name}</strong><br>
        Start: ${d.start_dt ? d.start_dt.getFullYear() : "—"}<br>
        End: ${d.end_dt ? d.end_dt.getFullYear() : "—"}<br>
        Reason: ${(d["end reason"] ?? "").trim() || "—"}<br>
        Tenure: ${Number.isFinite(d.tenure_years) ? d.tenure_years.toFixed(1) : "—"} years
      `);
  })
  .on("mousemove", function(event){
    tooltip
      .style("left", (event.clientX + 10) + "px")
      .style("top", (event.clientY + 10) + "px");
  })
  .on("mouseleave", function(){
    d3.select(this)
      .attr("stroke-width", 3)
      .attr("opacity", 0.3);

    tooltip.style("opacity", 0);
  });
}