// js/charts/tenureHistogram.js
// Refactor of hist_days_term.js: uses already-loaded rows, so we don't fetch the CSV twice.
(function () {
  window.SCOTUS_CHARTS = window.SCOTUS_CHARTS || {};

  window.SCOTUS_CHARTS.drawTenureHistogram = function drawTenureHistogram(rows, opts){
    const cfg = Object.assign(
      {
        selector: "#tenure",
        column: "days/term",
        bins: 25,
        width: 500,
        height: 200,
        margin: { top: 24, right: 24, bottom: 48, left: 64 },
        xLabel: "Years",
        yLabel: "Number of Justices",
        title: 'Histogram of "tenure in years"',
        barPadding: 4
      },
      opts || {}
    );

    const root = d3.select(cfg.selector);
    if (root.empty()) {
      console.error(`Histogram: container not found for selector: ${cfg.selector}`);
      return;
    }

    // Clear any prior contents
    root.selectAll("*").remove();

    const innerW = cfg.width - cfg.margin.left - cfg.margin.right;
    const innerH = cfg.height - cfg.margin.top - cfg.margin.bottom;

    const svg = root.append("svg").attr("width", cfg.width).attr("height", cfg.height);
    const g = svg.append("g").attr("transform", `translate(${cfg.margin.left},${cfg.margin.top})`);

    svg.append("text")
      .attr("x", cfg.width / 2)
      .attr("y", cfg.margin.top / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
      .text(cfg.title);

    function parseNumber(v) {
      if (v == null) return null;
      const s = String(v).trim();
      if (!s) return null;
      const cleaned = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      if (!cleaned) return null;
      const n = Number(cleaned[0]);
      return Number.isFinite(n) ? n : null;
    }

    const values = rows.map((d) => parseNumber(d[cfg.column])).filter((d) => d != null);

    if (!values.length) {
      g.append("text")
        .attr("x", innerW / 2)
        .attr("y", innerH / 2)
        .attr("text-anchor", "middle")
        .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
        .text(`No numeric values found in column "${cfg.column}".`);
      return;
    }

    const extent = d3.extent(values);
    const xDomain = extent[0] === extent[1] ? [extent[0] - 1, extent[1] + 1] : extent;

    const x = d3.scaleLinear().domain(xDomain).nice().range([0, innerW]);

    const histogram = d3.bin()
      .domain(x.domain())
      .thresholds(
        typeof cfg.bins === "function"
          ? cfg.bins(values, x.domain()[0], x.domain()[1])
          : cfg.bins
      );

    const bins = histogram(values);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, (b) => b.length) || 1])
      .nice()
      .range([innerH, 0]);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x)
        .tickValues([0,10*365,20*365,30*365])
        .tickFormat(function(d){return d/365;})
      )
      .call((axisG) => axisG.selectAll("text")
        .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
      );

    g.append("g")
      .call(d3.axisLeft(y).ticks(3))
      .call((axisG) => axisG.selectAll("text")
        .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
      );

    // Axis labels
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + cfg.margin.bottom - 20)
      .attr("text-anchor", "middle")
      .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
      .text(cfg.xLabel);

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -cfg.margin.left + 16)
      .attr("text-anchor", "middle")
      .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
      .text(cfg.yLabel);

    // Bars
    const bar = g.selectAll(".bar")
      .data(bins)
      .enter()
      .append("g")
      .attr("class", "bar")
      .attr("transform", (d) => `translate(${x(d.x0)},${y(d.length)})`);

    bar.append("rect")
      .attr("x", 0)
      .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - cfg.barPadding))
      .attr("height", (d) => innerH - y(d.length))
      .attr("fill", "#000")
      .append("title")
      .text((d) => `${cfg.column}: ${d.x0?.toFixed?.(0) ?? d.x0}–${d.x1?.toFixed?.(0) ?? d.x1}\nCount: ${d.length}`);

    // Footer meta (keep same formatting)
    const median = d3.median(values)/365;
    const mean = d3.mean(values)/365;

    svg.append("text")
      .attr("x", cfg.margin.left)
      .attr("y", cfg.height - 8)
      .attr("font-size", 10)
      .attr("font-family", "system-ui, -apple-system, Segoe UI, Roboto, sans-serif")
      .text(
        `n=${values.length}  min=${Math.round(d3.min(values)/36.5)/10}  max=${Math.round(
          d3.max(values)/365
        )}  mean=${mean ? mean.toFixed(1) : "—"}  median=${median ? median.toFixed(1) : "—"}`
      );
  };
})();
