
// js/charts/cohort.js
(function(){
  window.SCOTUS_CHARTS = window.SCOTUS_CHARTS || {};

  // Public entrypoint: expects full CSV rows
  window.SCOTUS_CHARTS.drawCohort = function drawCohort(rows){
    d3.select("#cohort").html("cohort chart");

    var cohorts = buildEntryOnlyCohorts(rows);
    var perPerson = cohortsPerPersonWithPeersAndTime(cohorts);
    drawCohortVsTenure(perPerson);

    // keep your console diagnostics (unchanged)
    console.log(cohorts, perPerson);
    var replacements = replacementRate(cohorts);
    console.log(replacements);

    var timeBetween = meanTimeBetweenReplacements(cohorts);
    MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
    console.log(timeBetween/MS_PER_YEAR);

    var durationChurn = churnIntensityByCohort(cohorts);
    console.log(durationChurn);

    var churnByYear = yearlyChurn(cohorts);
    console.log(churnByYear);

    var churnByDecade = decadalChurn(cohorts);
    console.log(churnByDecade);

    var churnByDecadeRolling = rolling10YearChurnByYear(cohorts);
    console.log(churnByDecadeRolling);
  };


//drawing
        function drawCohortVsTenure(cohortsCount){
            
            var year = 365.25 * 24 * 60 * 60 * 1000;

            var w = 500
            var h = 500
            var p = 60
            var svg = d3.select("#cohort").append("svg").attr("width",w).attr("height",h)
            var chart = svg.append("g")
            var yScale = d3.scaleLinear().domain([1,80]).range([h-p*2,0])
            var xScale = d3.scaleLinear().domain([0,year*40]).range([0,h-p*2])

            chart.append("text").text("length of tenure").attr("x",250).attr("y",480)
            chart.append("text").text("number of cohorts").attr("x",20).attr("y",40)

            var xAxis = d3.axisBottom().scale(xScale).ticks(3).tickFormat(function(d){return d/year}).tickValues([0,10*year,20*year,30*year,40*year])
            var yAxis = d3.axisLeft().scale(yScale).ticks(3)//.tickFormat(function(d){return d/year}).tickValues([0,10*year,20*year,30*year,40*year])
            chart.append("g").attr("transform","translate(60,440)").call(xAxis)
            chart.append("g").attr("transform","translate(60,60)").call(yAxis)
            chart.append("g").attr("transform","translate(60,60)").selectAll(".cohortDots")
            .data(Object.keys(cohortsCount))
            .join("circle")
            .attr("r",5)
            .attr("opacity",.2)
            .attr("cursor","pointer")
            .attr("cx",function(d){
                return xScale(cohortsCount[d].totalDurationMs)

            })
            .attr("cy",function(d){
                console.log(d,cohortsCount[d].cohortCount)
                return yScale(cohortsCount[d].cohortCount)-p
            })
            .on("mouseover",function(e,d){
                console.log(e,d)
            })
        }





        //calculation functions


        // Keep only cohorts where at least one NEW person is added vs the previous cohort.
// Output rows include: start (ms), startISO, members (sorted), key, added (sorted).
// Build cohorts, but ONLY keep cohorts that begin with at least one NEW person added
// vs the immediately previous cohort. This removes vacancy-only (shrink) steps.
// Rule: start INCLUSIVE, end EXCLUSIVE (active if start <= t < end).

function buildEntryOnlyCohorts(rows, { includeBaseline = true } = {}) {
  const events = [];
  const t = (s) => Date.parse(s);

  for (const r of rows) {
    const name = String(r.name || "").trim();
    if (!name) continue;

    const start = t(r.start);
    const end = t(r.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error(`Bad date for ${name}`);
    if (end < start) throw new Error(`End before start for ${name}`);

    events.push({ time: start, type: "start", name });
    events.push({ time: end, type: "end", name });
  }

  // end-exclusive: end before start at same timestamp
  events.sort((a, b) =>
    (a.time - b.time) ||
    ((a.type === "end") - (b.type === "end")) ||
    a.name.localeCompare(b.name)
  );

  const active = new Set();
  const cohorts = [];

  let i = 0;

  // Track previous cohort members for "added" detection
  let prevMembers = null;

  while (i < events.length) {
    const time = events[i].time;

    // apply all events at this time
    while (i < events.length && events[i].time === time) {
      const e = events[i++];
      if (e.type === "start") active.add(e.name);
      else active.delete(e.name);
    }

    const nextTime = i < events.length ? events[i].time : null;
    if (nextTime == null || nextTime <= time || active.size === 0) continue;

    const members = Array.from(active).sort();
    const key = members.join("|");

    if (prevMembers === null) {
      // first cohort
      if (includeBaseline) {
        cohorts.push({
          start: time,
          end: nextTime,
          durationMs: nextTime - time,
          members,
          key,
          added: members.slice() // baseline adds everyone
        });
      }
      prevMembers = new Set(members);
      continue;
    }

    // Added = in current members but not in previous members
    const added = members.filter((name) => !prevMembers.has(name));

    // Keep ONLY if at least one person was added
    if (added.length > 0) {
      cohorts.push({
        start: time,
        end: nextTime,
        durationMs: nextTime - time,
        members,
        key,
        added
      });
    }

    prevMembers = new Set(members);
  }

  return cohorts;
}


      function rolling10YearChurnByYear(cohorts) {
  const TEN_YEARS_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;

  // replacement events (skip first cohort)
  const events = cohorts
    .slice(1)
    .map(c => c.start)
    .sort((a, b) => a - b);

  if (events.length === 0) return [];

  const firstYear = new Date(events[0]).getUTCFullYear();
  const lastYear = new Date(events[events.length - 1]).getUTCFullYear();

  const result = [];
  let left = 0;
  let right = 0;

  for (let year = firstYear; year <= lastYear; year++) {
    // anchor at end of year (Dec 31 23:59:59.999 UTC)
    const t = Date.UTC(year, 11, 31, 23, 59, 59, 999);

    // advance right pointer: include events <= t
    while (right < events.length && events[right] <= t) right++;

    // advance left pointer: exclude events < t - 10y
    const windowStartTime = t - TEN_YEARS_MS;
    while (left < right && events[left] < windowStartTime) left++;

    const count = right - left;

    result.push({
      year,
      replacementsIn10Years: count,
      churnPerYear: count / 10
    });
  }

  return result;
}


function decadalChurn(cohorts) {
  const churnByDecade = {};

  // skip first cohort (no replacement event)
  for (let i = 1; i < cohorts.length; i++) {
    const year = new Date(cohorts[i].start).getUTCFullYear();
    const decade = Math.floor(year / 10) * 10; // 1994 → 1990

    churnByDecade[decade] = (churnByDecade[decade] || 0) + 1;
  }

  return churnByDecade;
}

        function yearlyChurn(cohorts) {
  const churnByYear = {};

  // skip the first cohort — no replacement created it
  for (let i = 1; i < cohorts.length; i++) {
    const t = cohorts[i].start;
    const year = new Date(t).getUTCFullYear();

    churnByYear[year] = (churnByYear[year] || 0) + 1;
  }

  return churnByYear;
}

        function churnIntensityByCohort(cohorts) {
  return cohorts.map(c => ({
    key: c.key,
    start: c.start,
    end: c.end,
    intensityPerDay: 1 / (c.durationMs / (24 * 60 * 60 * 1000))
  }));
}

function meanTimeBetweenReplacements(cohorts) {
  const replacements = Math.max(0, cohorts.length - 1);
  if (replacements === 0) return null;

  const totalTime =
    cohorts.reduce((sum, c) => sum + c.durationMs, 0);

  return totalTime / replacements; // ms
}

        function replacementRate(cohorts) {
  // each cohort boundary represents exactly one replacement
  const replacements = Math.max(0, cohorts.length - 1);

  const totalTime =
    cohorts.reduce((sum, c) => sum + c.durationMs, 0);

  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  return {
    perYear: replacements / (totalTime / MS_PER_YEAR),
    perMonth: replacements / (totalTime / (MS_PER_YEAR / 12))
  };
}
/**
 * Given cohorts from buildCohorts():
 *   [{ start, end, durationMs, members:[...], key }, ...]
 *
 * Return per-person stats:
 * {
 *   [personName]: {
 *     cohortCount: number,
 *     cohortKeys: string[],        // optional but handy
 *     peers: string[]              // unique people who ever shared a cohort with them
 *   },
 *   ...
 * }
 */

/**
 * Input cohorts from buildCohorts():
 * [
 *   {
 *     start: ms,
 *     end: ms,
 *     durationMs: number,
 *     members: [...],
 *     key: "A|B|C"
 *   },
 *   ...
 * ]
 *
 * Output:
 * {
 *   [person]: {
 *     cohortCount,
 *     cohorts: [{ key, start, end, durationMs }],
 *     peers: [...],
 *     firstStart,
 *     lastEnd,
 *     totalDurationMs
 *   }
 * }
 */
function cohortsPerPersonWithPeersAndTime(cohorts) {
  const out = new Map(); // name -> record

  for (const c of cohorts) {
    const { members, key, start, end, durationMs } = c;

    for (const name of members) {
      if (!out.has(name)) {
        out.set(name, {
          cohortCount: 0,
          cohorts: [],
          peers: new Set(),
          firstStart: start,
          lastEnd: end,
          totalDurationMs: 0
        });
      }

      const rec = out.get(name);

      // cohort count + details
      rec.cohortCount += 1;
      rec.cohorts.push({ key, start, end, durationMs });

      // time bounds
      rec.firstStart = Math.min(rec.firstStart, start);
      rec.lastEnd = Math.max(rec.lastEnd, end);
      rec.totalDurationMs += durationMs;

      // peers
      for (const other of members) {
        if (other !== name) rec.peers.add(other);
      }
    }
  }

  // finalize (convert Sets → arrays)
  const result = {};
  for (const [name, rec] of out.entries()) {
    result[name] = {
      cohortCount: rec.cohortCount,
      cohorts: rec.cohorts,
      peers: Array.from(rec.peers).sort(),
      firstStart: rec.firstStart,
      lastEnd: rec.lastEnd,
      totalDurationMs: rec.totalDurationMs
    };
  }

  return result;
}

function cohortsPerPersonWithPeers(cohorts) {
  const out = new Map(); // name -> { cohortCount, cohortKeys, peers:Set }

  for (const c of cohorts) {
    const members = c.members || [];
    for (const name of members) {
      if (!out.has(name)) {
        out.set(name, { cohortCount: 0, cohortKeys: [], peers: new Set() });
      }
      const rec = out.get(name);
      rec.cohortCount += 1;
      rec.cohortKeys.push(c.key);

      // add everyone else in this cohort as peers
      for (const other of members) {
        if (other !== name) rec.peers.add(other);
      }
    }
  }

  // Convert Map + Sets to plain JSON-friendly objects/arrays
  const obj = {};
  for (const [name, rec] of out.entries()) {
    obj[name] = {
      cohortCount: rec.cohortCount,
      cohortKeys: rec.cohortKeys,
      peers: Array.from(rec.peers).sort((a, b) => a.localeCompare(b)),
    };
  }
  return obj;
}


        // Cohort = active set between event times.
// Rule: start INCLUSIVE, end EXCLUSIVE (active if start <= t < end).
// Assumption: cohorts never repeat (unique active set each time it appears).

function buildCohorts(rows) {
  const events = [];
  const t = (s) => Date.parse(s);

  for (const r of rows) {
    const name = String(r.name || "").trim();
    if (!name) continue;

    const start = t(r.start);
    const end = t(r.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error(`Bad date for ${name}`);
    if (end < start) throw new Error(`End before start for ${name}`);

    events.push({ time: start, type: "start", name });
    events.push({ time: end, type: "end", name });
  }

  // end-exclusive: end before start at same timestamp
  events.sort((a, b) =>
    (a.time - b.time) ||
    ((a.type === "end") - (b.type === "end")) ||
    a.name.localeCompare(b.name)
  );

  const active = new Set();
  const cohorts = []; // each cohort appears once

  let i = 0;
  while (i < events.length) {
    const time = events[i].time;

    // apply all events at this time
    while (i < events.length && events[i].time === time) {
      const e = events[i++];
      if (e.type === "start") active.add(e.name);
      else active.delete(e.name);
    }

    const nextTime = i < events.length ? events[i].time : null;
    if (nextTime == null || nextTime <= time || active.size === 0) continue;

    const members = Array.from(active).sort();
    cohorts.push({
      start: time,          // 👈 cohort start timestamp (ms)
      end: nextTime,        // cohort end timestamp (ms)
      durationMs: nextTime - time,
      members,
      key: members.join("|") // stable ID (still useful)
    });
  }

  return cohorts;
}


        function medianCohortsPerPerson(cohorts) {
  const counts = new Map(); // name -> cohort count

  for (const c of cohorts) {
    for (const name of c.members) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  return median(Array.from(counts.values()));
}

function msToYearsMonthsDays(ms) {
  const MS_PER_DAY   = 24 * 60 * 60 * 1000;
  const DAYS_PER_YEAR = 365.25;
  const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;

  if (!Number.isFinite(ms) || ms < 0) {
    return { years: 0, months: 0, days: 0 };
  }

  let days = ms / MS_PER_DAY;

  const years = Math.floor(days / DAYS_PER_YEAR);
  days -= years * DAYS_PER_YEAR;

  const months = Math.floor(days / DAYS_PER_MONTH);
  days -= months * DAYS_PER_MONTH;

  return {
    years,
    months,
    days: Math.floor(days)
  };
}


function median(arr) {
  if (arr.length === 0) return null;

  const xs = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);

  return xs.length % 2
    ? xs[mid]
    : (xs[mid - 1] + xs[mid]) / 2;
}



function medianCohortDuration(cohorts) {
  const durations = cohorts.map(c =>
    c.spans.reduce((sum, [start, end]) => sum + (end - start), 0)
  );

  return median(durations);
}

        function cohortsPerPerson(cohorts) {
  const counts = new Map(); // name -> count

  for (const cohort of cohorts) {
    for (const name of cohort.members) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return Object.fromEntries(counts);
}

// Cohort = unique set of active people between change events.
// Rule: start is INCLUSIVE, end is EXCLUSIVE: active if start <= t < end.

function uniqueCohorts(rows) {
  const events = [];
  const t = (s) => Date.parse(s); // use ISO dates/datetimes; for YYYY-MM-DD this parses in local time

  for (const r of rows) {
    const name = String(r.name || "").trim();
    if (!name) continue;

    const start = t(r.start);
    const end = t(r.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error(`Bad date for ${name}`);
    if (end < start) throw new Error(`End before start for ${name}`);

    events.push({ time: start, type: "start", name });
    events.push({ time: end, type: "end", name });
  }

  // end-exclusive => process ends BEFORE starts at same timestamp
  events.sort((a, b) =>
    (a.time - b.time) ||
    ((a.type === "end") - (b.type === "end")) || // end first
    a.name.localeCompare(b.name)
  );

  const active = new Set();
  const cohorts = new Map(); // key -> { members, count, spans }

  let i = 0;
  while (i < events.length) {
    const time = events[i].time;

    // apply all events at this time
    while (i < events.length && events[i].time === time) {
      const e = events[i++];
      if (e.type === "start") active.add(e.name);
      else active.delete(e.name);
    }

    const nextTime = i < events.length ? events[i].time : null;
    if (nextTime == null || nextTime <= time || active.size === 0) continue;

    const members = Array.from(active).sort();
    const key = members.join("|");

    const rec = cohorts.get(key) || (cohorts.set(key, { members, count: 0, spans: [] }), cohorts.get(key));
    rec.count += 1;
    rec.spans.push([time, nextTime]); // ms timestamps; convert to Date if you want
  }

  return Array.from(cohorts, ([key, v]) => ({ key, ...v }));
}

})();
