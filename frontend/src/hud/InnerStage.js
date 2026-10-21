// Desktop category page, laid out from the Figma frame "Inner_Page_For Claude".
//
// Everything sits on a 1920 × 1087 stage (the Figma frame) that is scaled to
// fit the window, so positions below are Figma pixels. The main HUD's outline
// includes the selected category tab, so that tab reads as part of the panel;
// the other tabs sit behind it. The chat HUD is the shared ChatbotPanel cut to
// this page's geometry (orb cut-out and a ~25px channel to the main HUD).

import SlideDots, { DOTS } from "./SlideDots";
import React, { useEffect, useRef, useState } from "react";
import { Box, GlobalStyles } from "@mui/material";
import light from "@fontsource/montserrat/files/montserrat-latin-300-normal.woff2";
import medium from "@fontsource/montserrat/files/montserrat-latin-500-normal.woff2";
import semibold from "@fontsource/montserrat/files/montserrat-latin-600-normal.woff2";
import { buildPath, HudOutline } from "./hudShapes";
import { glassPanelSx } from "./glass";
import ChatbotPanel from "../ChatbotPanel";
import CustomTooltip from "../CustomTooltip";
import { HandleGrip, handleGripHoverSx } from "../ResizeHandle";
import SlideFigure from "./SlideFigure";
import ChapterMenu from "./ChapterMenu";
import EmptyCategory from "./EmptyCategory";
import { srOnly } from "../a11y";

const PRIMARY = "#00CD1F";
const STAGE_W = 1920, STAGE_H = 1087;

/* ── Figma geometry (stage pixels) ─────────────────────────────────────── */

// Main HUD outline box: from x 126 to the split (x 1355 by default), tab
// tops at y 128, panel top at y 177.
const MAIN = { x: 126, y: 128 };
const TAB = { h: 49, w: 229, slant: 38, r: 16, x0: 158.9, offsets: [0, 165, 320, 485] };
const BODY_H = 803;                 // panel height below the tab row
const STEP = { y: 185, d: 28 };     // right edge steps in 28px, 185px below the top
const LOWER = { l: 86, r: 676, drop: 35 }; // bottom section (holds the dots)
const MAIN_H = TAB.h + BODY_H;

// Chat HUD: right edge x 1724, y 177–981, orb centred on its top-right corner.
const CHAT = { right: 1724, y: 177, h: 804 };
const ORB = 158 * 0.8;                  // Figma orb, 20% smaller

// Gap between the HUDs: the same 11px channel as the home screen, equally wide
// along the straight runs, the 45° step and the corners (the chat edge is the
// main HUD's right edge offset by the gap).
const GAP = 11;
const STEP_R = 12;                      // corner radius at the main HUD's step
const CHAT_CHANNEL = {
  inset: STEP.d,
  stepY: STEP.y + GAP * (Math.SQRT2 - 1),
  step: STEP.d,
  rUpper: STEP_R + GAP,
  rLower: Math.max(1, STEP_R - GAP),
};

// Split = x of the main HUD's (upper) right edge. Drag the handle between the
// two snap points: the Figma layout, and a wider chat (main HUD still wide
// enough for the four category tabs).
const SPLIT = { normal: 1355, wide: 1040 };

const mainPath = (active, W) => {
  const T = TAB.h, x0 = TAB.x0 + TAB.offsets[active];
  const bottom = T + BODY_H, mid = bottom - LOWER.drop;
  return buildPath([
    { x: 0, y: T, r: 20 },
    { x: x0, y: T, r: 16 },
    { x: x0 + TAB.slant, y: 0, r: TAB.r },
    { x: x0 + TAB.w - TAB.slant, y: 0, r: TAB.r },
    { x: x0 + TAB.w, y: T, r: 16 },
    { x: W, y: T, r: 20 },
    { x: W, y: T + STEP.y, r: STEP_R },
    { x: W - STEP.d, y: T + STEP.y + STEP.d, r: STEP_R },
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
  orb, requestedInput, keysDisabled = false,
  category, onSeeUiux, isCtaSlide = () => false,
}) {
  const s = useStageScale();
  const stageRef = useRef(null);
  const [split, setSplit] = useState(SPLIT.normal);
  const [dragging, setDragging] = useState(false);
  const W = split - MAIN.x;                       // main HUD width
  const chatX = split - STEP.d + GAP;             // chat box left (lower edge + gap)
  const viewerW = W - 81;                         // 1148 at the Figma split
  const d = mainPath(activeTab, W);
  const hasSlides = slides.length > 0;
  // carousel controls only when there's something to page through
  const goPrev = () => hasSlides && onPrev();
  const goNext = () => hasSlides && onNext();

  // ← / → change slides, like the arrow buttons (not while typing, while
  // the resize handle has focus, or while full screen is open)
  const navRef = useRef({});
  navRef.current = { goPrev, goNext };
  useEffect(() => {
    if (keysDisabled) return undefined;
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.getAttribute?.("role") === "separator")) return;
      e.preventDefault();
      if (e.key === "ArrowLeft") navRef.current.goPrev(); else navRef.current.goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysDisabled]);

  const splitRef = useRef(split);
  splitRef.current = split;
  // drag the handle; on release, glide to the nearer snap point
  const glideTo = (to) => {
    const from = splitRef.current, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 260), e = 1 - Math.pow(1 - k, 3);
      setSplit(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const onHandleDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };
  const onHandleMove = (e) => {
    if (!dragging || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / s + STEP.d - GAP / 2;   // pointer sits mid-channel
    setSplit(Math.min(SPLIT.normal, Math.max(SPLIT.wide, x)));
  };
  const onHandleUp = () => {
    if (!dragging) return;
    setDragging(false);
    const mid = (SPLIT.normal + SPLIT.wide) / 2;
    glideTo(splitRef.current < mid ? SPLIT.wide : SPLIT.normal);
  };
  // paint inactive tabs furthest-from-active first
  const order = tabs.map((_, i) => i).filter((i) => i !== activeTab)
    .sort((a, b) => Math.abs(b - activeTab) - Math.abs(a - activeTab));
  const tabX = (i) => MAIN.x + TAB.x0 + TAB.offsets[i];

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", ...(dragging ? { cursor: "ew-resize", userSelect: "none" } : {}) }}>
      {fontFaces}
      {/* darkened room around the HUDs, same as the home screen once its UI is up */}
      <Box aria-hidden sx={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 62% 58% at 50% 48%,
          rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.62) 60%, rgba(0,0,0,0.85) 100%)`,
      }} />
      <Box ref={stageRef} sx={{
        position: "absolute",
        left: "50%", top: "50%",
        width: STAGE_W, height: STAGE_H,
        transform: `translate(-50%, -50%) scale(${s})`,
        transformOrigin: "50% 50%",
        fontFamily: FONT_STACK,
      }}>
        {/* inactive category tabs, behind the panel */}
        <Box component="svg" role="tablist" aria-label="Categories" aria-owns="inner-tab-active"
          width={STAGE_W} height={MAIN.y + TAB.h + 2}
          sx={{
            position: "absolute", left: 0, top: 0, overflow: "visible",
            "& .tab": { cursor: "pointer", outline: "none" },
            "& .tab path, & .tab text": { transition: "fill 0.25s ease, stroke 0.25s ease" },
            "& .tab:hover path, & .tab:focus-visible path": { stroke: "rgba(0,205,31,0.7)" },
            "& .tab:hover text, & .tab:focus-visible text": { fill: PRIMARY },
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
          left: MAIN.x, top: MAIN.y, width: W, height: MAIN_H,
          ...glassPanelSx,
          clipPath: `path("${d}")`,
        }}>
          <HudOutline d={d} w={W} h={MAIN_H} />

          {/* selected tab label */}
          <Box role="tab" id="inner-tab-active" aria-selected="true" tabIndex={-1} sx={{
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
            <CustomTooltip title="Back to Home" placement="bottom">
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
            position: "absolute", left: 26.9, top: 131.8, width: viewerW, height: 659,
            borderRadius: "16px", overflow: "hidden",
            background: "#0B141C",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
          }}>
            {hasSlides ? (
              <>
                <Box component="h2" sx={srOnly}>{activeProject?.title} case study</Box>
                <SlideFigure src={slides[slideIndex]} index={slideIndex} count={slides.length}
                  title={activeProject?.title} text={activeProject?.text?.[slideIndex]}
                  isCta={isCtaSlide(slideIndex)} />
                {/* preload the next slide so paging feels instant */}
                <link rel="prefetch" as="image" href={slides[(slideIndex + 1) % slides.length]} />
              </>
            ) : !loading && (
              <Box sx={{ height: "100%", background: "rgba(255,255,255,0.02)" }}>
                <EmptyCategory category={category} onSeeUiux={onSeeUiux} fontFamily={FONT_STACK} />
              </Box>
            )}
          </Box>

          {/* chapter list, top right, in line with the project pills */}
          {hasSlides && activeProject?.topics && (
            <Box sx={{ position: "absolute", right: 54.1, top: 72 }}>
              <ChapterMenu topics={activeProject.topics} current={slideIndex} onSelect={onSlide} fontFamily={FONT_STACK} />
            </Box>
          )}

          {/* carousel controls, when the project has slides */}
          {hasSlides && (
            <>
              {/* prev / next sit across the viewer's edges */}
              <CustomTooltip title="Previous" placement="top"
                wrapperSx={{ position: "absolute", left: 5.9, top: 440.8 }}>
              <Box component="button" aria-label="Previous slide" onClick={goPrev}
                sx={{ ...glassBtn(42.3, "0.5px solid rgba(255,255,255,0.6)"), position: "relative", p: 0 }}>
                <Chevron dir="left" />
              </Box>
              </CustomTooltip>
              <CustomTooltip title="Next" placement="top"
                wrapperSx={{ position: "absolute", left: W - 75.1, top: 440.8 }}>
              <Box component="button" aria-label="Next slide" onClick={goNext}
                sx={{ ...glassBtn(42.3, "0.5px solid rgba(255,255,255,0.6)"), position: "relative", p: 0 }}>
                <Chevron dir="right" />
              </Box>
              </CustomTooltip>

              {/* ask AI + expand: straddle the viewer's right edge like the Next arrow, so they stay clear of the slide content */}
              <CustomTooltip title="Ask To AI" placement="left"
                wrapperSx={{ position: "absolute", left: W - 76.1, top: 646 }}>
                <Box component="button" aria-label="Ask AI about this slide" onClick={() => onAskAI(slideIndex)}
                  sx={{ position: "relative", width: 44, height: 44, p: 0,
                    border: 0, background: "none", cursor: "pointer", transition: "filter 0.25s ease",
                    "&:hover": { filter: "brightness(1.25)" } }}>
                  {/* the existing 44px Ask-AI button art (glass box with green sparkles) */}
                  <Box component="img" src="/assets/icons/AI.png" alt="" sx={{ width: 44, height: 44, display: "block" }} />
                </Box>
              </CustomTooltip>
              <CustomTooltip title="Full screen" placement="left"
                wrapperSx={{ position: "absolute", left: W - 76.1, top: 704 }}>
                <Box component="button" aria-label="Show full screen" onClick={() => onExpand()}
                  sx={{ ...glassBtn(44), position: "relative", p: 0, background: "rgba(10,14,12,0.55)" }}>
                  <svg width="21" height="21" viewBox="0 0 21 21" aria-hidden>
                    <path d="M1 7V1h6M14 1h6v6M20 14v6h-6M7 20H1v-6M1 1l6.5 6.5M20 1l-6.5 6.5M20 20l-6.5-6.5M1 20l6.5-6.5"
                      fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Box>
              </CustomTooltip>

              {/* dots: sliding window centred on the active slide (shared) */}
              <SlideDots count={slides.length} current={slideIndex} onSelect={onSlide}
                sx={{ top: 814, left: 367.9 - DOTS.view / 2 }} />
            </>
          )}
        </Box>

        {/* drag handle, centred in the lower channel */}
        <Box
          role="separator" data-cursor="resize" aria-orientation="vertical"
          aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(((SPLIT.normal - split) / (SPLIT.normal - SPLIT.wide)) * 100)}
          aria-valuetext={split < (SPLIT.normal + SPLIT.wide) / 2 ? "Wide chat" : "Normal chat"}
          aria-label="Resize chat panel (left / right arrow keys)" tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { e.preventDefault(); glideTo(SPLIT.wide); }
            else if (e.key === "ArrowRight") { e.preventDefault(); glideTo(SPLIT.normal); }
            else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              glideTo(split < (SPLIT.normal + SPLIT.wide) / 2 ? SPLIT.normal : SPLIT.wide);
            }
          }}
          onPointerDown={onHandleDown} onPointerMove={onHandleMove}
          onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
          onDoubleClick={() => glideTo(split < (SPLIT.normal + SPLIT.wide) / 2 ? SPLIT.normal : SPLIT.wide)}
          className={dragging ? "dragging" : ""}
          sx={{
            position: "absolute",
            left: split - STEP.d + GAP / 2 - 12, top: 460, width: 24, height: 74,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "col-resize", touchAction: "none", zIndex: 5, userSelect: "none",
            // same handle as the home screen (ResizeHandle)
            ...handleGripHoverSx,
          }}>
          <HandleGrip />
        </Box>

        {/* chat HUD */}
        <Box sx={{ position: "absolute", left: chatX, top: CHAT.y, width: CHAT.right - chatX, height: CHAT.h }}>
          <ChatbotPanel
            orb={orb}
            chips={["View Case Study", "About Akash", "How I Design", "Start Guided Tour"]}
            wrapperSx={{ height: "100%" }}
            orbSize={ORB}
            orbOffset={-ORB / 2}
            hud
            hudShape
            hudChannelShape={CHAT_CHANNEL}
            tallInput
            fadeTop
            requestedInput={requestedInput}
          />
        </Box>
      </Box>
    </Box>
  );
}
