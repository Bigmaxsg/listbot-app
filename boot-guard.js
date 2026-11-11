// Boot guard (classic script, NOT a module, so it still runs when app.js fails to load).
// After an update the phone can hold a mix of old and new files (GitHub Pages lets browsers cache ~10 min).
// Then a module import fails and the screen stays blank. If the app hasn't started after a few seconds,
// show a "Fix it" card. listbotHardReload() is also used by Settings > Reload.
(function () {
  "use strict";

  // Re-download every app file (list read from sw.js), drop the service worker and its cache, reload.
  window.listbotHardReload = async function () {
    try {
      const sw = await (await fetch("./sw.js", { cache: "reload" })).text();
      const files = (sw.match(/"\.\/[^"]*"/g) || []).map((s) => s.slice(1, -1));
      await Promise.all(files.map((f) => fetch(f, { cache: "reload" }).catch(() => null)));
    } catch (e) { /* offline: still try the reload */ }
    try {
      const regs = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : [];
      await Promise.all(regs.map((r) => r.unregister()));
      if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    location.replace(location.pathname + "?r=" + Date.now() + location.hash);
  };

  function rescue() {
    if (window.__listbotBooted || document.getElementById("boot-rescue")) return;
    const box = document.createElement("div");
    box.id = "boot-rescue";
    // Inline styles on purpose: the stylesheet may be the stale file.
    box.style.cssText = "position:fixed;inset:0;z-index:99;display:grid;place-items:center;padding:24px;background:#07070d;color:#f6f6fb;font:16px/1.45 -apple-system,system-ui,sans-serif;text-align:center";
    box.innerHTML = '<div style="max-width:320px"><div style="font-size:22px;font-weight:800;margin-bottom:8px">ListBot needs a quick refresh</div>' +
      '<p style="color:#a9abbf;margin:0 0 20px">An update only half-downloaded. Tap below to finish it. Your saved items stay on this phone.</p>' +
      '<button type="button" style="border:0;border-radius:16px;padding:16px 28px;font:700 17px -apple-system,system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#7a5cff,#c04dff 52%,#ff4fa3)">Fix it</button></div>';
    box.querySelector("button").addEventListener("click", function () { this.textContent = "Refreshing…"; window.listbotHardReload(); });
    document.body.appendChild(box);
  }

  setTimeout(rescue, 6000);
})();
