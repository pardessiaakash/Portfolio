// Category tabs on the category page, from the Figma component "Tab_For Claude".
//
// Four overlapping trapezoid tabs across a 714×49 strip (Figma units). The
// selected tab is solid green with black SemiBold text and sits on top; the
// others are dark glass with a thin grey→green edge and Light white text,
// stacked so each one tucks under its neighbour nearer the selected tab.
// Drawn as one SVG with a viewBox, so it scales as a unit with the page.

import React from "react";
import { Box, GlobalStyles } from "@mui/material";
import light from "@fontsource/montserrat/files/montserrat-latin-300-normal.woff2";
import semibold from "@fontsource/montserrat/files/montserrat-latin-600-normal.woff2";
import { buildPath } from "./hudShapes";

const PRIMARY = "#00CD1F";

// Figma geometry (Tab_For Claude, 714 × 49)
const STRIP_W = 714;
const TAB_H = 49;
const TAB_W = 228.8;                    // 32.07% of the strip
const TAB_X = [0, 165, 320, 485];       // left edges (0%, 23.11%, 44.82%, 67.93%)
const SLANT = 38;                       // how far the sides lean in at the top
const R_TOP = 12;                       // top corner radius

// Room above the tabs for the active tab's glow, below for the shadow.
const PAD_T = 10, PAD_B = 14, PAD_X = 16;
const VB_W = STRIP_W + PAD_X * 2;
const VB_H = TAB_H + PAD_T + PAD_B;

const tabPath = buildPath([
  { x: 0, y: TAB_H, r: 0 },
  { x: SLANT, y: 0, r: R_TOP },
  { x: TAB_W - SLANT, y: 0, r: R_TOP },
  { x: TAB_W, y: TAB_H, r: 0 },
]);

// Private family name so these weights never change text elsewhere on the site.
const FONT = "MontserratTab";
const fontFaces = (
  <GlobalStyles styles={`
    @font-face { font-family: ${FONT}; font-weight: 300; font-display: swap; src: url(${light}) format("woff2"); }
    @font-face { font-family: ${FONT}; font-weight: 600; font-display: swap; src: url(${semibold}) format("woff2"); }
  `} />
);

export default function CategoryTabs({ tabs, active, onSelect, width = "clamp(600px, 44vw, 780px)" }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  // Paint order: furthest from the active tab first, active tab last (on top).
  const order = tabs.map((_, i) => i).sort((a, b) => Math.abs(b - active) - Math.abs(a - active));

  const onKey = (e, i) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); }
    if (e.key === "ArrowRight") onSelect(Math.min(tabs.length - 1, active + 1));
    if (e.key === "ArrowLeft") onSelect(Math.max(0, active - 1));
  };

  return (
    // The box covers glow + tabs only; the shadow below hangs over the panel.
    <Box sx={{ width, flexShrink: 0, lineHeight: 0, position: "relative", aspectRatio: `${VB_W} / ${PAD_T + TAB_H}` }}>
      {fontFaces}
      <Box
        component="svg"
        role="tablist"
        aria-label="Categories"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        sx={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "auto", overflow: "visible", display: "block",
          "& .cat-tab": { cursor: "pointer", outline: "none" },
          "& .cat-tab .cat-body": { transition: "filter 0.25s ease" },
          "& .cat-tab:not(.is-active):hover .cat-body, & .cat-tab:not(.is-active):focus-visible .cat-body": {
            filter: "brightness(1.45)",
          },
          "& .cat-tab:not(.is-active):hover .cat-label, & .cat-tab:not(.is-active):focus-visible .cat-label": {
            fill: "#fff",
          },
          "& .cat-label": { transition: "fill 0.25s ease" },
        }}
      >
        <defs>
          {/* inactive body: dark glass, slightly lighter at the top */}
          <linearGradient id={`ct-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2A2C2B" stopOpacity="0.96" />
            <stop offset="1" stopColor="#151716" stopOpacity="0.96" />
          </linearGradient>
          {/* inactive edge: grey on the left, green toward the top-right */}
          <linearGradient id={`ct-edge-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1={TAB_H} x2={TAB_W} y2="0">
            <stop offset="0" stopColor="#8F8F8F" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#636363" stopOpacity="0.6" />
            <stop offset="1" stopColor={PRIMARY} stopOpacity="0.9" />
          </linearGradient>
          {/* active body: Figma green with a faint highlight along the top */}
          <linearGradient id={`ct-active-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22E241" />
            <stop offset="0.35" stopColor={PRIMARY} />
            <stop offset="1" stopColor={PRIMARY} />
          </linearGradient>
          <filter id={`ct-shadow-${uid}`} x="-20%" y="-40%" width="140%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <filter id={`ct-glow-${uid}`} x="-20%" y="-60%" width="140%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor={PRIMARY} floodOpacity="0.35" />
          </filter>
        </defs>

        <g transform={`translate(${PAD_X} ${PAD_T})`}>
          {order.map((i) => {
            const isActive = i === active;
            return (
              <g
                key={tabs[i]}
                className={`cat-tab${isActive ? " is-active" : ""}`}
                transform={`translate(${TAB_X[i] ?? i * 165} 0)`}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <title>{tabs[i]}</title>
                <path
                  className="cat-body"
                  d={tabPath}
                  fill={isActive ? `url(#ct-active-${uid})` : `url(#ct-fill-${uid})`}
                  stroke={isActive ? "none" : `url(#ct-edge-${uid})`}
                  strokeWidth="1"
                  filter={isActive ? `url(#ct-glow-${uid})` : `url(#ct-shadow-${uid})`}
                />
                <text
                  className="cat-label"
                  x={TAB_W / 2}
                  y={TAB_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={`${FONT}, Montserrat, sans-serif`}
                  fontSize="16"
                  fontWeight={isActive ? 600 : 300}
                  fill={isActive ? "#000" : "rgba(255,255,255,0.92)"}
                  style={{ userSelect: "none" }}
                >
                  {tabs[i]}
                </text>
              </g>
            );
          })}
        </g>
      </Box>
    </Box>
  );
}
