// Item detail: photo carousel, listing, links and the event timeline.
import { h, chip, photo, money, when, stateInfo, empty } from "../ui.js";
import { allItems, withPhotos } from "../data.js";

export async function render(root, id) {
  const found = (await allItems()).find((i) => i.item_number === id);
  if (!found) {
    root.replaceChildren(h("a", { class: "back", href: "#items" }, "‹ Items"), empty("🤷", "Item not found", `No item ${id}.`));
    return;
  }
  const i = await withPhotos(found);
  const n = Math.max(1, i.photos || 1);
  const dots = h("div", { class: "dots" }, ...Array.from({ length: n }, (_, k) => h("span", { class: k === 0 ? "on" : "" })));
  const carousel = h("div", { class: "carousel" }, ...Array.from({ length: n }, (_, k) => photo(i, "slide", k)));
  carousel.addEventListener("scroll", () => {
    const k = Math.round(carousel.scrollLeft / carousel.clientWidth);
    dots.querySelectorAll("span").forEach((d, j) => d.classList.toggle("on", j === k));
  }, { passive: true });

  const links = h("div", { class: "links" },
    i.ebay_url ? h("a", { class: "btn", href: i.ebay_url, target: "_blank", rel: "noopener" }, "Open on eBay") : null,
    i.depop_url ? h("a", { class: "btn", href: i.depop_url, target: "_blank", rel: "noopener" }, "Open on Depop") : null);

  root.replaceChildren(
    h("a", { class: "back", href: "#items" }, "‹ Items"),
    h("div", { class: "detail-media" }, carousel, dots),
    h("section", { class: "detail-head" },
      h("div", { class: "row" }, h("b", { class: "mono" }, i.item_number), chip(i.state)),
      h("h1", { class: "detail-title" }, i.title),
      i.price ? h("div", { class: "prices" },
        h("span", {}, h("small", {}, "eBay"), money(i.price)),
        h("span", {}, h("small", {}, "Depop"), money(i.depop_price || i.price))) : null),
    i.attention ? h("div", { class: "alert" }, i.attention) : null,
    links.children.length ? links : null,
    i.notes ? h("section", { class: "card" }, h("span", { class: "lbl" }, "Your notes"), h("p", {}, i.notes)) : null,
    h("section", { class: "card" }, h("span", { class: "lbl" }, "Timeline"),
      h("ol", { class: "timeline" }, ...[...(i.timeline || [])].reverse().map(([at, st, text]) =>
        h("li", { "data-tone": stateInfo(st).tone }, h("span", { class: "t-text" }, text), h("span", { class: "muted" }, when(at)))))));
}
