function drawTenureIntervalLineMultiples(justices, {
  selector = "#tenureIntervalLines",
  intervals = [10, 20, 30, 40, 50],
  width = 980,
  chartHeight = 220,
  margin = { top: 20, right: 20, bottom: 20, left: 60 },
  minN = 1,
  // "start" or "end"
  mode = "start"
} = {}) {
  const root = d3.select(selector);
  root.selectAll("*").remove();

  const grid = root.append("div")
    .style("display", "grid")
    .style("grid-template-columns", "1fr")
    .style("gap", "14px");

  const data = justices
  .filter(d =>
    !d.isCurrent &&                      // ✅ exclude current justices
    (d.start_dt instanceof Date) &&
    (d.end_dt instanceof Date) &&
    Number.isFinite(d.tenure_years)
  )
  .map(d => ({
    ...d,
    startYear: d.start_dt.getFullYear(),
    endYear: d.end_dt.getFullYear()
  }));

  if (!data.length) {
    root.append("div").text("No data available.");
    return;
  }

  const years = data.map(d => mode === "end" ? d.endYear : d.startYear);
  const minYear = d3.min(years);
  const maxYear = d3.max(years);

  const colorMedian = (typeof COLORS !== "undefined" && COLORS.black) ? COLORS.black : "#3995B2";
  const colorMean   = (typeof COLORS !== "undefined" && COLORS.red)  ? COLORS.grey  : "#ED1C24";

  const tooltip = d3.select("#tooltip").empty()
    ? d3.select("body").append("div").attr("id","tooltip").attr("class","tooltip")
    : d3.select("#tooltip");

  function binStart(year, interval) {
    return Math.floor(year / interval) * interval;
  }

  function buildSeries(interval) {
    const grouped = d3.group(data, d => {
      const y = (mode === "end") ? d.endYear : d.startYear;
      return binStart(y, interval);
    });

    const series = Array.from(grouped, ([bin, rows]) => {
      const vals = rows.map(r => r.tenure_years).filter(Number.isFinite);
      return {
        interval,
        binStart: +bin,
        binEnd: +bin + interval - 1,
        midYear: +bin + interval / 2,
        n: vals.length,
        median: d3.median(vals),
        mean: d3.mean(vals)
      };
    })
    .filter(d => d.n >= minN && Number.isFinite(d.median) && Number.isFinite(d.mean))
    .sort((a,b) => a.binStart - b.binStart);

    return series;
  }

  intervals.forEach(interval => {
    const series = buildSeries(interval);

    const card = grid.append("div")
    //   .style("border", "1px solid var(--border)")
      .style("padding", "10px");

    const label = mode === "end" ? "end year" : "start year";
    card.append("div")
      .style("font-family", "BentonStrong, Benton, sans-serif")
      .style("font-size", "14px")
      .style("margin", "0 0 6px 0")
      .text(`${interval}-year intervals`);

    if (!series.length) {
      card.append("div").text("No bins available for this interval.");
      return;
    }

    const height = chartHeight;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = card.append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("width", width + "px")
      .style("max-width", "none");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([minYear-20, maxYear])
      .range([0, innerW]);

    const yMax = d3.max(series, d => Math.max(d.median, d.mean)) || 1;
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerH, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

    g.append("g")
      .call(d3.axisLeft(y).ticks(3));

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 34)
      .attr("text-anchor", "middle")
      .text(mode === "end" ? "Justice end year" : "Justice start year");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -46)
      .attr("text-anchor", "middle")
      .text("Tenure (years)");

    const lineMedian = d3.line()
      .x(d => x(d.midYear))
      .y(d => y(d.median));

    const lineMean = d3.line()
      .x(d => x(d.midYear))
      .y(d => y(d.mean));

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", colorMean)
      .attr("stroke-width", 1)
      .attr("d", lineMean);

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", colorMedian)
      .attr("stroke-width", 1)
      .attr("d", lineMedian);


    function addPts(key, color) {
      g.selectAll(`.pt-${mode}-${interval}-${key}`)
        .data(series)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.midYear))
        .attr("cy", d => y(d[key]))
        .attr("r", 2)
        .attr("fill", color)
        .attr("opacity", 0.9)
        .on("mouseenter", function(event, d){
          d3.select(this).attr("r", 7);
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${d.binStart}–${d.binEnd}</strong><br>` +
              `n = ${d.n}<br>` +
              `Median tenure: ${d.median.toFixed(1)} yrs<br>` +
              `Mean tenure: ${d.mean.toFixed(1)} yrs`
            )
            .style("left", (event.clientX + 10) + "px")
            .style("top", (event.clientY + 10) + "px");
        })
        .on("mousemove", function(event){
          tooltip
            .style("left", (event.clientX + 10) + "px")
            .style("top", (event.clientY + 10) + "px");
        })
        .on("mouseleave", function(){
          d3.select(this).attr("r", 2);
          tooltip.style("opacity", 0);
        });
    }

    addPts("mean", colorMean);
    addPts("median", colorMedian);

    // ---- median value labels ----
g.selectAll(`.median-label-${mode}-${interval}`)
  .data(series)
  .enter()
  .append("text")
  .attr('text-anchor',"middle")
  .attr("class", `median-label-${mode}-${interval}`)
  .attr("x", d => x(d.midYear) + 6)
  .attr("y", d => y(d.median) - 6)
  .attr("font-size", 11)
  .attr("fill", colorMedian)
  .attr("font-family", "Benton")
  .text(d => d.median.toFixed(0));

    // legend
    // const legend = svg.append("g")
    //   .attr("transform", `translate(${margin.left + innerW + 16},${margin.top + 8})`);

    // const legendItems = [
    //   { label: "Median tenure", color: colorMedian },
    //   { label: "Mean tenure", color: colorMean }
    // ];

    // const li = legend.selectAll("g")
    //   .data(legendItems)
    //   .enter()
    //   .append("g")
    //   .attr("transform", (d,i) => `translate(0,${i * 18})`);

    // li.append("line")
    //   .attr("x1", 0).attr("x2", 18)
    //   .attr("y1", 6).attr("y2", 6)
    //   .attr("stroke", d => d.color)
    //   .attr("stroke-width", 2);

    // li.append("text")
    //   .attr("x", 24)
    //   .attr("y", 10)
    //   .attr("font-size", 12)
    //   .text(d => d.label);
  });
}

// Convenience wrapper: draw BOTH start- and end-binned sets
function drawTenureIntervalLinesStartAndEnd(justices, {
  selectorStart = "#tenureIntervalLinesStart",
  selectorEnd = "#tenureIntervalLinesEnd",
  intervals = [10, 20, 30, 40, 50],
  width = 980,
  chartHeight = 220,
  minN = 1
} = {}) {
  drawTenureIntervalLineMultiples(justices, {
    selector: selectorStart,
    intervals, width, chartHeight, minN,
    mode: "start"
  });

  drawTenureIntervalLineMultiples(justices, {
    selector: selectorEnd,
    intervals, width, chartHeight, minN,
    mode: "end"
  });
}