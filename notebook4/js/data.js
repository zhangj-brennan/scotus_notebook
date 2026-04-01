import { CONFIG } from "./config.js";
import { parseBooleanFlexible, parseDateFlexible, parseNumberFlexible } from "./utils.js";

export async function loadData() {
  const raw = await d3.csv(CONFIG.csvPath);

  return raw
    .map(parseRow)
    .filter(d => d.startDate && Number.isFinite(d.tenureYears))
    .sort((a, b) => d3.ascending(a.startDate, b.startDate));
}

function parseRow(row) {
  const startDate = parseDateFlexible(row[CONFIG.fields.start]);
  const days = parseNumberFlexible(row[CONFIG.fields.days]);
  const tenureYears = days / 365.25;

  return {
    raw: row,
    name: row[CONFIG.fields.name] || "",
    startDate,
    days,
    tenureYears,
    isCurrent: parseBooleanFlexible(row[CONFIG.fields.isCurrent])
  };
}
