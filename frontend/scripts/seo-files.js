// Runs before every build (npm "prebuild"): writes robots.txt, and
// sitemap.xml when the live address is known (REACT_APP_SITE_URL, set on the
// host or in .env.production). Search engines need absolute URLs, so without
// the address there's no sitemap, just a robots.txt that allows everything.
const fs = require("fs");
const path = require("path");

// read .env.production like CRA does (host variables win)
const envFile = path.join(__dirname, "..", ".env.production");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const site = (process.env.REACT_APP_SITE_URL || "").trim().replace(/\/+$/, "");
const pub = path.join(__dirname, "..", "public");

const pages = [
  { loc: "/", priority: "1.0" },
  { loc: "/portfolio/UI%2FUX", priority: "0.9" },
  { loc: "/portfolio/UI%2FUX?project=swiftconnect", priority: "0.9" },
  { loc: "/portfolio/UI%2FUX?project=chicora", priority: "0.9" },
];

let robots = "User-agent: *\nAllow: /\n";
if (/^https?:\/\//.test(site)) {
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((p) => `  <url><loc>${site}${p.loc.replace(/&/g, "&amp;")}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join("\n") +
    "\n</urlset>\n";
  fs.writeFileSync(path.join(pub, "sitemap.xml"), xml);
  robots += `\nSitemap: ${site}/sitemap.xml\n`;
  console.log(`seo-files: sitemap.xml for ${site}`);
} else {
  if (fs.existsSync(path.join(pub, "sitemap.xml"))) fs.unlinkSync(path.join(pub, "sitemap.xml"));
  console.log("seo-files: REACT_APP_SITE_URL not set, so no sitemap.xml");
}
fs.writeFileSync(path.join(pub, "robots.txt"), robots);
