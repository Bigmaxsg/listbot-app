// Settings tab: engine status, connections, demo toggle, on-phone data, app version + reload.
import { h, fill, toast, sheet, header } from "../ui.js";
import { demoOn, setDemo, localItems, tasks } from "../data.js";
import { clearAll } from "../store.js";
import { APP_VERSION } from "../../version.js";

function row(title, sub, control) {
  return h("div", { class: "set-row" }, h("div", {}, h("b", {}, title), h("span", {}, sub)), control);
}

function toggle(on, onchange, label) {
  const b = h("button", { class: "toggle" + (on ? " on" : ""), type: "button", role: "switch", "aria-checked": String(on), "aria-label": label });
  b.addEventListener("click", () => {
    const next = b.getAttribute("aria-checked") !== "true";
    b.classList.toggle("on", next);
    b.setAttribute("aria-checked", String(next));
    onchange(next);
  });
  return b;
}

const soon = (label) => h("span", { class: "soon" }, label);

// In Home Screen mode there is no browser reload button, so the app needs its own.
async function reloadApp() {
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.update();
  } catch { /* offline: reload from cache */ }
  location.reload();
}

export async function render(root) {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const saved = (await localItems()).length;
  const refreshBadge = async () => document.dispatchEvent(new CustomEvent("tasks-count", { detail: (await tasks()).length }));
  const clear = () => sheet({
    title: `Delete ${saved} saved item${saved === 1 ? "" : "s"}?`, text: "Removes every item and photo saved on this phone. This can't be undone.",
    actions: [{ label: "Delete all", cls: "danger", fn: async () => { await clearAll(); toast("Cleared"); render(root); } }],
  });

  fill(root, 
    header("Settings"),
    h("section", { class: "card engine-card" },
      h("div", { class: "row" }, h("span", { class: "dot off" }), h("b", {}, "Mac engine not connected yet")),
      h("p", { class: "muted" }, "Phase 2 links this app to your Mac through Google Drive. Until then, items you submit are saved on this phone.")),
    h("h2", { class: "sec" }, "Connections"),
    h("section", { class: "card" },
      row("Google account", "Sign in to upload to Drive", soon("Phase 2")),
      row("Notifications", "Sale alerts and Depop tasks", soon("Phase 2")),
      row("Home Screen app", standalone ? "Running from your Home Screen" : "Add to Home Screen for push + full screen", h("span", { class: standalone ? "ok-txt" : "muted" }, standalone ? "Installed" : "Not yet"))),
    h("h2", { class: "sec" }, "Data"),
    h("section", { class: "card" },
      row("Show demo data", "Fake store so every screen has something in it", toggle(demoOn(), (on) => { setDemo(on); toast(on ? "Demo data on" : "Demo data off"); refreshBadge(); }, "Show demo data")),
      row("Saved on this phone", saved ? `${saved} item${saved === 1 ? "" : "s"} waiting for Phase 2 upload` : "Nothing saved yet",
        h("button", { class: "btn small danger", type: "button", disabled: !saved, onclick: clear }, "Clear"))),
    h("h2", { class: "sec" }, "App"),
    h("section", { class: "card" },
      row(`ListBot v${APP_VERSION}`, "Reload to pick up the newest version", h("button", { class: "btn small", type: "button", onclick: reloadApp }, "Reload"))));
}
