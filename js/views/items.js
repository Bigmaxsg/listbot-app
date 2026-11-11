// Items tab: searchable list with status filters.
import { h, fill, chip, photo, money, when, stateInfo, empty, header } from "../ui.js";
import { icon } from "../icons.js";
import { allItems, withPhotos } from "../data.js";

const FILTERS = [
  ["all", "All"], ["needs", "Needs you"], ["working", "In progress"], ["live", "Live"], ["sold", "Sold"],
];
// Filter + search live outside render() so opening an item and coming back keeps your place.
const ui = { filter: "all", q: "" };

export function groupOf(item) {
  const s = stateInfo(item.state);
  if (s.needs_max) return "needs";
  if (["live_ebay", "live_both"].includes(item.state)) return "live";
  if (item.state.startsWith("sold") || ["delisting", "closed"].includes(item.state)) return "sold";
  return "working";
}

export async function render(root) {
  const items = await Promise.all((await allItems()).map(withPhotos));
  const counts = { all: items.length };
  items.forEach((i) => { const g = groupOf(i); counts[g] = (counts[g] || 0) + 1; });
  const list = h("div", { class: "list" });
  const search = h("input", { class: "search", type: "search", placeholder: "Search item # or title", "aria-label": "Search items", value: ui.q });

  function draw() {
    const q = ui.q.trim().toLowerCase();
    const shown = items.filter((i) => (ui.filter === "all" || groupOf(i) === ui.filter)
      && (!q || `${i.item_number} ${i.title}`.toLowerCase().includes(q)));
    fill(list, ...(shown.length ? shown.map(card) : [q
      ? empty("search", "No matches", `Nothing matches “${ui.q.trim()}”.`)
      : empty("box", "Nothing here yet", items.length ? "No items in this group right now." : "Items you submit from Capture show up here.",
        items.length ? null : h("a", { class: "btn primary", href: "#capture" }, "Add your first item"))]));
  }

  const pills = h("div", { class: "pills", role: "tablist" }, ...FILTERS.map(([k, label]) => h("button", {
    class: "pill" + (k === ui.filter ? " on" : ""), type: "button", role: "tab", "aria-selected": String(k === ui.filter),
    onclick: (e) => {
      ui.filter = k;
      pills.querySelectorAll(".pill").forEach((p) => { p.classList.toggle("on", p === e.currentTarget); p.setAttribute("aria-selected", String(p === e.currentTarget)); });
      draw();
    },
  }, label, h("i", {}, String(counts[k] || 0)))));

  search.addEventListener("input", () => { ui.q = search.value; draw(); });
  const needs = counts.needs || 0;
  fill(root, 
    header("Items", items.length ? `${items.length} item${items.length === 1 ? "" : "s"}${needs ? ` · ${needs} need${needs === 1 ? "s" : ""} you` : ""}` : null),
    h("label", { class: "search-wrap" }, icon("search"), search), pills, list);
  draw();
}

function card(i) {
  return h("a", { class: "item-card card", href: `#item/${encodeURIComponent(i.item_number)}` },
    photo(i, "thumb"),
    h("span", { class: "ic-body" },
      h("span", { class: "ic-top" }, h("b", { class: "mono" }, i.item_number), i.local ? h("span", { class: "local" }, "This phone") : null,
        i.price ? h("span", { class: "price" }, money(i.price)) : null),
      h("span", { class: "ic-title" }, i.title),
      h("span", { class: "ic-foot" }, chip(i.state), h("span", { class: "muted" }, when(i.updated)))));
}
