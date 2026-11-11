// App shell: hash router, tab bar, task badge, install hint, service worker.
import { setStates, h } from "./ui.js";
import { icon } from "./icons.js";
import { load, tasks } from "./data.js";
import * as capture from "./views/capture.js";
import * as items from "./views/items.js";
import * as item from "./views/item.js";
import * as taskView from "./views/tasks.js";
import * as sold from "./views/sold.js";
import * as settings from "./views/settings.js";

const VIEWS = { capture, items, tasks: taskView, sold, settings };
const view = document.getElementById("view");

function setBadge(n) {
  const b = document.querySelector('[data-tab="tasks"] .badge');
  b.textContent = n > 9 ? "9+" : String(n);
  b.hidden = !n;
}
document.addEventListener("tasks-count", (e) => setBadge(e.detail));

// Remember how far each screen was scrolled, so coming back from an item lands on the same row.
let prevHash = "";
const scrollMemo = new Map();

async function route() {
  scrollMemo.set(prevHash, window.scrollY);
  const hash = location.hash.slice(1) || "capture";
  const [name, arg] = hash.split("/");
  const tab = name === "item" ? "items" : (VIEWS[name] ? name : "capture");
  document.querySelectorAll(".tabbar a").forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  view.classList.remove("in");
  try {
    if (name === "item") await item.render(view, decodeURIComponent(arg || ""));
    else await VIEWS[tab].render(view);
  } catch (err) {
    console.error(err);
    view.replaceChildren(h("div", { class: "empty" }, h("h2", {}, "Something went wrong"), h("p", {}, String(err.message || err)),
      h("button", { class: "btn", type: "button", onclick: () => location.reload() }, "Reload app")));
  }
  const cameBack = prevHash.startsWith("item/") && name === "items";
  window.scrollTo(0, cameBack ? (scrollMemo.get("items") || 0) : 0);
  prevHash = hash;
  requestAnimationFrame(() => view.classList.add("in"));
}

function installHint() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  let dismissed = false;
  try { dismissed = localStorage.getItem("listbot.hintDismissed") === "1"; } catch { /* private mode */ }
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (standalone || dismissed || !isIOS) return;
  const close = () => { banner.remove(); document.body.classList.remove("has-install"); try { localStorage.setItem("listbot.hintDismissed", "1"); } catch { /* ignore */ } };
  const banner = h("div", { class: "install" },
    h("span", { class: "install-ico" }, icon("share")),
    h("div", {}, h("b", {}, "Install ListBot"), h("span", {}, "Share, then “Add to Home Screen”")),
    h("button", { type: "button", "aria-label": "Dismiss", onclick: close }, icon("close")));
  document.body.append(banner);
  document.body.classList.add("has-install");
}

async function boot() {
  const { states } = await load();
  setStates(states.states);
  window.addEventListener("hashchange", route);
  // Tapping the tab you're already on jumps back to the top, like a native tab bar.
  document.querySelectorAll(".tabbar a").forEach((a) => a.addEventListener("click", (e) => {
    if (a.getAttribute("href") !== (location.hash || "#capture")) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  await route();
  setBadge((await tasks()).length);
  installHint();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

boot();
