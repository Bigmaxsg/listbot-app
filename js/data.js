// Data layer. Phase 1: demo store + items saved on this phone. Phase 2 swaps demo for Drive status files.
import { listItems, photosFor } from "./store.js";

let cache = null;

async function json(path) {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function load() {
  if (cache) return cache;
  const [states, demo] = await Promise.all([json("./states.json"), json("./demo/demo.json")]);
  cache = { states, demo };
  return cache;
}

export function demoOn() {
  try { return localStorage.getItem("listbot.demo") !== "off"; } catch { return true; }
}

export function setDemo(on) {
  try { localStorage.setItem("listbot.demo", on ? "on" : "off"); } catch { /* private mode */ }
}

export async function localItems() {
  try {
    const items = await listItems();
    return items.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  } catch {
    return [];
  }
}

export async function withPhotos(item) {
  if (!item.local || item.photoUrls) return item;
  try { item.photoUrls = await photosFor(item.item_number, item.photos); } catch { item.photoUrls = []; }
  return item;
}

export async function allItems() {
  const { demo } = await load();
  const local = (await localItems()).map((i) => ({ ...i, local: true }));
  return demoOn() ? [...local, ...demo.items] : local;
}

// Tasks Max has ticked off this session stay hidden (and out of the tab badge) until the app reloads.
const doneTasks = new Set();
const taskKey = (t) => `${t.type}:${t.item_number}`;
export function completeTask(t) { doneTasks.add(taskKey(t)); }
export function reopenTask(t) { doneTasks.delete(taskKey(t)); }

// Open tasks, urgent first (a sold item still listed on the other site is the double-sell risk).
export async function tasks() {
  const { demo } = await load();
  if (!demoOn()) return [];
  const open = demo.tasks.filter((t) => !doneTasks.has(taskKey(t)));
  return [...open.filter((t) => t.urgent), ...open.filter((t) => !t.urgent)];
}

export async function sales() {
  const { demo } = await load();
  return demoOn() ? { sales: demo.sales, weekly: demo.weekly_sales } : { sales: [], weekly: [] };
}
