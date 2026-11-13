// Nova's replies: a small, safe Markdown subset (no HTML injection).
// Paragraphs, "- " / "1. " lists, **bold**, *italic* / _italic_, `code` and
// [links](url). Links to the site itself stay in the tab; others open a new one.
import React from "react";

const GREEN = "#00CD1F";
const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_|https?:\/\/[^\s)]*[^\s).,;:!?]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

function inline(text, key) {
  const out = [];
  let last = 0, m, i = 0;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0], k = `${key}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k} style={{ color: "#fff", fontWeight: 600 }}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
      out.push(link(href, label, k));
    } else if (t.startsWith("`")) out.push(<code key={k} style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.08)", padding: "0 4px", borderRadius: 4 }}>{t.slice(1, -1)}</code>);
    else if (/^https?:/.test(t)) out.push(link(t, t.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), k));
    else if (t.includes("@")) out.push(link(`mailto:${t}`, t, k));
    else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function link(href, label, key) {
  if (!/^(https?:|mailto:|tel:|\/)/.test(href)) return label;          // nothing else is clickable
  const external = /^https?:/.test(href) && !href.startsWith(window.location.origin);
  // a page of this site: move there without reloading (no intro replay)
  const inSite = href.startsWith("/") ? (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } : undefined;
  return (
    <a key={key} href={href} onClick={inSite} style={{ color: GREEN, textDecoration: "underline", textUnderlineOffset: 2 }}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{label}</a>
  );
}

export default function NovaText({ text }) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  (text || "").replace(/\r/g, "").split("\n").forEach((raw, n) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/), num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (bullet || num) {
      const ordered = !!num;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push(inline(bullet ? bullet[1] : num[2], `l${n}`));
      return;
    }
    flush();
    if (!line.trim()) { blocks.push(null); return; }
    const head = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(head ? { head: inline(head[1], `h${n}`) } : { p: inline(line, `p${n}`) });
  });
  flush();

  // join consecutive text lines into one paragraph, blank lines split them
  const out = [];
  let para = null;
  blocks.forEach((b, i) => {
    if (b && b.p) { para = para ? [...para, <br key={`br${i}`} />, ...b.p] : b.p; return; }
    if (para) { out.push(<p key={`p${i}`} style={{ margin: "0 0 0.6em" }}>{para}</p>); para = null; }
    if (!b) return;
    if (b.head) out.push(<p key={`h${i}`} style={{ margin: "0 0 0.4em", fontWeight: 600, color: "#fff" }}>{b.head}</p>);
    else {
      const Tag = b.ordered ? "ol" : "ul";
      out.push(<Tag key={`l${i}`} style={{ margin: "0 0 0.6em", paddingLeft: "1.25em" }}>
        {b.items.map((it, j) => <li key={j} style={{ margin: "0.2em 0" }}>{it}</li>)}
      </Tag>);
    }
  });
  if (para) out.push(<p key="pend" style={{ margin: 0 }}>{para}</p>);
  return <div style={{ whiteSpace: "normal" }} className="nova-text">{out}</div>;
}
