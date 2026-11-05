// Settings tab: version, engine status, demo toggle, local data.
import { h, toast } from "../ui.js";
import { demoOn, setDemo } from "../data.js";
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

export async function render(root) {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  root.replaceChildren(
    h("header", { class: "top" }, h("h1", {}, "Settings")),
    h("section", { class: "card engine-card" },
      h("div", { class: "row" }, h("span", { class: "dot off" }), h("b", {}, "Mac engine not connected yet")),
      h("p", { class: "muted" }, "Phase 2 links this app to your Mac through Google Drive. Until then, items you submit are saved on this phone.")),
    h("section", { class: "card" },
      row("Google account", "Sign in to upload to Drive", h("span", { class: "muted" }, "Phase 2")),
      row("Notifications", "Sale alerts and Depop tasks", h("span", { class: "muted" }, "Phase 2")),
      row("Installed", standalone ? "Running from your Home Screen" : "Add to Home Screen for push + full screen", h("span", { class: standalone ? "ok-txt" : "muted" }, standalone ? "Yes" : "No"))),
    h("section", { class: "card" },
      row("Show demo data", "Fake store so every screen has something in it", toggle(demoOn(), (on) => { setDemo(on); toast(on ? "Demo data on" : "Demo data off"); }, "Show demo data")),
      row("Saved on this phone", "Items waiting for Phase 2 upload", h("button", {
        class: "btn small danger", type: "button",
        onclick: async () => { if (confirm("Delete all items saved on this phone?")) { await clearAll(); toast("Cleared"); } },
      }, "Clear"))),
    h("p", { class: "about" }, `ListBot v${APP_VERSION}`));
}
