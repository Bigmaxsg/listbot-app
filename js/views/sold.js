// Sold tab: totals, weekly revenue bars (single series, no legend; tap a bar to read it), platform split, feed.
import { h, fill, money, dollars, shortDate, empty, header } from "../ui.js";
import { sales } from "../data.js";

const NAMES = { ebay: "eBay", depop: "Depop" };

export async function render(root) {
  const { sales: rows, weekly } = await sales();
  if (!rows.length || !weekly.length) {
    fill(root, header("Sold"), empty("dollar", "No sales yet", "Sales from eBay and Depop land here as they happen."));
    return;
  }
  const week = weekly[weekly.length - 1];
  const prev = weekly[weekly.length - 2];
  const last4 = weekly.slice(-4);
  const month = last4.reduce((a, w) => a + w.revenue, 0);
  const monthCount = last4.reduce((a, w) => a + w.count, 0);
  const max = Math.max(...weekly.map((w) => w.revenue));
  const delta = prev ? week.revenue - prev.revenue : 0;

  const readout = h("span", { class: "readout" });
  let picked = weekly.length - 1;
  const bars = h("div", { class: "bars", role: "group", "aria-label": `Revenue per week, last ${weekly.length} weeks` },
    ...weekly.map((w, i) => {
      const [mon, day] = w.week.split(" ");
      const firstOfMonth = i === 0 || weekly[i - 1].week.split(" ")[0] !== mon;
      return h("button", {
        class: "bar", type: "button", style: `--v:${(100 * w.revenue / max).toFixed(1)}%`,
        "aria-label": `Week of ${w.week}: ${dollars(w.revenue)}, ${w.count} sold`, onclick: () => { picked = i; pick(); },
      }, h("span", { class: "bar-fill" }), h("span", { class: "bar-lbl" }, firstOfMonth ? h("b", {}, mon) : null, day));
    }));
  function pick() {
    const w = weekly[picked];
    bars.querySelectorAll(".bar").forEach((b, i) => b.setAttribute("aria-pressed", String(i === picked)));
    readout.replaceChildren(h("b", {}, dollars(w.revenue)), ` · ${w.count} sold · week of ${w.week}`);
  }
  pick();

  const by = { ebay: 0, depop: 0 };
  rows.forEach((s) => { by[s.platform] = (by[s.platform] || 0) + s.price; });
  const total = by.ebay + by.depop;
  const split = total ? h("section", { class: "card" }, h("span", { class: "lbl" }, "Where recent sales came from"),
    h("div", { class: "split", role: "img", "aria-label": `eBay ${money(by.ebay)}, Depop ${money(by.depop)}` },
      ...["ebay", "depop"].filter((p) => by[p]).map((p) => h("span", { class: p, style: `flex-grow:${by[p]}` }))),
    h("div", { class: "split-key" }, ...["ebay", "depop"].map((p) =>
      h("span", {}, h("i", { class: p }), NAMES[p], h("b", {}, dollars(by[p])), h("em", {}, `${Math.round(100 * by[p] / total)}%`))))) : null;

  fill(root, 
    header("Sold", `${week.count} sold this week`),
    h("div", { class: "tiles" },
      h("div", { class: "stat card" }, h("span", { class: "lbl" }, "This week"), h("span", { class: "big-num" }, dollars(week.revenue)),
        prev ? h("span", { class: "delta " + (delta >= 0 ? "up" : "down") }, `${delta >= 0 ? "▲" : "▼"} ${dollars(Math.abs(delta))} vs last week`) : null),
      h("div", { class: "stat card" }, h("span", { class: "lbl" }, "Last 4 weeks"), h("span", { class: "big-num" }, dollars(month)),
        h("span", { class: "delta" }, `${monthCount} items sold`))),
    h("section", { class: "card" }, h("span", { class: "lbl" }, "Revenue per week"), readout, bars),
    split,
    h("section", { class: "card sales" }, h("span", { class: "lbl" }, "Recent sales"),
      ...rows.map((s) => h("div", { class: "sale" },
        h("span", { class: "sale-body" }, h("b", {}, s.title),
          h("span", { class: "muted" }, h("span", { class: "plat " + s.platform }, NAMES[s.platform] || s.platform), ` · ${s.item_number} · ${shortDate(s.date)} · sold in ${s.days_to_sell}d`)),
        h("span", { class: "price" }, money(s.price))))));
}
