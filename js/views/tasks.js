// Tasks tab: everything that needs Max — eBay drafts, Depop posts/deletes, match confirmations. Urgent first.
import { h, fill, toast, empty, photo, header, copyText } from "../ui.js";
import { icon } from "../icons.js";
import { tasks, allItems, completeTask, reopenTask } from "../data.js";

// type -> [icon, chip tone]
const KINDS = {
  ebay_review: ["edit", "amber"], depop_post: ["upload", "blue"], depop_delete: ["trash", "red"],
  confirm_match: ["help", "purple"], double_sale: ["alert", "red"],
};

export async function render(root) {
  const items = Object.fromEntries((await allItems()).map((i) => [i.item_number, i]));

  async function draw() {
    const open = await tasks();
    const card = (t) => {
      const item = items[t.item_number] || {};
      const href = `#item/${encodeURIComponent(t.item_number)}`;
      const finish = (msg = "Marked done") => {
        completeTask(t);
        toast(msg, "", { label: "Undo", fn: () => { reopenTask(t); draw(); } });
        draw();
      };
      const btn = (label, fn, cls = "") => h("button", { class: "btn " + cls, type: "button", onclick: fn }, label);
      const depop = () => h("a", { class: "btn", href: "https://www.depop.com/", target: "_blank", rel: "noopener" }, "Open Depop", icon("external"));
      let body;
      if (t.type === "depop_post") {
        body = h("div", { class: "task-actions grid" },
          btn("Save photos", () => toast("Saves photos to your camera roll (Phase 6)")),
          btn("Copy description", () => copyText(item.depop_description || item.title || "", "Description")),
          btn("Copy price", () => copyText(String(item.depop_price || item.price || ""), "Price")),
          depop(),
          btn("I posted it", () => finish(), "primary span2"));
      } else if (t.type === "depop_delete") {
        body = h("div", { class: "task-actions" }, depop(), btn("I deleted it", () => finish(), "primary"));
      } else if (t.type === "confirm_match") {
        body = h("div", { class: "task-actions" },
          btn("Not this one", () => finish("Marked as not a match")),
          btn(`Yes, it's ${t.item_number}`, () => finish("Match confirmed"), "primary"));
      } else {
        body = h("div", { class: "task-actions" },
          h("a", { class: "btn", href }, "View item"),
          btn(t.action, () => finish(), "primary"));
      }
      const [ico, tone] = KINDS[t.type] || ["box", "neutral"];
      return h("article", { class: "task card" + (t.urgent ? " urgent" : "") },
        h("a", { class: "task-top", href },
          photo(item, "task-thumb"),
          h("span", { class: "task-head" }, h("b", {}, t.title), h("span", { class: "muted" }, h("span", { class: "mono" }, t.item_number), item.brand ? ` · ${item.brand}` : "")),
          h("span", { class: "task-ico", "data-tone": tone }, icon(ico))),
        h("p", {}, t.text), body);
    };
    const urgent = open.filter((t) => t.urgent);
    const rest = open.filter((t) => !t.urgent);
    const sub = open.length ? `${urgent.length ? `${urgent.length} urgent · ` : ""}${open.length} to do` : null;
    fill(root, header("Tasks", sub),
      ...(open.length ? [
        urgent.length ? h("h2", { class: "sec urgent" }, icon("alert"), "Do these now") : null,
        ...urgent.map(card),
        urgent.length && rest.length ? h("h2", { class: "sec" }, "When you can") : null,
        ...rest.map(card),
      ] : [empty("done", "All caught up", "New drafts, Depop posts and sale confirmations show up here.")]));
    document.dispatchEvent(new CustomEvent("tasks-count", { detail: open.length }));
  }
  await draw();
}
