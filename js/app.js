// App shell: hash router, tab bar, task badge, install hint, service worker.
import { setStates, h } from "./ui.js";
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

async function route() {
  const [name, arg] = (location.hash.slice(1) || "capture").split("/");
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
    view.replaceChildren(h("div", { class: "empty" }, h("h2", {}, "Something went wrong"), h("p", {}, String(err.message || err))));
  }
  window.scrollTo(0, 0);
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
    h("div", {}, h("b", {}, "Install ListBot"), h("span", {}, "Tap Share ", h("span", { class: "share-ico", "aria-label": "Share" }, "⬆︎"), " then “Add to Home Screen”")),
    h("button", { type: "button", "aria-label": "Dismiss", onclick: close }, "✕"));
  document.body.append(banner);
  document.body.classList.add("has-install");
}

async function boot() {
  const { states } = await load();
  setStates(states.states);
  window.addEventListener("hashchange", route);
  await route();
  setBadge((await tasks()).length);
  installHint();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

boot();
