// Browser-tab title and description for the current page (single-page app,
// so they're updated as you move around).
export function setPageMeta(title, description) {
  if (title) document.title = title;
  if (description) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = description;
  }
}
