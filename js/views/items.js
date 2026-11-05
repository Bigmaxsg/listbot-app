// Items tab: searchable list with status filters.
import { h, chip, photo, money, when, stateInfo, empty } from "../ui.js";
import { allItems, withPhotos } from "../data.js";

const FILTERS = [
  ["all", "All"], ["needs", "Needs you"], ["working", "In progress"], ["live", "Live"], ["sold", "Sold"],
];

export function groupOf(item) {
  const s = stateInfo(item.state);
  if (s.needs_max) return "needs";
  if (["live_ebay", "live_both"].includes(item.state)) return "live";
  if (item.state.startsWith("sold") || ["delisting", "closed"].includes(item.state)) return "sold";
  return "working";
}

export async function render(root) {
  const items = await Promise.all((await allItems()).map(withPhotos));
  let filter = "all";
  let q = "";
  const list = h("div", { class: "list" });
  const search = h("input", { class: "search", type: "search", placeholder: "Search item # or title", "aria-label": "Search items" });

  function draw() {
    const shown = items.filter((i) => (filter === "all" || groupOf(i) === filter)
      && (!q || `${i.item_number} ${i.title}`.toLowerCase().includes(q)));
    list.replaceChildren(...(shown.length ? shown.map(card) : [empty("🔎", "Nothing here", q ? "No items match your search." : "Items you submit show up here.")]));
  }

  const pills = h("div", { class: "pills", role: "tablist" }, ...FILTERS.map(([k, label]) => h("button", {
    class: "pill" + (k === filter ? " on" : ""), type: "button", role: "tab",
    onclick: (e) => { filter = k; pills.querySelectorAll(".pill").forEach((p) => p.classList.toggle("on", p === e.currentTarget)); draw(); },
  }, label)));

  search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); draw(); });
  root.replaceChildren(h("header", { class: "top" }, h("h1", {}, "Items"), h("span", { class: "count" }, `${items.length}`)), search, pills, list);
  draw();
}

function card(i) {
  return h("a", { class: "item-card card", href: `#item/${encodeURIComponent(i.item_number)}` },
    photo(i, "thumb"),
    h("span", { class: "ic-body" },
      h("span", { class: "ic-top" }, h("b", { class: "mono" }, i.item_number), i.local ? h("span", { class: "local" }, "This phone") : null),
      h("span", { class: "ic-title" }, i.title),
      h("span", { class: "ic-foot" }, chip(i.state), i.price ? h("span", { class: "price" }, money(i.price)) : h("span", { class: "muted" }, when(i.updated)))));
}
