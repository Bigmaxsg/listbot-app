// Tasks tab: everything that needs Max — eBay drafts, Depop posts/deletes, match confirmations.
import { h, toast, empty } from "../ui.js";
import { tasks, allItems } from "../data.js";

const ICONS = { ebay_review: "📝", depop_post: "📤", depop_delete: "🗑️", confirm_match: "❓", double_sale: "⚠️" };

async function copy(text, what) {
  try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast("Copy not allowed here"); }
}

export async function render(root) {
  const list = await tasks();
  const items = Object.fromEntries((await allItems()).map((i) => [i.item_number, i]));
  const done = new Set();

  function draw() {
    const open = list.filter((t) => !done.has(t.item_number + t.type));
    const cards = open.map((t) => {
      const item = items[t.item_number] || {};
      const finish = () => { done.add(t.item_number + t.type); toast("Marked done (demo)"); draw(); };
      let body;
      if (t.type === "depop_post") {
        body = h("div", { class: "task-actions grid" },
          h("button", { class: "btn", type: "button", onclick: () => toast("Saves photos to your camera roll (Phase 6)") }, "Save photos"),
          h("button", { class: "btn", type: "button", onclick: () => copy(item.depop_description || item.title, "Description") }, "Copy description"),
          h("button", { class: "btn", type: "button", onclick: () => copy(String(item.depop_price || item.price), "Price") }, "Copy price"),
          h("a", { class: "btn", href: "https://www.depop.com/", target: "_blank", rel: "noopener" }, "Open Depop"),
          h("button", { class: "btn primary span2", type: "button", onclick: finish }, "Posted it ✓"));
      } else if (t.type === "confirm_match") {
        body = h("div", { class: "task-actions" },
          h("button", { class: "btn", type: "button", onclick: finish }, "Not this one"),
          h("button", { class: "btn primary", type: "button", onclick: finish }, `Yes, it's ${t.item_number}`));
      } else {
        body = h("div", { class: "task-actions" },
          h("button", { class: "btn primary", type: "button", onclick: finish }, t.action));
      }
      return h("article", { class: "task card" + (t.urgent ? " urgent" : "") },
        h("div", { class: "task-top" }, h("span", { class: "task-ico" }, ICONS[t.type] || "•"),
          h("div", {}, h("b", {}, t.title), h("span", { class: "mono muted" }, " · " + t.item_number))),
        h("p", {}, t.text), body);
    });
    root.replaceChildren(h("header", { class: "top" }, h("h1", {}, "Tasks"), h("span", { class: "count" }, String(open.length))),
      ...(cards.length ? cards : [empty("🎉", "Nothing needs you", "New drafts, Depop posts and sale confirmations will show up here.")]));
    document.dispatchEvent(new CustomEvent("tasks-count", { detail: open.length }));
  }
  draw();
}
