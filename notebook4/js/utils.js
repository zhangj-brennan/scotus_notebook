export function parseDateFlexible(value) {
  if (!value) return null;

  const tryFormats = [
    d3.timeParse("%Y-%m-%d"),
    d3.timeParse("%m/%d/%Y"),
    d3.timeParse("%m/%d/%y"),
    d3.timeParse("%Y/%m/%d"),
    d3.timeParse("%b %d, %Y"),
    d3.timeParse("%B %d, %Y")
  ];

  for (const parse of tryFormats) {
    const dt = parse(value);
    if (dt) return dt;
  }

  const fallback = new Date(value);
  return Number.isNaN(+fallback) ? null : fallback;
}

export function parseNumberFlexible(value) {
  if (value == null || value === "") return NaN;
  return +String(value).replace(/,/g, "").trim();
}

export function parseBooleanFlexible(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y";
}

export function pct(value) {
  return d3.format(".0%")(value || 0);
}

export function pct1(value) {
  return d3.format(".1%")(value || 0);
}

export function yearDate(year) {
  return new Date(year, 0, 1);
}
