// "Chapters" for a case study: shows where you are (05 / 27 · Gap Analysis)
// and opens a list of every slide's topic to jump straight to one. Same
// dark glass as the other HUD buttons.

import React, { useState } from "react";
import { Box, Menu, MenuItem } from "@mui/material";

const PRIMARY = "#00CD1F";
const pad = (n) => String(n).padStart(2, "0");

export default function ChapterMenu({ topics, current, onSelect, fontFamily, sx, buttonSx }) {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);
  const n = topics.length;
  if (!n) return null;
  return (
    <>
      <Box component="button" type="button"
        aria-haspopup="menu" aria-expanded={open}
        aria-label={`Chapter ${current + 1} of ${n}: ${topics[current]}. Open chapter list`}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          height: 42, px: "16px", gap: "10px", boxSizing: "border-box",
          display: "flex", alignItems: "center",
          borderRadius: "10px", border: "1px solid #8F8F8F",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20.95px)", WebkitBackdropFilter: "blur(20.95px)",
          boxShadow: "4px 13px 19px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
          color: "#fff", fontFamily, fontSize: 13, fontWeight: 300, whiteSpace: "nowrap",
          cursor: "pointer", transition: "border-color 0.25s ease",
          "&:hover, &[aria-expanded='true']": { borderColor: "rgba(255,255,255,0.85)" },
          ...buttonSx,
          ...sx,
        }}>
        <Box component="span" sx={{ color: PRIMARY, fontWeight: 600 }}>{pad(current + 1)}</Box>
        <Box component="span" sx={{ opacity: 0.55 }}>/ {pad(n)}</Box>
        <Box component="span" sx={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{topics[current]}</Box>
        <svg width="11" height="7" viewBox="0 0 11 7" aria-hidden style={{ flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M1 1l4.5 4.5L10 1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </Box>
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: {
            mt: "8px", maxHeight: "min(60vh, 520px)", minWidth: 280,
            background: "rgba(12,14,13,0.9)", color: "#fff",
            backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(143,143,143,0.6)", borderRadius: "12px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-thumb": { background: "rgba(0,205,31,0.4)", borderRadius: "2px" },
          } },
          list: { "aria-label": "Chapters", dense: true },
        }}
        sx={{ zIndex: 1000 }}>
        {topics.map((t, i) => (
          <MenuItem key={i} selected={i === current}
            onClick={() => { onSelect(i); setAnchor(null); }}
            sx={{
              fontFamily, fontSize: 14, gap: "12px", py: "8px",
              color: i === current ? PRIMARY : "rgba(255,255,255,0.86)",
              "&.Mui-selected, &.Mui-selected:hover": { background: "rgba(0,205,31,0.12)" },
              "&:hover, &.Mui-focusVisible": { background: "rgba(255,255,255,0.07)" },
            }}>
            <Box component="span" sx={{ width: 22, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{pad(i + 1)}</Box>
            {t}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
