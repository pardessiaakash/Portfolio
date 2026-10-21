// Is the resume PDF really there? The host serves index.html for missing
// files (single-page app fallback), so check the content type too. Checked
// once per page load and shared by every resume button.
import { useEffect, useState } from "react";
import { SITE, resumeRequestMailto } from "./siteConfig";

let check = null;
const isPdfAvailable = () => {
  if (!check) {
    const url = SITE.resumeUrl;
    // links to other sites (e.g. Google Drive) can't be checked; trust them
    check = /^https?:\/\//.test(url) && !url.startsWith(window.location.origin)
      ? Promise.resolve(true)
      : fetch(url, { method: "HEAD" })
          .then((r) => r.ok && !/text\/html/i.test(r.headers.get("content-type") || ""))
          .catch(() => false);
  }
  return check;
};

export function useResume() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    isPdfAvailable().then((ok) => alive && setAvailable(ok));
    return () => { alive = false; };
  }, []);
  return available
    ? { available, href: SITE.resumeUrl, fileName: SITE.resumeFileName }
    : { available, href: resumeRequestMailto(), fileName: null };
}
