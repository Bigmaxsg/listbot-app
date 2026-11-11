// Capture tab: item number + photos + notes → Submit. Phase 1 saves on the phone; Phase 2 uploads to Drive.
import { h, fill, toast, haptic, sheet as actionSheet, header } from "../ui.js";
import { icon } from "../icons.js";
import { normalizeItemNumber, isValidItemNumber, nextItemNumber, isDuplicate } from "../itemnumber.js";
import { toJpeg } from "../images.js";
import { saveItem } from "../store.js";
import { allItems } from "../data.js";

const SHOTS = ["Front", "Back", "Tag", "Label", "Flaws", "Measurements"];
const MAX_PHOTOS = 24;

// The item being captured lives here, not inside render(), so switching tabs mid-capture
// (to check Items, say) never throws away photos Max already took.
let draft = null;
const untouched = (d) => !d.photos.length && !d.notes && !d.shots.size && d.number === d.suggested;

function lastItem() {
  try { return localStorage.getItem("listbot.lastItem") || ""; } catch { return ""; }
}
function rememberLast(v) {
  try { localStorage.setItem("listbot.lastItem", v); } catch { /* private mode */ }
}

export async function render(root) {
  const used = (await allItems()).map((i) => i.item_number);
  const newest = lastItem() || used.slice().sort().pop() || "A1000";
  if (!draft || untouched(draft)) {
    const suggested = nextItemNumber(newest, used);
    draft = { number: suggested, suggested, photos: [], shots: new Set(), notes: "", busy: false };
  }
  const state = draft;

  const numInput = h("input", {
    id: "item-number", class: "num-input", inputmode: "text", autocapitalize: "characters",
    autocomplete: "off", spellcheck: "false", enterkeyhint: "done", "aria-describedby": "num-help", value: state.number,
  });
  const numHelp = h("p", { id: "num-help", class: "help" });
  const grid = h("div", { class: "photo-grid", "aria-live": "polite" });
  const count = h("span", { class: "count" });
  const shotCount = h("span", { class: "count" });
  const reset = h("button", { class: "link-btn", type: "button", hidden: true }, "Start over");
  const submit = h("button", { class: "btn primary block submit", type: "button" });
  const camInput = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true });
  const libInput = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true });

  function validate() {
    const v = normalizeItemNumber(numInput.value);
    state.number = v;
    reset.hidden = untouched(state) || state.busy;
    let msg = `Next after ${newest}. Tap to change.`;
    let bad = false;
    if (!v) { msg = "Enter the item number from your tag."; bad = true; }
    else if (!isValidItemNumber(v)) { msg = "Letters, numbers and dashes only (max 50)."; bad = true; }
    else if (isDuplicate(v, used)) { msg = `${v} already exists — use a new number so photos never mix.`; bad = true; }
    else if (v !== state.suggested) msg = `Custom number (suggested: ${state.suggested}).`;
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
    const last = state.photos.length - 1;
    actionSheet({
      title: `Photo ${i + 1} of ${state.photos.length}`, preview: state.photos[i].url,
      actions: [
        i > 0 && { label: "Make cover photo", fn: () => move(i, 0) },
        i > 0 && { label: "Move earlier", fn: () => move(i, i - 1) },
        i < last && { label: "Move later", fn: () => move(i, i + 1) },
        { label: "Remove photo", cls: "danger", fn: () => { URL.revokeObjectURL(state.photos[i].url); state.photos.splice(i, 1); drawGrid(); } },
      ],
    });
  }

  // Hold ~250ms, then drag to reorder. iOS starts scrolling the page as soon as a finger moves, which
  // cancels the drag, so while dragging we block scrolling (non-passive touchmove + preventDefault) and
  // lock the body. The other photos slide out of the way live. A quick tap opens the action sheet;
  // a quick swipe (no hold) still scrolls the page normally.
  function attachDrag(tile) {
    let timer = null; let dragging = false; let moved = false;
    let startX = 0; let startY = 0; let grabX = 0; let grabY = 0;
    const idx = () => Number(tile.dataset.idx);
    const photoTiles = () => [...grid.querySelectorAll(".tile:not(.add)")];

    let slots = [];
    function begin() {
      dragging = true;
      // Grid squares are fixed while the page is locked, so record them once. Hit-testing the live tiles
      // instead made neighbours bounce: a tile still sliding away was "under the finger" again.
      slots = photoTiles().map((el) => el.getBoundingClientRect());
      const r = tile.getBoundingClientRect();
      grabX = startX - r.left; grabY = startY - r.top;
      tile.classList.add("dragging");
      document.body.classList.add("drag-lock");
      haptic(15);
    }

    function follow(x, y) {
      const target = slots.findIndex((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
      const tiles = photoTiles();
      const from = tiles.indexOf(tile);
      if (target >= 0 && target !== from) {
        const others = tiles.filter((el) => el !== tile);
        const before = new Map(others.map((el) => [el, el.getBoundingClientRect()]));
        grid.insertBefore(tile, others[target] || grid.querySelector(".tile.add"));
        others.forEach((el) => { // slide the displaced photos into their new squares
          const a = before.get(el); const b = el.getBoundingClientRect();
          if (a.left !== b.left || a.top !== b.top) {
            el.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: "none" }],
              { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" });
          }
        });
        haptic(5);
      }
      tile.style.transform = "none";
      const r = tile.getBoundingClientRect();
      tile.style.transform = `translate(${x - grabX - r.left}px, ${y - grabY - r.top}px) scale(1.06)`;
    }

    function finish() {
      clearTimeout(timer);
      if (!dragging) return false;
      dragging = false;
      tile.classList.remove("dragging");
      document.body.classList.remove("drag-lock");
      const order = photoTiles().map((el) => Number(el.dataset.idx));
      state.photos = order.map((i) => state.photos[i]);
      drawGrid();
      return true;
    }

    // Touch (iPhone)
    tile.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; moved = false;
      timer = setTimeout(begin, 250);
    }, { passive: true });
    tile.addEventListener("touchmove", (e) => {
      const t0 = e.touches[0];
      if (dragging) { e.preventDefault(); follow(t0.clientX, t0.clientY); return; }
      if (Math.hypot(t0.clientX - startX, t0.clientY - startY) > 8) { moved = true; clearTimeout(timer); }
    }, { passive: false });
    tile.addEventListener("touchend", (e) => {
      if (finish()) return;
      clearTimeout(timer);
      if (!moved) { e.preventDefault(); sheet(idx()); }
    });
    tile.addEventListener("touchcancel", finish);
    tile.addEventListener("contextmenu", (e) => e.preventDefault());

    // Mouse (Mac browser): same hold-then-drag.
    tile.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      startX = e.clientX; startY = e.clientY; moved = false;
      tile.setPointerCapture(e.pointerId);
      timer = setTimeout(begin, 250);
    });
    tile.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      if (dragging) { follow(e.clientX, e.clientY); return; }
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) { moved = true; clearTimeout(timer); }
    });
    tile.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "mouse") return;
      if (!finish() && !moved) sheet(idx());
    });

    // Keyboard: Enter/Space on a focused photo opens the action sheet.
    tile.addEventListener("click", (e) => { if (e.detail === 0) sheet(idx()); });
  }

  function drawGrid() {
    fill(grid, 
      ...state.photos.map((p, i) => {
        const tile = h("button", { class: "tile", type: "button", "data-idx": String(i), "aria-label": `Photo ${i + 1}${i === 0 ? ", cover" : ""}. Tap for options, hold to drag.` },
          h("img", { src: p.url, alt: "" }),
          i === 0 ? h("i", { class: "cover" }, "Cover") : h("i", { class: "idx" }, String(i + 1)));
        attachDrag(tile);
        return tile;
      }),
      state.photos.length && state.photos.length < MAX_PHOTOS ? h("button", { class: "tile add", type: "button", onclick: () => libInput.click(), "aria-label": "Add photos" }, "+") : null);
    count.textContent = state.photos.length ? `${state.photos.length} of ${MAX_PHOTOS}` : "";
    dropzone.hidden = state.photos.length > 0;
    submitBar.hidden = !state.photos.length; // nothing to submit yet, so don't cover the screen with a dead button
    hint.hidden = state.photos.length < 2;
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

  const dropzone = h("button", { class: "dropzone", type: "button", onclick: () => camInput.click() },
    h("span", { class: "dz-ico" }, icon("camera")),
    h("b", {}, "Add photos"),
    h("span", {}, "Start with the front — the first photo is the cover"),
    h("span", { class: "steps" }, ...["Snap", "Submit", "ListBot writes it"].map((s, k) => h("i", {}, h("b", {}, String(k + 1)), s))));
  const hint = h("p", { class: "hint" }, "Tap a photo for options · hold and drag to reorder");
  const submitBar = h("div", { class: "submit-bar" }, submit);
  const drawShots = () => { shotCount.textContent = `${state.shots.size} of ${SHOTS.length}`; };

  reset.addEventListener("click", () => actionSheet({
    title: "Start over?", text: "This clears the photos and notes for this item.",
    actions: [{ label: "Clear this item", cls: "danger", fn: () => { state.photos.forEach((p) => URL.revokeObjectURL(p.url)); draft = null; render(root); } }],
  }));

  const shotChips = h("div", { class: "shots", role: "group", "aria-label": "Shot checklist" },
    ...SHOTS.map((s) => h("button", {
      class: "shot", type: "button", "aria-pressed": String(state.shots.has(s)),
      onclick: (e) => {
        const on = !state.shots.has(s);
        on ? state.shots.add(s) : state.shots.delete(s);
        e.currentTarget.setAttribute("aria-pressed", String(on));
        haptic(5);
        drawShots();
        validate();
      },
    }, s)));

  const notes = h("textarea", { id: "notes", class: "notes", rows: "2", placeholder: "Brand, size, flaws… (tap the mic on the keyboard to dictate)" });
  notes.value = state.notes;
  notes.addEventListener("input", () => { state.notes = notes.value; validate(); });

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
      draft = null;
      progress.replaceChildren(h("div", { class: "done-check" }, icon("check")), h("p", {}, `${v} saved`));
      haptic(30);
      setTimeout(() => { progress.remove(); render(root); }, 900);
    } catch (err) {
      progress.remove();
      state.busy = false;
      validate();
      toast(String(err && err.message) === "DUPLICATE" ? `${v} already exists on this phone` : "Couldn't save — try again", "bad");
    }
  });

  fill(root, 
    header("New item", null, reset),
    h("section", { class: "card num-card" },
      h("label", { for: "item-number", class: "lbl" }, "Item number"),
      numInput, numHelp),
    h("section", { class: "card photos-card" },
      h("div", { class: "lbl-row" }, h("span", { class: "lbl" }, "Photos"), count),
      dropzone, grid, hint,
      h("div", { class: "photo-btns" },
        h("button", { class: "btn big tint", type: "button", onclick: () => camInput.click() }, icon("camera"), "Take photo"),
        h("button", { class: "btn big", type: "button", onclick: () => libInput.click() }, icon("image"), "From library"))),
    h("section", { class: "card" }, h("div", { class: "lbl-row" }, h("span", { class: "lbl" }, "Shot checklist"), shotCount), shotChips),
    h("section", { class: "card" }, h("label", { class: "lbl", for: "notes" }, "Notes for the AI (optional)"), notes),
    submitBar,
    camInput, libInput);
  drawShots();
  drawGrid();
}
