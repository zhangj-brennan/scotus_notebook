/**
 * Build a weighted overlap network:
 * - node = justice (by justice number)
 * - link = overlap between two justices
 * - weightYears = number of years overlapped
 *
 * Returns: { nodes: [...], links: [...] }
 */
function buildJusticeOverlapNetwork(justices, {
  idKey = "justice number order",
  labelKey = "first last",
  startKey = "start_dt",
  endKey = "end_dt"
} = {}) {

  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

  const nodes = justices
    .map(d => {
      const id = String(d?.[idKey] ?? "").trim();
      const s = d?.[startKey];
      const e = d?.[endKey];
      if (!id || !(s instanceof Date) || !(e instanceof Date)) return null;
      return {
        id,
        label: String(d?.[labelKey] ?? "").trim() || `Justice #${id}`,
        start_dt: s,
        end_dt: e,
        isCurrent: !!d.isCurrent,
        endReason: d.endReason ?? d["end reason"] ?? ""
      };
    })
    .filter(Boolean);

  const sorted = nodes.slice().sort((a,b) => a.start_dt - b.start_dt);

  const links = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.start_dt > a.end_dt) break;

      const start = (a.start_dt > b.start_dt) ? a.start_dt : b.start_dt;
      const end   = (a.end_dt   < b.end_dt)   ? a.end_dt   : b.end_dt;

      if (end >= start) {
        const years = (end - start) / MS_PER_YEAR;
        links.push({
          source: a.id,
          target: b.id,
          overlapStart: start,
          overlapEnd: end,
          weightYears: years
        });
      }
    }
  }

  return { nodes, links };
}

/* ============================================================
   1) Connected Components (also builds adjacency)
============================================================ */
function computeConnectedComponents(nodes, links) {
  const adj = new Map(nodes.map(n => [n.id, new Set()]));

  links.forEach(l => {
    const s = (typeof l.source === "object") ? l.source.id : l.source;
    const t = (typeof l.target === "object") ? l.target.id : l.target;
    if (!adj.has(s) || !adj.has(t)) return;
    adj.get(s).add(t);
    adj.get(t).add(s);
  });

  const seen = new Set();
  const components = [];

  for (const n of nodes) {
    if (seen.has(n.id)) continue;

    const comp = [];
    const stack = [n.id];
    seen.add(n.id);

    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      for (const v of (adj.get(u) || [])) {
        if (!seen.has(v)) {
          seen.add(v);
          stack.push(v);
        }
      }
    }
    components.push(comp);
  }

  components.sort((a,b) => b.length - a.length);

  const compIndex = new Map();
  components.forEach((ids, i) => ids.forEach(id => compIndex.set(id, i)));

  nodes.forEach(n => {
    n.componentId = compIndex.get(n.id) ?? -1;
    n.componentSize = (n.componentId >= 0) ? components[n.componentId].length : 0;
  });

  return { components, adj };
}

/* ============================================================
   2) Label Propagation Communities (clusters)
   Requires nodesById map + adjacency map from above
============================================================ */
function labelPropagationCommunities(nodes, adj, nodesById, {
  iterations = 40,
  seed = 2
} = {}) {

  // deterministic-ish RNG
  function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
  const rand = mulberry32(seed);

  // init label = self
  nodes.forEach(n => { n.communityLabel = n.id; });

  const order = nodes.map(n => n.id);

  for (let it = 0; it < iterations; it++) {
    // shuffle
    order.sort(() => rand() - 0.5);

    for (const id of order) {
      const neigh = adj.get(id);
      if (!neigh || neigh.size === 0) continue;

      const counts = new Map();
      for (const nb of neigh) {
        const nbNode = nodesById.get(nb);
        if (!nbNode) continue;
        const lab = nbNode.communityLabel;
        counts.set(lab, (counts.get(lab) || 0) + 1);
      }

      let bestLab = null, bestCt = -1;
      for (const [lab, ct] of counts) {
        if (ct > bestCt || (ct === bestCt && String(lab) < String(bestLab))) {
          bestCt = ct; bestLab = lab;
        }
      }

      const node = nodesById.get(id);
      if (node && bestLab != null) node.communityLabel = bestLab;
    }
  }

  // compress labels -> 0..K-1
  const uniq = Array.from(new Set(nodes.map(n => n.communityLabel))).sort();
  const map = new Map(uniq.map((lab, i) => [lab, i]));

  nodes.forEach(n => { n.communityId = map.get(n.communityLabel); });

  return { communityCount: uniq.length };
}

/**
 * Draw a force-directed network:
 * - nodes sized by degree
 * - also computes: connected components + label-prop communities
 * - colors by communityId (you can swap to componentId)
 */
function drawJusticeOverlapNetwork(network, {
  selector = "#overlapNetwork",
  width = 800,
  height = 600,
  colorMode = "none" // "community" | "component"
} = {}) {
  const root = d3.select(selector);
  root.selectAll("*").remove();

  const { nodes, links } = network;

  const svg = root.append("svg")
    .attr("width", width)
    .attr("height", height);

  const tooltip = d3.select("#tooltip").empty()
    ? d3.select("body").append("div").attr("id","tooltip").attr("class","tooltip")
    : d3.select("#tooltip");

  // ---- lookup ----
  const nodesById = new Map(nodes.map(n => [n.id, n]));

  // ---- compute components + adjacency ----
  const { components, adj } = computeConnectedComponents(nodes, links);

  // ---- compute communities (label propagation) ----
  const { communityCount } = labelPropagationCommunities(nodes, adj, nodesById, {
    iterations: 50,
    seed: 2
  });

  // ---- degree (for sizing) ----
  const degreeMap = new Map(nodes.map(n => [n.id, 0]));
  links.forEach(l => {
    const s = (typeof l.source === "object") ? l.source.id : l.source;
    const t = (typeof l.target === "object") ? l.target.id : l.target;
    degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
    degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
  });
  nodes.forEach(n => { n.degree = degreeMap.get(n.id) || 0; });

  const maxDeg = d3.max(nodes, d => d.degree) || 0;
  const nodeRadius = d3.scaleSqrt()
    .domain([6, Math.max(1, maxDeg)])
    .range([2, 7]);

  // ---- link scales ----
  const wExtent = d3.extent(links, d => d.weightYears);
  const wMin = wExtent[0] ?? 0;
  const wMax = wExtent[1] ?? 1;

  const linkWidth = d3.scaleLinear().domain([wMin, wMax]).range([0.5, 2]);
  const linkDistance = d3.scaleLinear().domain([wMin, wMax]).range([10, 1]);

  // ---- color ----
  const palette = d3.schemeTableau10 || d3.schemeCategory10;
  const commColor = d3.scaleOrdinal(palette).domain(d3.range(communityCount));
  const compColor = d3.scaleOrdinal(palette).domain(d3.range(components.length));

  function nodeColor(d){
    if (d.isCurrent) return (COLORS?.red || "#ED1C24");
    if (colorMode === "component") return compColor(d.componentId);
    if (colorMode === "none") return COLORS.black;
    return commColor(d.communityId);
  }

  // ---- simulation ----
  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.id)
      .distance(d => linkDistance(d.weightYears))
      .strength(d => {
        const t = (d.weightYears - wMin) / ((wMax - wMin) || 1);
        return 0.05 + 0.55 * t;
      })
    )
    .force("charge", d3.forceManyBody().strength(d => - d.degree * 1.5))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(d => nodeRadius(d.degree) + 2));

  // ---- links ----
  const link = svg.append("g")
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.22)
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke-width", d => linkWidth(d.weightYears));

  // ---- nodes ----
  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", d => nodeRadius(d.degree))
    .attr("fill", nodeColor)
    .attr("stroke", "#000")
    .attr("stroke-width", 0.6)
    .call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.2).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      })
    );

  // ---- hover ----
  node
    .on("mouseenter", function(event, d){
      link.attr("stroke-opacity", l =>
        (l.source.id === d.id || l.target.id === d.id) ? 0.85 : 0.06
      );
      d3.select(this).attr("r", nodeRadius(d.degree) + 3).raise();

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.label}</strong><br>` +
          `${d.start_dt.getFullYear()}–${d.isCurrent ? "Present" : d.end_dt.getFullYear()}<br>` +
          `Degree: ${d.degree}<br>` +
          `Component: ${d.componentId} (size ${d.componentSize})<br>` +
          `Community: ${d.communityId}`
        );
    })
    .on("mousemove", function(event){
      tooltip
        .style("left", (event.clientX + 10) + "px")
        .style("top", (event.clientY + 10) + "px");
    })
    .on("mouseleave", function(event, d){
      link.attr("stroke-opacity", 0.22);
      d3.select(this).attr("r", nodeRadius(d.degree));
      tooltip.style("opacity", 0);
    });

  // ---- tick ----
  sim.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
  });
}