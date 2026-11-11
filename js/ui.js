// Tiny DOM helpers. Text always goes in via textContent (never innerHTML) so data can't inject markup.
import { icon } from "./icons.js";

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

// replaceChildren that skips null/false, so views can write `cond ? node : null` (a raw null renders as the text "null").
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
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
export const dollars = (v) => "$" + Math.round(Number(v || 0)).toLocaleString("en-US");

export function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// "2026-11-04" -> "Nov 4". Parsed by hand so the time zone can never shift the day.
export function shortDate(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || "");
  if (!m) return ymd || "";
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Page header: big title, optional one-line summary under it, optional control on the right.
export function header(title, sub, right) {
  return h("header", { class: "top" },
    h("div", {}, h("h1", {}, title), sub ? h("p", { class: "top-sub" }, sub) : null), right || null);
}

let toastTimer;
// action = { label, fn } adds a button (e.g. Undo) and keeps the toast up longer.
export function toast(msg, kind = "", action = null) {
  const t = document.getElementById("toast");
  t.className = "toast " + kind;
  t.replaceChildren(h("span", {}, msg),
    action ? h("button", { type: "button", onclick: () => { t.hidden = true; action.fn(); } }, action.label) : null);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, action ? 5000 : 2400);
}

export async function copyText(text, what) {
  try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast("Copy not allowed here"); }
}

export function haptic(ms = 10) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// Bottom action sheet. actions = [{ label, fn, cls }]; Cancel is always added. Also used to confirm deletes.
export function sheet({ title, text, preview, actions }) {
  const close = () => overlay.remove();
  const btn = (a) => h("button", { class: "sheet-btn " + (a.cls || ""), type: "button", onclick: () => { close(); if (a.fn) a.fn(); } }, a.label);
  const overlay = h("div", { class: "sheet-wrap", onclick: (e) => { if (e.target === overlay) close(); } },
    h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      preview ? h("img", { class: "sheet-preview", src: preview, alt: "" }) : null,
      h("div", { class: "sheet-title" }, h("b", {}, title), text ? h("span", {}, text) : null),
      ...actions.filter(Boolean).map(btn),
      btn({ label: "Cancel", cls: "cancel" })));
  document.body.append(overlay);
}

// Two-or-more option switch. options = [[key, label]]; calls onchange(key).
export function segmented(options, current, onchange) {
  const wrap = h("div", { class: "seg", role: "tablist" }, ...options.map(([key, label]) => h("button", {
    type: "button", role: "tab", "aria-selected": String(key === current),
    onclick: (e) => {
      wrap.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b === e.currentTarget)));
      onchange(key);
    },
  }, label)));
  return wrap;
}

export function empty(iconName, title, text, action) {
  return h("div", { class: "empty" }, h("div", { class: "empty-ico" }, icon(iconName)), h("h2", {}, title), h("p", {}, text), action || null);
}
