// Tiny DOM helpers. Text always goes in via textContent (never innerHTML) so data can't inject markup.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

let STATES = {};
export function setStates(list) { STATES = Object.fromEntries(list.map((s) => [s.key, s])); }
export function stateInfo(key) { return STATES[key] || { key, label: key, tone: "neutral" }; }

export function chip(stateKey) {
  const s = stateInfo(stateKey);
  return h("span", { class: "chip", "data-tone": s.tone, "data-animated": !!s.animated }, s.label);
}

// Photo tile: a real photo URL, or the demo placeholder (emoji on a hue gradient).
export function photo(item, cls = "", index = 0) {
  if (item.photoUrls && item.photoUrls[index]) {
    return h("span", { class: "ph " + cls }, h("img", { src: item.photoUrls[index], alt: "" }));
  }
  return h("span", { class: "ph " + cls, style: `--h:${(item.hue || 220) + index * 8}` }, item.emoji || "📦");
}

export const money = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

let toastTimer;
export function toast(msg, kind = "") {
  const t = document.getElementById("toast");
  t.className = "toast " + kind;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

export function haptic(ms = 10) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

export function empty(icon, title, text, action) {
  return h("div", { class: "empty" }, h("div", { class: "empty-ico" }, icon), h("h2", {}, title), h("p", {}, text), action || null);
}
