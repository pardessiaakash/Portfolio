// Desktop category page, laid out from the Figma frame "Inner_Page_For Claude".
//
// Everything sits on a 1920 × 1087 stage (the Figma frame) that is scaled to
// fit the window, so positions below are Figma pixels. The main HUD's outline
// includes the selected category tab, so that tab reads as part of the panel;
// the other tabs sit behind it. The chat HUD is the shared ChatbotPanel cut to
// this page's geometry (orb cut-out and a ~25px channel to the main HUD).

import React, { useEffect, useState } from "react";
import { Box, GlobalStyles } from "@mui/material";
import light from "@fontsource/montserrat/files/montserrat-latin-300-normal.woff2";
import medium from "@fontsource/montserrat/files/montserrat-latin-500-normal.woff2";
import semibold from "@fontsource/montserrat/files/montserrat-latin-600-normal.woff2";
import { buildPath, HudOutline } from "./hudShapes";
import { glassPanelSx } from "./glass";
import ChatbotPanel from "../ChatbotPanel";
import CustomTooltip from "../CustomTooltip";

const PRIMARY = "#00CD1F";
const STAGE_W = 1920, STAGE_H = 1087;

/* ── Figma geometry (stage pixels) ─────────────────────────────────────── */

// Main HUD outline box: x 126–1355, tab tops at y 128, panel top at y 177.
const MAIN = { x: 126, y: 128, w: 1229 };
const TAB = { h: 49, w: 229, slant: 38, r: 16, x0: 158.9, offsets: [0, 165, 320, 485] };
const BODY_H = 803;                 // panel height below the tab row
const STEP = { y: 185, d: 28 };     // right edge steps in 28px, 185px below the top
const LOWER = { l: 86, r: 676, drop: 35 }; // bottom section (holds the dots)
const MAIN_H = TAB.h + BODY_H;

// Chat HUD: x 1354–1724, y 177–981, orb centred on its top-right corner.
const CHAT = { x: 1354, y: 177, w: 370, h: 804 };
const ORB = 158;
const CHAT_CHANNEL = { inset: 25, stepY: 198, step: 25, rUpper: 45, rLower: 4 };

const mainPath = (active) => {
  const T = TAB.h, W = MAIN.w, x0 = TAB.x0 + TAB.offsets[active];
  const bottom = T + BODY_H, mid = bottom - LOWER.drop;
  return buildPath([
    { x: 0, y: T, r: 20 },
    { x: x0, y: T, r: 16 },
    { x: x0 + TAB.slant, y: 0, r: TAB.r },
    { x: x0 + TAB.w - TAB.slant, y: 0, r: TAB.r },
    { x: x0 + TAB.w, y: T, r: 16 },
    { x: W, y: T, r: 20 },
    { x: W, y: T + STEP.y, r: 12 },
    { x: W - STEP.d, y: T + STEP.y + STEP.d, r: 12 },
    { x: W - STEP.d, y: mid, r: 20 },
    { x: LOWER.r, y: mid, r: 12 },
    { x: LOWER.r - LOWER.drop, y: bottom, r: 12 },
    { x: LOWER.l + LOWER.drop, y: bottom, r: 12 },
    { x: LOWER.l, y: mid, r: 12 },
    { x: 0, y: mid, r: 20 },
  ]);
};

const tabShape = buildPath([
  { x: 0, y: TAB.h, r: 0 },
  { x: TAB.slant, y: 0, r: TAB.r },
  { x: TAB.w - TAB.slant, y: 0, r: TAB.r },
  { x: TAB.w, y: TAB.h, r: 0 },
]);

/* ── shared bits ───────────────────────────────────────────────────────── */

// Figma's Light / Medium / SemiBold weights under a private family name, so
// text elsewhere on the site keeps rendering exactly as before.
const FONT = "MontserratInner";
const FONT_STACK = `${FONT}, Montserrat, sans-serif`;
const fontFaces = (
  <GlobalStyles styles={`
    @font-face { font-family: ${FONT}; font-weight: 300; font-display: swap; src: url(${light}) format("woff2"); }
    @font-face { font-family: ${FONT}; font-weight: 500; font-display: swap; src: url(${medium}) format("woff2"); }
    @font-face { font-family: ${FONT}; font-weight: 600; font-display: swap; src: url(${semibold}) format("woff2"); }
  `} />
);

// Small glass square used for back / prev / next / AI / expand.
const glassBtn = (size, border = "1px solid #8F8F8F") => ({
  position: "absolute",
  width: size, height: size,
  boxSizing: "border-box",
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: "10px",
  border,
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(13.55px)",
  WebkitBackdropFilter: "blur(13.55px)",
  boxShadow: "-1px 3px 13px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
  cursor: "pointer",
  color: "#fff",
  transition: "border-color 0.25s ease, background 0.25s ease",
  "&:hover": { borderColor: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.07)" },
});

const Chevron = ({ dir }) => (
  <svg width="9" height="16" viewBox="0 0 9 16" aria-hidden>
    <path d={dir === "left" ? "M8 1 1 8l7 7" : "M1 1l7 7-7 7"} fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Scale that fits the Figma frame's content into the window (like the home stage). */
function useStageScale() {
  const calc = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    // cover like the home screen, but never so large that the HUDs leave the
    // window (content spans roughly x 116–1810, y 97–1000)
    return Math.min(Math.max(vw / STAGE_W, vh / STAGE_H), vw / 1760, vh / 1000);
  };
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}

/* ── component ─────────────────────────────────────────────────────────── */

export default function InnerStage({
  tabs, activeTab, onSelectTab,
  projects, activeProject, subTab, onSelectProject, loading,
  slides, slideIndex, onSlide, onPrev, onNext,
  onAskAI, onExpand, onBack,
  orb, requestedInput,
}) {
  const s = useStageScale();
  const d = mainPath(activeTab);
  const hasSlides = slides.length > 0;
  // paint inactive tabs furthest-from-active first
  const order = tabs.map((_, i) => i).filter((i) => i !== activeTab)
    .sort((a, b) => Math.abs(b - activeTab) - Math.abs(a - activeTab));
  const tabX = (i) => MAIN.x + TAB.x0 + TAB.offsets[i];

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {fontFaces}
      <Box sx={{
        position: "absolute",
        left: "50%", top: "50%",
        width: STAGE_W, height: STAGE_H,
        transform: `translate(-50%, -50%) scale(${s})`,
        transformOrigin: "50% 50%",
        fontFamily: FONT_STACK,
      }}>
        {/* inactive category tabs, behind the panel */}
        <Box component="svg" role="tablist" aria-label="Categories"
          width={STAGE_W} height={MAIN.y + TAB.h + 2}
          sx={{
            position: "absolute", left: 0, top: 0, overflow: "visible",
            "& .tab": { cursor: "pointer", outline: "none" },
            "& .tab path": { transition: "fill 0.25s ease, stroke 0.25s ease" },
            "& .tab:hover path, & .tab:focus-visible path": { fill: "rgba(255,255,255,0.08)", stroke: "#9E9E9E" },
          }}>
          <defs>
            <filter id="inner-tab-sh" x="-20%" y="-40%" width="140%" height="200%">
              <feDropShadow dx="4" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.35" />
            </filter>
          </defs>
          {order.map((i) => (
            <g key={tabs[i]} className="tab" role="tab" aria-selected="false" tabIndex={0}
              transform={`translate(${tabX(i)} ${MAIN.y})`}
              onClick={() => onSelectTab(i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTab(i); } }}>
              <title>{tabs[i]}</title>
              <path d={tabShape} fill="rgba(22,24,23,0.86)" stroke="#5E5E5E" strokeWidth="1"
                filter="url(#inner-tab-sh)" />
              <text x={TAB.w / 2} y={TAB.h / 2 + 1} textAnchor="middle" dominantBaseline="central"
                fontFamily={FONT_STACK} fontSize="16" fontWeight="300" fill="#fff"
                style={{ userSelect: "none" }}>{tabs[i]}</text>
            </g>
          ))}
        </Box>

        {/* main HUD: glass panel whose outline includes the selected tab */}
        <Box sx={{
          position: "absolute",
          left: MAIN.x, top: MAIN.y, width: MAIN.w, height: MAIN_H,
          ...glassPanelSx,
          clipPath: `path("${d}")`,
        }}>
          <HudOutline d={d} w={MAIN.w} h={MAIN_H} />

          {/* selected tab label */}
          <Box role="tab" aria-selected="true" sx={{
            position: "absolute",
            left: TAB.x0 + TAB.offsets[activeTab], top: 0, width: TAB.w, height: TAB.h,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: PRIMARY, fontSize: 16, fontWeight: 600, userSelect: "none",
          }}>{tabs[activeTab]}</Box>

          {/* back + project pills (Figma: 27px in, 72px below the tab tops) */}
          <Box sx={{
            position: "absolute", left: 26.9, top: 72,
            display: "flex", alignItems: "center", gap: "21px",
          }}>
            <CustomTooltip title="Back to Home" placement="top">
              <Box component="button" aria-label="Back to home" onClick={onBack}
                sx={{ ...glassBtn(42), position: "relative", p: 0 }}>
                <svg width="16" height="13" viewBox="0 0 16 13" aria-hidden>
                  <path d="M15 6.5H1.5M6.5 1 1 6.5 6.5 12" fill="none" stroke="#fff" strokeWidth="1.3"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Box>
            </CustomTooltip>
            <Box role="tablist" aria-label="Projects" sx={{ display: "flex", gap: "10px" }}>
              {projects.map((p, i) => {
                const on = i === subTab;
                return (
                  <Box key={p.id ?? p.title} component="button" role="tab" aria-selected={on}
                    onClick={() => onSelectProject(i)}
                    sx={{
                      height: 42, px: "32px", boxSizing: "border-box",
                      display: "flex", alignItems: "center",
                      borderRadius: "10px",
                      border: `1px solid ${on ? "#8F8F8F" : "#9E9E9E"}`,
                      background: "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(20.95px)", WebkitBackdropFilter: "blur(20.95px)",
                      boxShadow: "4px 13px 19px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
                      fontFamily: FONT_STACK, fontSize: 12, whiteSpace: "nowrap",
                      fontWeight: on ? 600 : 300,
                      color: on ? PRIMARY : "#fff",
                      opacity: on ? 1 : 0.2,
                      cursor: "pointer",
                      transition: "opacity 0.25s ease",
                      "&:hover": { opacity: on ? 1 : 0.55 },
                    }}>{p.title}</Box>
                );
              })}
            </Box>
          </Box>

          {/* viewer: 1148 × 659, 27px in, 132px below the tab tops */}
          <Box sx={{
            position: "absolute", left: 26.9, top: 131.8, width: 1148, height: 659,
            borderRadius: "16px", overflow: "hidden",
            background: "#0B141C",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
          }}>
            {hasSlides ? (
              <Box component="img" src={slides[slideIndex]} alt={`${activeProject?.title ?? "Project"} slide ${slideIndex + 1}`}
                sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            ) : !loading && (
              <Box sx={{
                height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 1,
                background: "rgba(255,255,255,0.02)",
              }}>
                <Box sx={{ fontSize: 22, fontWeight: 500, color: "#fff" }}>{activeProject?.title ?? ""}</Box>
                <Box sx={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>Case study coming soon</Box>
              </Box>
            )}
          </Box>

          {hasSlides && (
            <>
              {/* prev / next sit across the viewer's edges */}
              <Box component="button" aria-label="Previous slide" onClick={onPrev}
                sx={{ ...glassBtn(42.3, "0.5px solid rgba(255,255,255,0.6)"), left: 5.9, top: 440.8, p: 0 }}>
                <Chevron dir="left" />
              </Box>
              <Box component="button" aria-label="Next slide" onClick={onNext}
                sx={{ ...glassBtn(42.3, "0.5px solid rgba(255,255,255,0.6)"), left: 1153.9, top: 440.8, p: 0 }}>
                <Chevron dir="right" />
              </Box>

              {/* ask AI + expand, bottom-right inside the viewer */}
              <CustomTooltip title="Ask To AI" placement="left">
                <Box component="button" aria-label="Ask AI about this slide" onClick={() => onAskAI(slideIndex)}
                  sx={{ position: "absolute", left: 1112.9, top: 669, width: 44, height: 44, p: 0,
                    border: 0, background: "none", cursor: "pointer", transition: "filter 0.25s ease",
                    "&:hover": { filter: "brightness(1.25)" } }}>
                  {/* the existing 44px Ask-AI button art (glass box with green sparkles) */}
                  <Box component="img" src="/assets/icons/AI.png" alt="" sx={{ width: 44, height: 44, display: "block" }} />
                </Box>
              </CustomTooltip>
              <CustomTooltip title="Maximize" placement="left">
                <Box component="button" aria-label="Show full screen" onClick={onExpand}
                  sx={{ ...glassBtn(44), left: 1112.9, top: 731, p: 0, background: "rgba(10,14,12,0.55)" }}>
                  <svg width="21" height="21" viewBox="0 0 21 21" aria-hidden>
                    <path d="M1 7V1h6M14 1h6v6M20 14v6h-6M7 20H1v-6M1 1l6.5 6.5M20 1l-6.5 6.5M20 20l-6.5-6.5M1 20l6.5-6.5"
                      fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Box>
              </CustomTooltip>

              {/* dots, centred in the bottom section */}
              <Box sx={{
                position: "absolute", top: 820, left: 367.9, transform: "translateX(-50%)",
                display: "flex", gap: "16px",
              }}>
                {slides.map((_, i) => (
                  <Box key={i} component="button" aria-label={`Slide ${i + 1}`} onClick={() => onSlide(i)}
                    sx={{
                      width: 12, height: 12, p: 0, borderRadius: "10px", cursor: "pointer",
                      boxSizing: "border-box",
                      border: i === slideIndex ? "none" : "1px solid #616161",
                      background: i === slideIndex ? PRIMARY : "rgba(97,97,97,0.55)",
                      boxShadow: "-1px 3px 13px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
                      transition: "background 0.25s ease",
                      "&:hover": { borderColor: "#9E9E9E" },
                    }} />
                ))}
              </Box>
            </>
          )}
        </Box>

        {/* chat HUD */}
        <Box sx={{ position: "absolute", left: CHAT.x, top: CHAT.y, width: CHAT.w, height: CHAT.h }}>
          <ChatbotPanel
            orb={orb}
            chips={["View Case Study", "About Akash", "How I Design", "Start Guided Tour"]}
            wrapperSx={{ height: "100%" }}
            orbSize={ORB}
            orbOffset={-ORB / 2}
            hud
            hudShape
            hudChannelShape={CHAT_CHANNEL}
            fadeTop
            requestedInput={requestedInput}
          />
        </Box>
      </Box>
    </Box>
  );
}
