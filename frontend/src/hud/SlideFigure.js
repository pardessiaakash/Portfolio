// One case-study slide. The slides are images exported from Figma, so this
// adds what an image can't carry on its own:
//  - alt text with the slide's headline, and its full text as a visually
//    hidden description (screen readers, search engines);
//  - on the closing "Let's talk" slide, real links over the two buttons
//    drawn in the image, so they can be clicked, tabbed to and read out.
// The image keeps the Figma aspect ratio (1676 × 961) and is centred in the
// space it's given, so the links stay on top of the drawn buttons.

import React from "react";
import { Box } from "@mui/material";
import { srOnly } from "../a11y";
import { letsTalkHref } from "../siteConfig";
import { useResume } from "../useResume";
import { track } from "../analytics";

const SLIDE_W = 1676, SLIDE_H = 961;
const PRIMARY = "#00CD1F";

// Button positions on the "Let's talk" slide (slide pixels)
const CTA = {
  talk: { x: 96, y: 600, w: 149, h: 66 },
  resume: { x: 261, y: 600, w: 237, h: 66 },
};
const pct = (b) => ({
  left: `${(b.x / SLIDE_W) * 100}%`, top: `${(b.y / SLIDE_H) * 100}%`,
  width: `${(b.w / SLIDE_W) * 100}%`, height: `${(b.h / SLIDE_H) * 100}%`,
});

const hotspotSx = {
  position: "absolute", display: "block", borderRadius: "999px",
  cursor: "pointer", outline: "none",
  transition: "box-shadow 0.25s ease, background 0.25s ease",
  "&:hover": { background: "rgba(255,255,255,0.08)", boxShadow: `0 0 0 2px rgba(0,205,31,0.55), 0 0 18px rgba(0,205,31,0.35)` },
  "&:focus-visible": { boxShadow: `0 0 0 3px ${PRIMARY}` },
};

export const slideAlt = (title, index, count, text) =>
  `${title ?? "Project"}, slide ${index + 1} of ${count}${text?.[0] ? `: ${text[0]}` : ""}`;

export default function SlideFigure({
  src, index, count, title, text, isCta = false, radius = 0, sx, lazy = false,
}) {
  const id = React.useId();
  const resume = useResume();
  return (
    <Box component="figure" sx={{
      m: 0, width: "100%", height: "100%", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      containerType: "size",
      ...sx,
    }}>
      <Box sx={{
        position: "relative",
        width: `min(100cqw, calc(100cqh * ${SLIDE_W / SLIDE_H}))`,
        aspectRatio: `${SLIDE_W} / ${SLIDE_H}`,
        borderRadius: radius, overflow: "hidden",
      }}>
        <Box component="img" src={src} alt={slideAlt(title, index, count, text)}
          loading={lazy ? "lazy" : undefined} decoding="async"
          aria-describedby={text?.[1] ? id : undefined}
          sx={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
        {text?.[1] && <Box component="figcaption" id={id} sx={srOnly}>{text[1]}</Box>}
        {isCta && (
          <>
            <Box component="a" href={letsTalkHref(title)}
              {...(/^https?:/.test(letsTalkHref(title)) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={`Let's talk: contact Akash about ${title ?? "this project"}`}
              onClick={() => track("Let's talk", { project: title })}
              sx={{ ...hotspotSx, ...pct(CTA.talk) }} />
            <Box component="a" href={resume.href}
              {...(resume.available ? { download: resume.fileName } : {})}
              aria-label={resume.available ? "Download resume (PDF)" : "Request resume by email"}
              onClick={() => track(resume.available ? "Resume download" : "Resume request", { from: title })}
              sx={{ ...hotspotSx, ...pct(CTA.resume) }} />
          </>
        )}
      </Box>
    </Box>
  );
}
