// Sold tab: totals + weekly revenue bars (single series → no legend; tap a bar for its value) + feed.
import { h, money, toast, empty } from "../ui.js";
import { sales } from "../data.js";

export async function render(root) {
  const { sales: rows, weekly } = await sales();
  if (!rows.length) {
    root.replaceChildren(h("header", { class: "top" }, h("h1", {}, "Sold")), empty("💸", "No sales yet", "Sales from eBay and Depop will land here."));
    return;
  }
  const week = weekly[weekly.length - 1];
  const month = weekly.slice(-4).reduce((a, w) => a + w.revenue, 0);
  const max = Math.max(...weekly.map((w) => w.revenue));
  const bars = h("div", { class: "bars", role: "img", "aria-label": `Revenue per week, last ${weekly.length} weeks` },
    ...weekly.map((w, i) => h("button", {
      class: "bar" + (i === weekly.length - 1 ? " last" : ""), type: "button",
      style: `--v:${(100 * w.revenue / max).toFixed(1)}%`, "aria-label": `${w.week}: $${w.revenue}`,
      onclick: () => toast(`${w.week}: $${w.revenue.toLocaleString()} · ${w.count} sold`),
    }, h("span", { class: "bar-fill" }), h("span", { class: "bar-lbl" }, w.week.split(" ")[1]))));

  root.replaceChildren(
    h("header", { class: "top" }, h("h1", {}, "Sold")),
    h("div", { class: "tiles" },
      h("div", { class: "stat card" }, h("span", { class: "lbl" }, "This week"), h("span", { class: "big-num" }, "$" + week.revenue.toLocaleString())),
      h("div", { class: "stat card" }, h("span", { class: "lbl" }, "Last 4 weeks"), h("span", { class: "big-num" }, "$" + month.toLocaleString()))),
    h("section", { class: "card" }, h("span", { class: "lbl" }, "Revenue per week"), bars),
    h("div", { class: "list" }, ...rows.map((s) => h("div", { class: "sale card" },
      h("span", { class: "plat-badge " + s.platform }, s.platform === "ebay" ? "eBay" : "Depop"),
      h("span", { class: "sale-body" }, h("b", {}, s.title), h("span", { class: "muted" }, `${s.item_number} · ${s.date} · ${s.days_to_sell}d to sell`)),
      h("span", { class: "price" }, money(s.price))))));
}
