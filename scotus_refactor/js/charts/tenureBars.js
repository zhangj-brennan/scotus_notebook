function drawTenureBarsInteractive(justices, {
  selector = "#tenureBars",
  rowHeight = 12,
  barHeight = 9,
  margin = { top: 40, right: 200, bottom: 30, left: 260 },
  initialSort = "tenure" // "tenure" | "start"
} = {}) {

    var width = 800;
  const root = d3.select(selector);
  root.selectAll("*").remove();

  // Copy (don’t mutate original array)
  let data = justices
    .filter(d => Number.isFinite(d.tenure_years) && d.start_dt instanceof Date)
    .slice();

  function setActive(which){
    d3.select("#sortTenure").classed("is-active", which === "tenure");
    d3.select("#sortStart").classed("is-active", which === "start");
  }

  function sortData(which){
    if(which === "start"){
      data.sort((a,b) => b.end_dt - a.end_dt); // earliest -> latest
    } else {
      data.sort((a,b) => b.tenure_years - a.tenure_years); // longest -> shortest
    }
  }

  // Sizing
  const innerW = width - margin.left - margin.right;
  const height = margin.top + margin.bottom + data.length * rowHeight;

  const svg = root.append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("width", width + "px")
    .style("max-width", "none");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.tenure_years) || 1])
    .nice()
    .range([0, innerW]);

  // x-axis
  const xAxisG = g.append("g")
   // .attr("transform", `translate(0,${data.length * rowHeight})`)
    .call(d3.axisTop(x).ticks(8));
const axisLabel = g.append("g").append("text").text("Tenure Years")
                  .attr('x',-10)
                  .attr('y',-10)
                  .attr('text-anchor',"end")
  // join helper
  function render(which){
    setActive(which);
    sortData(which);

    const rows = g.selectAll(".tenureRow")
      .data(data, d => String(d["justice number order"] ?? d["first last"]));

    const rowsEnter = rows.enter()
      .append("g")
      .attr("class","tenureRow");

    // labels (left)
    rowsEnter.append("text")
      .attr("class","tenureLabel")
      .attr("x", -10)
      .attr("text-anchor","end")
      .attr("y", rowHeight/2 + 4)
      .attr("font-size", 2);

    // bar
    rowsEnter.append("rect")
      .attr("class","tenureBar")
      .attr("y", (rowHeight - barHeight) / 2)
      .attr("height", barHeight)
        .attr("fill", d => {
        if (d.isCurrent) return COLORS.red;
        if (d.end_dt && d.end_dt.getFullYear() >= 1990) return COLORS.dark;
        return COLORS.grey;
        });      //.attr("opacity", 0.85);

    // value at end of bar
    rowsEnter.append("text")
      .attr("class","tenureValue")
      .attr("y", rowHeight/2 + 4)
      .attr("font-size", 8);

    // merge
    const rowsMerged = rowsEnter.merge(rows);

    // animate to new order (y position)
    rowsMerged.transition()
      .duration(600)
      .attr("transform", (d,i) => `translate(0,${i * rowHeight})`);

    // update label text
    rowsMerged.select(".tenureLabel")
      .text(d => {
        const name = d["first last"] ?? d.name ?? "";
        const sy = d.start_dt ? d.start_dt.getFullYear() : "—";
        const ey = d.end_dt ? d.end_dt.getFullYear() : "—";
        return `${name} (${sy}–${ey})`;
      });

    // update bars
    rowsMerged.select(".tenureBar")
      .transition()
      .duration(600)
      .attr("width", d => x(d.tenure_years));

    // update values
    rowsMerged.select(".tenureValue")
      .transition()
      .duration(600)
      .attr("x", d => x(d.tenure_years) + 6)
      .text(d => `${d.tenure_label}`);

    rows.exit().remove();
  }

  // Wire buttons
  d3.select("#sortTenure").on("click", () => render("tenure"));
  d3.select("#sortStart").on("click", () => render("start"));

  // initial draw
  render(initialSort);
}