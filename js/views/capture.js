// Capture tab: item number + photos + notes → Submit. Phase 1 saves on the phone; Phase 2 uploads to Drive.
import { h, toast, haptic } from "../ui.js";
import { normalizeItemNumber, isValidItemNumber, nextItemNumber, isDuplicate } from "../itemnumber.js";
import { toJpeg } from "../images.js";
import { saveItem } from "../store.js";
import { allItems } from "../data.js";

const SHOTS = ["Front", "Back", "Tag", "Label", "Flaws", "Measurements"];
const MAX_PHOTOS = 24;
const ICON_CAMERA = "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";
const ICON_LIBRARY = "M3 3h18v18H3z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21";

function svgIcon(d) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  svg.append(path);
  return svg;
}

function lastItem() {
  try { return localStorage.getItem("listbot.lastItem") || ""; } catch { return ""; }
}
function rememberLast(v) {
  try { localStorage.setItem("listbot.lastItem", v); } catch { /* private mode */ }
}

export async function render(root) {
  const used = (await allItems()).map((i) => i.item_number);
  const newest = lastItem() || used.slice().sort().pop() || "A1000";
  const state = { number: nextItemNumber(newest, used), photos: [], shots: new Set(), notes: "", busy: false };

  const numInput = h("input", {
    id: "item-number", class: "num-input", inputmode: "text", autocapitalize: "characters",
    autocomplete: "off", spellcheck: "false", enterkeyhint: "done", "aria-describedby": "num-help", value: state.number,
  });
  const numHelp = h("p", { id: "num-help", class: "help" });
  const grid = h("div", { class: "photo-grid", "aria-live": "polite" });
  const count = h("span", { class: "count" });
  const submit = h("button", { class: "btn primary block submit", type: "button" });
  const camInput = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true });
  const libInput = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true });

  function validate() {
    const v = normalizeItemNumber(numInput.value);
    let msg = `Suggested next after ${newest}. Tap to change.`;
    let bad = false;
    if (!v) { msg = "Enter the item number from your tag."; bad = true; }
    else if (!isValidItemNumber(v)) { msg = "Letters, numbers and dashes only (max 50)."; bad = true; }
    else if (isDuplicate(v, used)) { msg = `${v} already exists — use a new number so photos never mix.`; bad = true; }
    else if (v !== state.number) msg = "Custom number.";
    numHelp.textContent = msg;
    numHelp.classList.toggle("bad", bad);
    numInput.classList.toggle("bad", bad);
    const ready = !bad && state.photos.length > 0 && !state.busy;
    submit.disabled = !ready;
    submit.textContent = state.busy ? "Saving…" : state.photos.length ? `Submit ${v || "item"} · ${state.photos.length} photo${state.photos.length === 1 ? "" : "s"}` : "Add photos to submit";
    return ready ? v : null;
  }

  function move(from, to) {
    if (to < 0 || to >= state.photos.length || from === to) return;
    const [p] = state.photos.splice(from, 1);
    state.photos.splice(to, 0, p);
    haptic();
    drawGrid();
  }

  function sheet(i) {
    const close = () => overlay.remove();
    const act = (label, fn, cls = "") => h("button", { class: "sheet-btn " + cls, type: "button", onclick: () => { close(); fn(); } }, label);
    const overlay = h("div", { class: "sheet-wrap", onclick: (e) => { if (e.target === overlay) close(); } },
      h("div", { class: "sheet", role: "dialog", "aria-label": `Photo ${i + 1}` },
        h("div", { class: "sheet-title" }, `Photo ${i + 1} of ${state.photos.length}`),
        i > 0 ? act("Make cover photo", () => move(i, 0)) : null,
        i > 0 ? act("Move earlier", () => move(i, i - 1)) : null,
        i < state.photos.length - 1 ? act("Move later", () => move(i, i + 1)) : null,
        act("Remove photo", () => { URL.revokeObjectURL(state.photos[i].url); state.photos.splice(i, 1); drawGrid(); }, "danger"),
        act("Cancel", () => {}, "cancel")));
    document.body.append(overlay);
  }

  // Long-press (300ms) then drag to reorder; a plain tap opens the action sheet.
  function attachDrag(tile, index) {
    let timer = null; let dragging = false; let startX = 0; let startY = 0; let cur = index;
    tile.addEventListener("pointerdown", (e) => {
      startX = e.clientX; startY = e.clientY; cur = index;
      timer = setTimeout(() => { dragging = true; tile.classList.add("dragging"); haptic(15); tile.setPointerCapture(e.pointerId); }, 300);
    });
    tile.addEventListener("pointermove", (e) => {
      if (!dragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) clearTimeout(timer);
        return;
      }
      e.preventDefault();
      tile.style.transform = `translate(${e.clientX - startX}px, ${e.clientY - startY}px) scale(1.06)`;
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.dataset && el.dataset.idx && el !== tile);
      if (under) grid.querySelectorAll(".tile").forEach((t) => t.classList.toggle("drop", t === under));
      cur = under ? Number(under.dataset.idx) : cur;
    });
    const end = () => {
      clearTimeout(timer);
      if (dragging) { dragging = false; move(index, cur); }
    };
    tile.addEventListener("pointerup", (e) => {
      const wasDrag = dragging;
      end();
      if (!wasDrag && Math.hypot(e.clientX - startX, e.clientY - startY) < 8) sheet(index);
    });
    tile.addEventListener("pointercancel", end);
  }

  function drawGrid() {
    grid.replaceChildren(
      ...state.photos.map((p, i) => {
        const tile = h("button", { class: "tile", type: "button", "data-idx": String(i), "aria-label": `Photo ${i + 1}${i === 0 ? ", cover" : ""}. Tap for options, hold to drag.` },
          h("img", { src: p.url, alt: "" }),
          i === 0 ? h("i", { class: "cover" }, "Cover") : h("i", { class: "idx" }, String(i + 1)));
        attachDrag(tile, i);
        return tile;
      }),
      state.photos.length < MAX_PHOTOS ? h("button", { class: "tile add", type: "button", onclick: () => libInput.click(), "aria-label": "Add photos" }, "+") : null);
    count.textContent = state.photos.length ? `${state.photos.length}/${MAX_PHOTOS}` : "";
    validate();
  }

  function addFiles(files) {
    const room = MAX_PHOTOS - state.photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast(`Max ${MAX_PHOTOS} photos per item`);
    list.forEach((f) => state.photos.push({ file: f, url: URL.createObjectURL(f) }));
    haptic();
    drawGrid();
  }

  camInput.addEventListener("change", () => { addFiles(camInput.files); camInput.value = ""; });
  libInput.addEventListener("change", () => { addFiles(libInput.files); libInput.value = ""; });
  numInput.addEventListener("input", validate);
  numInput.addEventListener("focus", () => numInput.select());

  const shotChips = h("div", { class: "shots", role: "group", "aria-label": "Shot checklist" },
    ...SHOTS.map((s) => h("button", {
      class: "shot", type: "button", "aria-pressed": "false",
      onclick: (e) => {
        const on = !state.shots.has(s);
        on ? state.shots.add(s) : state.shots.delete(s);
        e.currentTarget.setAttribute("aria-pressed", String(on));
        haptic(5);
      },
    }, s)));

  const notes = h("textarea", { class: "notes", rows: "2", placeholder: "Brand, size, flaws… (tap 🎤 to dictate)" });
  notes.addEventListener("input", () => { state.notes = notes.value; });

  submit.addEventListener("click", async () => {
    const v = validate();
    if (!v) return;
    state.busy = true;
    validate();
    const progress = h("div", { class: "progress" }, h("div", { class: "ring" }), h("p", {}, "Preparing photos…"));
    root.append(progress);
    try {
      const blobs = [];
      for (let i = 0; i < state.photos.length; i += 1) {
        progress.querySelector("p").textContent = `Preparing photo ${i + 1} of ${state.photos.length}…`;
        blobs.push(await toJpeg(state.photos[i].file));
      }
      const now = new Date().toISOString();
      await saveItem({
        item_number: v, state: "captured", notes: state.notes.trim(), shots: [...state.shots],
        title: state.notes.trim() || "New item", created: now, updated: now,
        timeline: [[now, "captured", `Saved on this phone (${blobs.length} photos) — uploads to Drive in Phase 2`]],
      }, blobs);
      rememberLast(v);
      state.photos.forEach((p) => URL.revokeObjectURL(p.url));
      progress.replaceChildren(h("div", { class: "done-check" }, "✓"), h("p", {}, `${v} saved`));
      haptic(30);
      setTimeout(() => { progress.remove(); render(root); }, 900);
    } catch (err) {
      progress.remove();
      state.busy = false;
      validate();
      toast(String(err && err.message) === "DUPLICATE" ? `${v} already exists on this phone` : "Couldn't save — try again", "bad");
    }
  });

  root.replaceChildren(
    h("header", { class: "top" }, h("h1", {}, "New item"), count),
    h("section", { class: "card num-card" },
      h("label", { for: "item-number", class: "lbl" }, "Item number"),
      numInput, numHelp),
    h("div", { class: "photo-btns" },
      h("button", { class: "btn big", type: "button", onclick: () => camInput.click() }, svgIcon(ICON_CAMERA), "Take photo"),
      h("button", { class: "btn big", type: "button", onclick: () => libInput.click() }, svgIcon(ICON_LIBRARY), "From library")),
    grid,
    h("p", { class: "hint" }, "Tap a photo for options · hold and drag to reorder"),
    h("section", { class: "card" }, h("span", { class: "lbl" }, "Shot checklist"), shotChips),
    h("section", { class: "card" }, h("label", { class: "lbl" }, "Notes for the AI (optional)"), notes),
    h("div", { class: "submit-bar" }, submit),
    camInput, libInput);
  drawGrid();
}
