// Screens reachable by URL. The rest need in-memory payloads (a loaded resume)
// that cannot survive a reload, so they fall back to the dashboard.
const DEEP_LINKABLE = new Set(["dashboard", "tracker", "import-resume"]);

export function readRoute(): string | null {
  const name = window.location.hash.replace(/^#\/?/, "").split("?")[0].trim();
  return DEEP_LINKABLE.has(name) ? name : null;
}

export function writeRoute(name: string): void {
  const next = `#/${name}`;
  if (window.location.hash === next) return;
  window.history.pushState(null, "", next);
}

export function subscribeToRoute(onRoute: (name: string | null) => void): () => void {
  const handler = () => onRoute(readRoute());
  window.addEventListener("popstate", handler);
  window.addEventListener("hashchange", handler);
  return () => {
    window.removeEventListener("popstate", handler);
    window.removeEventListener("hashchange", handler);
  };
}
