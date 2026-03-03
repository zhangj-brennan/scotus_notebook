// js/main.js
// Bootstraps: loads chart modules, loads CSV once, then draws all charts.
// (No HTML changes beyond including this file.)

(function(){
  const CSV_URL = "scotus_dateFix.csv";

  window.COLORS = {
    red:  getComputedStyle(document.documentElement).getPropertyValue('--red').trim()   || "#ED1C24",
    blue: getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()  || "#3995B2",
    yellow: getComputedStyle(document.documentElement).getPropertyValue('--yellow').trim()|| "#FFCF01",
    grey: getComputedStyle(document.documentElement).getPropertyValue('--grey').trim()  || "#B0B0B0",
    dark: getComputedStyle(document.documentElement).getPropertyValue('--dark').trim()  || "#888",
    black: getComputedStyle(document.documentElement).getPropertyValue('--black').trim()  || "#000"
  };

  // Load modules in order (globals)
  const scripts = [
    "./js/data/loadData.js",
    "./js/data/transforms.js",
    "./js/charts/intro.js",
    "./js/charts/averageMedianByDecade.js",
    "./js/charts/tenureBars.js",
    "./js/charts/retiredComparison.js",
    "./js/charts/endReason.js",
      "./js/charts/tenureVsScatter.js",
    "./js/charts/overlap.js",
    "./js/charts/network.js",
    "./js/charts/turnover.js",
    "./js/charts/survival.js",
    "./js/charts/hazard.js",

    "./js/charts/current.js",
    "./js/charts/currentAge.js",
    "./js/charts/ages.js",
    "./js/charts/tenureHistogram.js",
    "./js/charts/longestTenure.js"
  ];

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load "+src));
      document.head.appendChild(s);
    });
  }

function parseJusticesByNumber(rows, {
  idKey = "justice number order",
  startKey = "start",
  endKey = "end",
  endReasonKey = "end reason",
  today = new Date()
} = {}) {

  // ---------- helpers ----------
  const asStr = (v) => String(v ?? "").trim();
  const isNA = (v) => {
    const s = asStr(v).toUpperCase();
    return s === "" || s === "NA" || s === "N/A" || s === "NULL" || s === "NONE";
  };

  // Accepts "M/D/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"
  function parseDateFlexible(v) {
    const s = asStr(v);
    if (isNA(s)) return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const dt = new Date(s + "T00:00:00");
      return isNaN(dt) ? null : dt;
    }

    // M/D/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mm = Number(m[1]) - 1;
      const dd = Number(m[2]);
      const yy = Number(m[3]);
      const dt = new Date(yy, mm, dd);
      return isNaN(dt) ? null : dt;
    }

    // fallback
    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
  }

  // day-stable (midnight) conversion
  function day0(dt) {
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  // Merge overlapping intervals and sum days
  // intervals: [{start: Date, end: Date}] with start <= end
  function unionDays(intervals) {
    if (!intervals.length) return 0;

    const sorted = intervals
      .map(iv => ({ start: day0(iv.start), end: day0(iv.end) }))
      .sort((a, b) => a.start - b.start);

    const merged = [];
    let cur = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const nxt = sorted[i];
      if (nxt.start <= cur.end) {
        // overlap/touch → extend
        if (nxt.end > cur.end) cur.end = nxt.end;
      } else {
        merged.push(cur);
        cur = nxt;
      }
    }
    merged.push(cur);

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    let days = 0;
    for (const m of merged) {
      days += Math.round((m.end - m.start) / MS_PER_DAY);
    }
    return days;
  }

  // Convert total days -> (years, months, days) approx (good for labeling)
  function daysToYMD(totalDays) {
    // average lengths (Gregorian)
    const daysPerYear = 365.2425;
    const daysPerMonth = daysPerYear / 12;

    const years = Math.floor(totalDays / daysPerYear);
    const remAfterYears = totalDays - years * daysPerYear;

    const months = Math.floor(remAfterYears / daysPerMonth);
    const remAfterMonths = remAfterYears - months * daysPerMonth;

    const days = Math.round(remAfterMonths);

    return { years, months, days };
  }

  function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
  }

  function formatYMDLabel(ymd) {
    return `${plural(ymd.years, "year")}, ${plural(ymd.months, "month")}, ${plural(ymd.days, "day")}`;
  }

  const today0 = day0(today);

  // ---------- group by justice number ----------
  const groups = new Map();
  for (const r of rows) {
    const id = asStr(r[idKey]);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(r);
  }

  // ---------- build one parsed record per justice ----------
  const out = [];

  for (const [id, group] of groups.entries()) {
    // Determine current if ANY row says current OR end is NA/blank
    const isCurrent = group.some(r => {
      const reason = asStr(r[endReasonKey]).toLowerCase();
      const endRaw = r[endKey];
      return reason === "current" || isNA(endRaw);
    });

    // Build intervals (each row can be an interval)
    const intervals = [];
    for (const r of group) {
      const s = parseDateFlexible(r[startKey]);
      if (!s) continue;

      let e = parseDateFlexible(r[endKey]);
      const reason = asStr(r[endReasonKey]).toLowerCase();

      const rowIsCurrent = (reason === "current") || (e == null);
      if (rowIsCurrent) e = today0;

      if (e && e < s) continue; // skip bad rows

      intervals.push({ start: s, end: e });
    }

    if (!intervals.length) continue;

    const start_dt = day0(intervals.reduce((min, iv) => iv.start < min ? iv.start : min, intervals[0].start));
    const end_dt = isCurrent ? today0 : day0(intervals.reduce((max, iv) => iv.end > max ? iv.end : max, intervals[0].end));

    const tenure_days = unionDays(intervals);
    const tenure_years = tenure_days / 365.25;

    const tenure_ymd = daysToYMD(tenure_days);
    const tenure_label = formatYMDLabel(tenure_ymd);

    // Representative row (for name/president/etc.)
    const bestRow = group[0];

    out.push({
      ...bestRow,

      // canonical id + flags
      [idKey]: id,
      isCurrent,

      // normalized dates
      start_dt,
      end_dt,

      // normalized end reason
      endReason: isCurrent ? "Current" : asStr(bestRow[endReasonKey]),

      // tenure measures
      tenure_days,
      tenure_years,

      // label helpers
      tenure_ymd,
      tenure_label
    });
  }

  return out;
}
  Promise.all(scripts.map(loadScript))
    .then(() => window.SCOTUS_DATA.load(CSV_URL))
    .then((rows) => {
      // consolidate to one row per justice
      const justices = parseJusticesByNumber(rows, { method: "sum" });
       console.log(justices)
      const scotusMain = justices;
      // drawCareerDiagonals(justices, { selector: "#intro", width: 900, height: 280 });      
drawTenureIntervalLinesStartAndEnd(justices, {
  selectorStart: "#tenureIntervalLinesStart",
  selectorEnd: "#tenureIntervalLinesEnd",
  intervals: [10, 20, 30, 40, 50],
  width: 400,        // narrower per column
  chartHeight: 100,
  minN: 1
});

    //draw tenure for all
    drawTenureBarsInteractive(justices, {
      selector: "#tenureBars",
      width: 2200,      // make it wide; wrapper will scroll
      initialSort: "tenure"
    });

let histAsPercent = false;

function renderSix() {
wireHistogramPercentToggle(justices, {
  toggleSelector: "#histPercentToggle",
  chartSelector: "#histGrid",
  bins: 30,
  width: 250,
  height: 150
});

}

d3.select("#histPercentToggle").on("change", function () {
  histAsPercent = this.checked;
  renderSix();
});

// initial
renderSix();


drawTenureScatterGrid(justices, {
  selector: "#tenureScatterGrid",
  width: 260,
  height: 220
});
const { rows: justicesWithOverlap, stats } = addOverlapCounts(justices);
console.log("Overlap stats:", stats);

drawOverlapHistogram(justicesWithOverlap, { selector: "#overlapHistogram" });


const net = buildJusticeOverlapNetwork(justices);
drawJusticeOverlapNetwork(net, { selector: "#overlapNetwork", width: 900, height: 600 });


drawOverlapMedianByInterval(justicesWithOverlap, {
  selector: "#overlapMedianByDecade",
  interval: 10
});

drawOverlapMedianByInterval(justicesWithOverlap, {
  selector: "#overlapMedianByDecade30",
  interval: 30
});
drawOverlapMedianByInterval(justicesWithOverlap, {
  selector: "#overlapMedianByDecade50",
  interval: 50
});


const decadeStarts = computeDecadeStarts(justices);
drawDecadeStartsBar(decadeStarts, { selector: "#decadeChanges", width: 800 });
     

const breaks = [1850, 1900,1920,1940, 1950,1960,1970, 1980];
const breakSeries = buildBeforeAfterSeries(justices, breaks, { minGroupSize: 8 });

drawBeforeAfterBreakScan(breakSeries, {
  selector: "#survivalBreakScan",
  columns: 2,
  panelWidth: 380,
  panelHeight: 230,
  maxYears: 40
});

const hazardBins = computeHazardByTenureBins(justices, { binSize: 1 }); // 1-year bins
drawHazardCurve(hazardBins, { selector: "#hazardChart", width: 700, height: 320 });
// // current justices (end reason blank)
      // const current = scotusMain.filter(function(d){ return d["end reason"]==""; });

      // // End reasons chart (all rows)
      window.SCOTUS_CHARTS.drawEndReason(scotusMain);

    const splits = computeHazardSplitsByGroup(justices, d => (d["end reason"] || "Current"), {
  binSize: 4,
  minAtRisk: 1,
  minGroupSize: 10
});

drawHazardCurveSplits(splits, { selector: "#hazard1", width: 1100 });



      // // Current tenure and age charts
      // window.SCOTUS_CHARTS.drawCurrent(current, COLORS);
      // window.SCOTUS_CHARTS.drawCurrentAge(current, COLORS);

      // // Longest-serving top 10
      // const longestServing = scotusMain
      //   .slice()
      //   .sort(function(a,b){ return parseInt(b["days/term"]) - parseInt(a["days/term"]); })
      //   .slice(0,10);
      // window.SCOTUS_CHARTS.drawLongestTenure(longestServing, COLORS);

      // // Ages at start/end histograms
      // const dataWithAges = window.SCOTUS_UTILS.getAges(scotusMain);
      // window.SCOTUS_CHARTS.drawAgeHistogram(dataWithAges, "ageAtStart", COLORS.red, "Ages at Start");
      // window.SCOTUS_CHARTS.drawAgeHistogram(dataWithAges, "ageAtEnd", COLORS.red, "Ages at End");

      // // Tenure histogram (days/term)
      // window.SCOTUS_CHARTS.drawTenureHistogram(scotusMain, { bins: 25 });

      // // Cohort scatter + derived stats
      // window.SCOTUS_CHARTS.drawCohort(scotusMain);


    })
    .catch((err) => {
      console.error(err);
      d3.select("#main").insert("div", ":first-child")
        .attr("class","section")
        .style("border","1px solid red")
        .text("Failed to initialize: " + (err && err.message ? err.message : err));
    });

})();
