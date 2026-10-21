// Optional, privacy-friendly analytics (Plausible: no cookies, no banner).
// Off unless REACT_APP_PLAUSIBLE_DOMAIN is set on the host.
const domain = (process.env.REACT_APP_PLAUSIBLE_DOMAIN || "").trim();

if (domain && typeof document !== "undefined") {
  const s = document.createElement("script");
  s.defer = true;
  s.dataset.domain = domain;
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
}

/** Record a goal, e.g. track("Resume download"). Does nothing when off. */
export function track(event, props) {
  if (!domain || typeof window.plausible !== "function") return;
  window.plausible(event, props ? { props } : undefined);
}
