// Shown for a category that has no projects yet: says so honestly and
// offers somewhere useful to go next.
import React from "react";
import { Box } from "@mui/material";
import { SITE, externalLinkProps } from "../siteConfig";

const PRIMARY = "#00CD1F";

/** A category with no projects yet: say so, and offer somewhere to go. */
export default function EmptyCategory({ category, onSeeUiux, compact = false, fontFamily }) {
  const btn = {
    height: 44, px: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: "10px", border: "1px solid #8F8F8F", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontFamily, fontSize: 14, textDecoration: "none", cursor: "pointer",
    transition: "border-color 0.25s ease, background 0.25s ease",
    "&:hover, &:focus-visible": { borderColor: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.08)" },
  };
  return (
    <Box sx={{
      height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: compact ? "10px" : "14px", textAlign: "center", px: 3, fontFamily,
    }}>
      <Box component="h2" sx={{ m: 0, fontSize: compact ? 18 : 24, fontWeight: 500, color: "#fff" }}>
        {category} work is on its way
      </Box>
      <Box component="p" sx={{ m: 0, maxWidth: 440, fontSize: compact ? 14 : 16, lineHeight: 1.5, color: "rgba(255,255,255,0.7)" }}>
        Case studies for this category are being prepared. Meanwhile, the UI/UX case studies are ready to explore.
      </Box>
      <Box sx={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", mt: "6px" }}>
        <Box component="button" type="button" onClick={onSeeUiux}
          sx={{ ...btn, background: PRIMARY, borderColor: PRIMARY, color: "#080808", fontWeight: 600,
            "&:hover, &:focus-visible": { background: "#14e033", borderColor: "#14e033" } }}>
          See UI/UX case studies
        </Box>
        <Box component="a" href={SITE.behance} {...externalLinkProps(SITE.behance, "More work on Behance")} sx={btn}>
          More on Behance
        </Box>
      </Box>
    </Box>
  );
}

