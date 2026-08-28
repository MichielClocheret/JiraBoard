// Ported from legacy/features/finder/finder.js — detects the VeauFinder
// macOS companion app (the native helper behind the File Bridge feature)
// via a `veaufinder://` deep-link + visibilitychange heuristic, and caches
// the result for the lifetime of the page. The app is still called
// VeauFinder and still speaks the `veaufinder://` scheme — it's a separate,
// already-installed compiled binary that isn't renamed by this pass.
let finderAppAvailable = null;

export function checkFinderApp() {
  return new Promise((resolve) => {
    if (finderAppAvailable !== null) {
      resolve(finderAppAvailable);
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    let resolved = false;

    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      finderAppAvailable = value;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      resolve(value);
    };

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") finish(true);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    try {
      iframe.src = "veaufinder://ping";
    } catch {
      /* ignore */
    }
    setTimeout(() => finish(false), 600);
  });
}

export function openViaFinderApp(filePath) {
  if (!filePath) return;
  window.location.href = "veaufinder://open?path=" + encodeURIComponent(filePath);
}

export const FILE_BRIDGE_DMG_URL = "../inc/VeauFinder.dmg";
