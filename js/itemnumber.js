// Item numbers are the universal key (Drive folder = eBay SKU = Depop SKU). Pure functions — unit tested.
const VALID = /^[A-Z0-9][A-Z0-9-]{0,49}$/; // eBay SKU max 50 chars

export function normalizeItemNumber(raw) {
  return String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidItemNumber(raw) {
  return VALID.test(normalizeItemNumber(raw));
}

// "A1042" -> { prefix: "A", num: 1042, width: 4 }; "1042" -> { prefix: "", num: 1042, width: 4 }
export function parseItemNumber(raw) {
  const m = normalizeItemNumber(raw).match(/^(.*?)(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], num: Number(m[2]), width: m[2].length };
}

// Suggest the next number after the most recent one, keeping prefix + zero padding.
// Skips numbers already used so a suggestion is never a duplicate.
export function nextItemNumber(last, used = []) {
  const p = parseItemNumber(last);
  if (!p) return "";
  const taken = new Set(used.map(normalizeItemNumber));
  let n = p.num + 1;
  let candidate;
  do {
    candidate = p.prefix + String(n).padStart(p.width, "0");
    n += 1;
  } while (taken.has(candidate));
  return candidate;
}

export function isDuplicate(raw, used = []) {
  const v = normalizeItemNumber(raw);
  return used.some((u) => normalizeItemNumber(u) === v);
}
