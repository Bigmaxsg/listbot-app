// Item detail: photo carousel, listing details, links and the event timeline.
import { h, fill, chip, photo, money, when, stateInfo, empty, toast, sheet, segmented, copyText } from "../ui.js";
import { icon } from "../icons.js";
import { allItems, withPhotos } from "../data.js";
import { deleteItem } from "../store.js";

const back = () => h("a", { class: "back", href: "#items" }, icon("back"), "Items");

function facts(i) {
  const rows = [["Brand", i.brand], ["Size", i.size], ["Condition", i.condition], ["Category", i.category]].filter(([, v]) => v);
  if (!rows.length && !(i.flaws || []).length) return null;
  return h("section", { class: "card" }, h("span", { class: "lbl" }, "Details"),
    h("dl", { class: "facts" }, ...rows.map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, v)))),
    (i.flaws || []).length ? h("div", { class: "flaws" }, h("span", { class: "lbl" }, "Flaws disclosed"),
      h("div", { class: "flaw-list" }, ...i.flaws.map((f) => h("span", {}, f)))) : null);
}

function description(i) {
  if (!i.description && !i.depop_description) return null;
  const texts = { ebay: i.description, depop: i.depop_description };
  let cur = texts.ebay ? "ebay" : "depop";
  const body = h("p", { class: "desc" }, texts[cur]);
  const both = texts.ebay && texts.depop;
  return h("section", { class: "card" },
    h("div", { class: "lbl-row" },
      both ? segmented([["ebay", "eBay"], ["depop", "Depop"]], cur, (k) => { cur = k; body.textContent = texts[k]; }) : h("span", { class: "lbl" }, "Description"),
      h("button", { class: "link-btn", type: "button", onclick: () => copyText(texts[cur], "Description") }, icon("copy"), "Copy")),
    body);
}

export async function render(root, id) {
  const found = (await allItems()).find((i) => i.item_number === id);
  if (!found) {
    fill(root, back(), empty("help", "Item not found", `No item ${id}.`));
    return;
  }
  const i = await withPhotos(found);
  const n = Math.max(1, i.photos || 1);
  const dots = h("div", { class: "dots" }, ...Array.from({ length: n }, (_, k) => h("span", { class: k === 0 ? "on" : "" })));
  const counter = h("span", { class: "photo-count" }, `1 / ${n}`);
  const carousel = h("div", { class: "carousel" }, ...Array.from({ length: n }, (_, k) => photo(i, "slide", k)));
  carousel.addEventListener("scroll", () => {
    const k = Math.round(carousel.scrollLeft / carousel.clientWidth);
    dots.querySelectorAll("span").forEach((d, j) => d.classList.toggle("on", j === k));
    counter.textContent = `${k + 1} / ${n}`;
  }, { passive: true });

  const links = h("div", { class: "links" },
    i.ebay_url ? h("a", { class: "btn", href: i.ebay_url, target: "_blank", rel: "noopener" }, "Open on eBay", icon("external")) : null,
    i.depop_url ? h("a", { class: "btn", href: i.depop_url, target: "_blank", rel: "noopener" }, "Open on Depop", icon("external")) : null);

  const remove = () => sheet({
    title: `Delete ${i.item_number}?`, text: "Removes this item and its photos from this phone. This can't be undone.",
    actions: [{ label: "Delete from this phone", cls: "danger", fn: async () => {
      try { await deleteItem(i.item_number, i.photos || 0); toast(`${i.item_number} deleted`); location.hash = "#items"; } catch { toast("Couldn't delete — try again", "bad"); }
    } }],
  });

  fill(root, 
    back(),
    h("div", { class: "detail-media" }, carousel, n > 1 ? counter : null, n > 1 ? dots : null),
    h("section", { class: "detail-head" },
      h("div", { class: "row" }, h("b", { class: "mono" }, i.item_number), chip(i.state), i.local ? h("span", { class: "local" }, "This phone") : null),
      h("h1", { class: "detail-title" }, i.title)),
    i.attention ? h("div", { class: "alert" }, icon("alert"), h("span", {}, i.attention)) : null,
    i.price ? h("section", { class: "card prices" },
      h("div", {}, h("small", {}, "eBay"), h("b", {}, money(i.price))),
      h("div", {}, h("small", {}, "Depop"), h("b", {}, money(i.depop_price || i.price))),
      i.rationale ? h("p", {}, i.rationale) : null) : null,
    links.children.length ? links : null,
    facts(i),
    description(i),
    i.notes ? h("section", { class: "card" }, h("span", { class: "lbl" }, "Your notes"), h("p", { class: "desc" }, i.notes)) : null,
    h("section", { class: "card" }, h("span", { class: "lbl" }, "Timeline"),
      h("ol", { class: "timeline" }, ...[...(i.timeline || [])].reverse().map(([at, st, text]) =>
        h("li", { "data-tone": stateInfo(st).tone }, h("span", { class: "t-text" }, text), h("span", { class: "muted" }, when(at)))))),
    i.local ? h("button", { class: "btn danger block quiet", type: "button", onclick: remove }, icon("trash"), "Delete from this phone") : null);
}
