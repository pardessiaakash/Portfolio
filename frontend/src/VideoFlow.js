import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { AboutMeContent } from "./AboutMe";
import AudioButton from "./AudioButton";
import ChatbotPanel from "./ChatbotPanel";
import { useResizableChatbot } from "./hooks/useResizableChatbot";
import ResizeHandle from "./ResizeHandle";
import MobileWelcomeScreen from "./MobileWelcomeScreen";
import AnimatedTooltip from "./AnimatedTooltip";
import { mainHudPath, useElementSize, HudOutline } from "./hud/hudShapes";
import { glassPanelSx, glassHudRectSx, spinBorderSx, useSpinOnHover } from "./hud/glass";

// Frame numbers for the 165-frame sequence. (The original export had a
// duplicate every 5th frame, which made the motion stall; those were removed.)
const STOP_FRAME = 8;
const STOP_FRAME_END = 16;
const SCROLL_HINT_FRAME = 4;          // "scroll down" hint shows after this
const LAST_HUD_FRAME = 158;           // last frame with the HUD drawn in
const UI_SHOW_FRAME = LAST_HUD_FRAME + 1;
const END_FRAME = 164;
// The live UI cross-fades over LAST_HUD_FRAME for this long; the canvas
// holds on that frame meanwhile so the two HUDs dissolve into each other.
const UI_FADE_MS = 350;
// How dark the room gets behind the main UI (black overlay opacity), and
// how long the dimming takes to settle.
// The strength follows the story: light (20%) outside the pod, building up
// from the moment the door opens, and full once the main UI is up.
const ROOM_DIM = {
  center: 0.45, mid: 0.62, edge: 0.85, fadeMs: 900,
  outside: 0.2,          // strength until the pod door opens
  doorOpenFrame: 90,     // the door starts opening here
  beforeUI: 0.7,         // strength reached on the last HUD frame
};
const roomDimLevel = (frame, uiShown) => {
  if (uiShown) return 1;
  if (frame <= ROOM_DIM.doorOpenFrame) return ROOM_DIM.outside;
  const t = Math.min(1, (frame - ROOM_DIM.doorOpenFrame) / (LAST_HUD_FRAME - ROOM_DIM.doorOpenFrame));
  return ROOM_DIM.outside + (ROOM_DIM.beforeUI - ROOM_DIM.outside) * t;
};

// The intro frames are 1920x1080 and are drawn "cover"-scaled to the window
// (see drawFrame). The welcome UI is laid out on a stage of the same size and
// scaled the same way, so it lands exactly on the HUD baked into
// LAST_HUD_FRAME and the hand-off at UI_SHOW_FRAME has no jump.
const STAGE_W = 1920;
const STAGE_H = 1080;
// HUD geometry measured from LAST_HUD_FRAME, in stage pixels.
const HUD = {
  row: { left: 302, top: 247, width: 1324, height: 508 }, // main + gap + chat
  chatPercent: (371 / 1324) * 100,                          // chat panel 371px
  gap: 30,                                                  // between panels
  pill: { left: -29, top: "calc(50% + 5px)", gap: 22, px: "7.5px", py: "19px" }, // 61 x 348
  orb: { size: 127, offset: -30 },
};

// HUD shape experiment (Figma "Main_Landing_Page_For Claude"): the two
// panels interlock, so the gap between their boxes shrinks to 10px and the
// steps in their outlines form the channel the handle sits in. The main
// panel's lower edge stays where it was (923px wide below the step); only
// its top section reaches 20px further into the old gap.
const HUD_SHAPE = {
  gap: 2,   // narrow: the visible channel comes from the steps in the shapes
  mainStep: 25.5 * (HUD.row.height / 632),   // right-edge step of the main HUD
};
// centre of the lower channel, relative to the handle box centre
HUD_SHAPE.pillShift = -(HUD_SHAPE.mainStep / 2);

function MainHudPanel({ isHalfSplit }) {
  const [ref, { w, h }] = useElementSize();
  const d = w && h ? mainHudPath(w, h) : null;
  // keep the content where it was: the box grew by the old gap minus the new
  const extraRight = HUD.gap - HUD_SHAPE.gap;
  return (
    <Box
      ref={ref}
      sx={{
        flex: 1,
        minWidth: 0,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        // dark liquid glass (edge, rim light and glow come from HudOutline)
        ...glassPanelSx,
        opacity: 1,
        // before the first measurement fall back to the old rounded box
        ...(d ? { clipPath: `path("${d}")` } : { borderRadius: "20px" }),
      }}
    >
      <Box
        onWheel={(e) => e.stopPropagation()}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto", // Allow scrolling if content doesn't fit
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.15)", borderRadius: "4px" },
          border: "1px solid transparent",
          // split view: extra bottom padding keeps the bio and button clear
          // of the lower edge of the HUD shape
          p: isHalfSplit ? `42px ${48 + extraRight}px 58px 48px` : `60px ${88 + extraRight}px 60px 88px`,
        }}
      >
        <AboutMeContent onClose={() => { }} mobile={false} inline={true} compact={isHalfSplit} hud={!isHalfSplit} />
      </Box>
      <HudOutline d={d} w={w} h={h} />
    </Box>
  );
}

const coverScale = () =>
  Math.max(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);

function useCoverScale() {
  const [scale, setScale] = useState(coverScale);
  useEffect(() => {
    const onResize = () => setScale(coverScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

const framePath = (i) => {
  const n = String(i).padStart(5, "0");
  return `/assets/images/Updated-Sequence/Comp 1_${n}.webp`;
};

// After the first frames are in, the rest of the sequence is fetched quietly
// in the background, a few at a time, so scrolling never waits on the network.
const BG_CONCURRENCY = 4;

const socialIcons = [
  { label: "LinkedIn", icon: "/assets/icons/lindedin.svg",
    hoverIcon:"/assets/icons/withhover/linkedIn.png", link: "https://www.linkedin.com" },
  { label: "Behance", icon: "/assets/icons/behance.svg", hoverIcon:"/assets/icons/withhover/behance.png", link: "https://www.behance.net/pardessiaaec66" },
  { label: "Dribbble", icon: "/assets/icons/dribble.svg", hoverIcon:"/assets/icons/withhover/dribble.png", link: "https://dribbble.com/pardessiaakash" },
  {
    label: "Mobile",
    icon: "/assets/icons/mobile.svg",
    hoverIcon:"/assets/icons/withhover/mobile.png",
    link: "tel:+919011566393",
  },
  {
    label: "Mail",
    icon: "/assets/icons/email.svg",
    hoverIcon:"/assets/icons/withhover/mail.png",
    link: "mailto:pardessiaakash@gmail.com",
  },
];


/* ── Social icon in the vertical bar ──
   Hover: the icon keeps its size and turns white, and a glass ring with the
   gradient border appears around it and turns slowly (same as the other
   hover borders). Previously a 76px PNG was swapped in, which shrank the
   icon inside its ring and looked squished. */
function SocialIcon({ label, icon, link }) {
  const spin = useSpinOnHover();
  return (
    <Box
      ref={spin.ref}
      {...spin.hoverProps}
      component="a"
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: "50%",
        textDecoration: "none",
        outline: "none",

        "& img": {
          width: 40,
          height: 40,
          position: "relative",
          zIndex: 2,
          filter: "brightness(0) invert(0.75)",
          opacity: 0.75,
          transition: "filter 0.3s ease, opacity 0.3s ease",
        },
        "&:hover img, &:focus-visible img": { filter: "brightness(0) invert(1)", opacity: 1 },

        // ring: dark glass disc with the turning gradient border
        "& .social-ring": {
          left: "50%", top: "50%",
          width: 50, height: 50,
          transform: "translate(-50%, -50%) scale(0.9)",
          borderRadius: "50%",
          opacity: 0,
          transition: "opacity 0.3s ease, transform 0.3s ease",
          backgroundColor: "rgba(20,22,21,0.85)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 12px rgba(0,0,0,0.35)",
          ...spinBorderSx(1),
          position: "absolute",
        },
        "&:hover .social-ring, &:focus-visible .social-ring": {
          opacity: 1,
          transform: "translate(-50%, -50%) scale(1)",
        },
      }}
    >
      <Box className="social-ring" aria-hidden />
      <Box component="img" src={icon} alt="" />
    </Box>
  );
}

/* ── Welcome split screen ── */
function WelcomeScreen({ opacity }) {
  const { widthPercent, isDragging, handleMouseDown, containerRef } = useResizableChatbot(
    HUD.chatPercent, "home_chatbot_width_percentage_v3", HUD.chatPercent, 50, [HUD.chatPercent, 50]
  );
  const isHalfSplit = widthPercent === 50;
  const isMobile = useMediaQuery("(max-width:1024px)");
  const scale = useCoverScale();

  // Desktop-only onboarding hints — one pointing at the assistant avatar,
  // one pointing at the chat input. Both self-dismiss (progress bar) or
  // can be closed manually; AnimatedTooltip also no-ops on mobile itself,
  // this state just avoids re-showing them once dismissed.
  const [showAvatarHint, setShowAvatarHint] = useState(true);
  const [showInputHint, setShowInputHint] = useState(true);

  if (isMobile) {
    return (
      <MobileWelcomeScreen opacity={opacity} socialIcons={socialIcons} />
    );
  }

  return (
    <Box sx={{
      position: "absolute", inset: 0, zIndex: 5,
      overflow: "hidden",
      opacity, visibility: opacity > 0 ? "visible" : "hidden",
      // fade in/out over the held HUD frame; hide only after fading out
      transition: `opacity ${UI_FADE_MS}ms ease-out, visibility 0s linear ${opacity > 0 ? 0 : UI_FADE_MS}ms`,
      pointerEvents: opacity > 0.5 ? "auto" : "none",
    }}>
      {/* Stage: 1920x1080 design space, cover-scaled like the canvas frames */}
      <Box sx={{
        position: "absolute", left: "50%", top: "50%",
        width: STAGE_W, height: STAGE_H,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
      }}>
      {/* Root row: [social pill] [left panel col-9] [right panel col-3] */}
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          alignItems: "stretch",
          gap: "0px",
          position: "absolute",
          ...HUD.row,
        }}
      >

        {/* Social icons pill */}
        <Box sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: `${HUD.pill.gap}px`,
          borderRadius: "17px",
          // +1px padding replaces the old 1px border, so the size is unchanged
          px: `calc(${HUD.pill.px} + 1px)`,
          py: `calc(${HUD.pill.py} + 1px)`,
          left: `${HUD.pill.left}px`,
          top: HUD.pill.top,
          transform: "translateY(-50%)",
          zIndex: 10,
          // HUD liquid glass (~20% see-through) with the Figma gradient
          // border, specular rim and shadows
          ...spinBorderSx(1),
          ...glassHudRectSx,
          position: "absolute",
        }}>
          {socialIcons.map(({ label, icon, link }) => (
            <SocialIcon key={label} label={label} icon={icon} link={link} />
          ))}
        </Box>

        {/* Left panel — col 9, cut to the Figma HUD shape */}
        <MainHudPanel isHalfSplit={isHalfSplit} />

        {/* Resize Handle — sits in the diagonal channel between the two
            shapes; the pill is moved to the middle of the lower channel */}
        <Box sx={{
          display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center",
          width: HUD_SHAPE.gap, flexShrink: 0,
          "& .handle-line": { display: "none" },
          "& .handle-pill": { transform: `translate(${HUD_SHAPE.pillShift}px, -50%)` },
        }}>
          <ResizeHandle onMouseDown={handleMouseDown} isDragging={isDragging} />
        </Box>

        {/* Right panel — col 3 */}
        <Box sx={{
          width: { xs: "33.3%", md: `${widthPercent}%` },
          flexShrink: 0,
          position: "relative",
          overflow: "visible",
        }}>
          <ChatbotPanel
            chips={["View Case Study", "How I Design", "Start Chat"]}
            wrapperSx={{ height: "100%" }}
            orbSize={HUD.orb.size}
            orbOffset={HUD.orb.offset}
            hud={!isHalfSplit}
            hudShape
            fadeTop
          />

          {/* Hint: points up-right at the assistant avatar in the top-right corner.
              Nudge the top/right offsets to line up with the avatar's real
              position once it's rendered (it visually floats above this panel). */}
          <Box sx={{ position: "absolute", top: "-28%", right: "65%", zIndex: 50 }}>
            <AnimatedTooltip
              text={"Ask anything\nabout me\nclicking here"}
              curve="down-right"
              visible={showAvatarHint}
              onDismiss={() => setShowAvatarHint(false)}
            />
          </Box>
        </Box>

        {/* Hint: points up-right at the chat input, anchored near the bottom
            of the left panel like in the reference screenshot. */}
        <Box sx={{ position: "absolute", left: "2%", bottom: -138, zIndex: 50 }}>
          <AnimatedTooltip
            text={"Ask anything\nabout me\nclicking here"}
            curve="up-right"
            visible={showInputHint}
            onDismiss={() => setShowInputHint(false)}
          />
        </Box>

      </Box>
      </Box>
    </Box>
  );
}

export default function VideoFlow({ onComplete, onFrameChange, skipIntro, onOpenChatbot, introComplete }) {
  const canvasRef = useRef(null);
  const isMobile = useMediaQuery("(max-width:1024px)");

  // On mobile, skip animation entirely — always show UI at full opacity
  const effectiveSkipIntro = skipIntro || isMobile;

  const posRef = useRef(effectiveSkipIntro ? END_FRAME : 0);
  const targetPosRef = useRef(effectiveSkipIntro ? END_FRAME : 0);
  const animIdRef = useRef(null);
  const cacheRef = useRef({});
  const lastDrawnRef = useRef(-1);
  const exactDrawnRef = useRef(-1);
  const lastIdxRef = useRef(-1);     // playback position last handled
  const holdUntilRef = useRef(0);    // canvas holds LAST_HUD_FRAME until then
  const uiShownRef = useRef(effectiveSkipIntro ? true : false);

  // welcome UI opacity — driven by frame position
  const [welcomeOpacity, setWelcomeOpacity] = useState(effectiveSkipIntro ? 1 : 0);

  // keep introComplete accessible in wheel handler via ref
  const reversingRef = useRef(false);

  // frame-derived UI states
  const [currentFrame, setCurrentFrame] = useState(skipIntro ? END_FRAME : 0);
  // stopped: user scrolled to frame 10 and stopped — show options
  const [stopped, setStopped] = useState(false);
  const stoppedRef = useRef(false);
  const scrollTimerRef = useRef(null);

  const setStoppedSync = (v) => { stoppedRef.current = v; setStopped(v); };

  // ── Load frames around index ──────────────────────────────────────────────
  // Requests go out nearest-first, so the frame we need now arrives before
  // the ones we might need later.
  const loadAround = useCallback((index, radius = 10) => {
    const cache = cacheRef.current;
    for (let d = 0; d <= radius; d++) {
      for (const i of d === 0 ? [index] : [index + d, index - d]) {
        if (i < 0 || i > END_FRAME || cache[i]) continue;
        const img = new Image();
        img.src = framePath(i);
        cache[i] = img;
      }
    }
  }, []);

  // preload backward from index in small batches so browser isn't overwhelmed
  const preloadBackward = useCallback((from, count = 30) => {
    const cache = cacheRef.current;
    let loaded = 0;
    for (let i = from; i >= 0 && loaded < count; i--) {
      if (cache[i]) continue;
      const img = new Image();
      img.src = framePath(i);
      cache[i] = img;
      loaded++;
    }
  }, []);

  // Background fill: walk forward from `start`, then pick up anything earlier.
  // Frames already requested (by scrolling) are skipped.
  const preloadAllInBackground = useCallback((start) => {
    const cache = cacheRef.current;
    const order = [];
    for (let i = start; i <= END_FRAME; i++) order.push(i);
    for (let i = start - 1; i >= 0; i--) order.push(i);
    let next = 0;
    let cancelled = false;
    const pump = () => {
      if (cancelled) return;
      while (next < order.length && cache[order[next]]) next++;
      if (next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.onload = img.onerror = pump;
      img.src = framePath(i);
      cache[i] = img;
    };
    for (let k = 0; k < BG_CONCURRENCY; k++) pump();
    return () => { cancelled = true; };
  }, []);

  // direction ref: +1 forward, -1 backward
  const dirRef = useRef(1);

  // ── Draw frame ───────────────────────────────────────────────────────────
  const drawFrame = useCallback((index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cache = cacheRef.current;

    let img = cache[index];
    const exact = !!(img && img.complete && img.naturalWidth > 0);

    // if exact frame not ready, search in the direction we came FROM
    // (i.e. frames we already passed — guaranteed to be loaded)
    if (!img || !img.complete || img.naturalWidth === 0) {
      const fallbackDir = -dirRef.current; // opposite of travel = already seen
      for (let d = 1; d <= 30; d++) {
        const f = cache[index + fallbackDir * d];
        if (f && f.complete && f.naturalWidth > 0) { img = f; break; }
      }
    }
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext("2d");
    const cw = canvas.width, ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    lastDrawnRef.current = index;
    // A stand-in frame was drawn; keep redrawing until the real one is in.
    // Without this the canvas could stay on an earlier frame (one that still
    // has the HUD baked in) underneath the live UI.
    exactDrawnRef.current = exact ? index : -1;
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    animIdRef.current = requestAnimationFrame(loop);

    // While the UI cross-fades, hold the canvas on the last HUD frame and
    // pause playback; scrolling resumes from there once the fade is done.
    const holding = performance.now() < holdUntilRef.current;
    if (holding) {
      if (lastDrawnRef.current !== LAST_HUD_FRAME || exactDrawnRef.current !== LAST_HUD_FRAME) {
        drawFrame(LAST_HUD_FRAME);
      }
      return;
    }

    const target = targetPosRef.current;
    const current = posRef.current;
    const diff = target - current;

    // track direction of travel
    if (diff > 0.1) dirRef.current = 1;
    else if (diff < -0.1) dirRef.current = -1;

    // step toward target one frame at a time so every frame gets drawn
    let next;
    if (Math.abs(diff) < 0.5) {
      next = target;
    } else {
      next = current + Math.sign(diff) * Math.min(Math.abs(diff), 1);
    }
    posRef.current = next;

    const idx = Math.max(0, Math.min(END_FRAME, Math.round(next)));

    // Crossing the hand-off in either direction starts the cross-fade.
    const crossed = lastIdxRef.current >= 0 &&
      (lastIdxRef.current >= UI_SHOW_FRAME) !== (idx >= UI_SHOW_FRAME);
    const enteringUI = crossed && idx >= UI_SHOW_FRAME;
    if (crossed) {
      holdUntilRef.current = performance.now() + UI_FADE_MS;
      // Park playback on the HUD frame; the next frame plays after the hold.
      posRef.current = LAST_HUD_FRAME;
    }

    // Redraw if the frame changed, or only a stand-in was ready last time.
    // On the way into the UI the canvas stays on the HUD frame (hold above).
    if (!enteringUI && (idx !== lastDrawnRef.current || exactDrawnRef.current !== idx)) {
      drawFrame(idx);
    }

    if (idx !== lastIdxRef.current) {
      lastIdxRef.current = idx;
      // preload ahead in direction of travel
      if (dirRef.current < 0) {
        preloadBackward(idx, 40);
      } else {
        loadAround(idx, 20);
      }
      setCurrentFrame(idx);
      onFrameChange?.(idx);

      // welcome UI: shown from the first frame after the drawn-in HUD
      if (idx >= UI_SHOW_FRAME) {
        setWelcomeOpacity(1);
      } else {
        setWelcomeOpacity(0);
      }

      // forward: crossed UI_SHOW_FRAME → notify parent
      if (!uiShownRef.current && idx >= UI_SHOW_FRAME) {
        uiShownRef.current = true;
        onComplete?.();
        // preload all frames backward so reverse is smooth
        const cache = cacheRef.current;
        for (let i = END_FRAME; i >= 0; i--) {
          if (cache[i]) continue;
          const img = new Image();
          img.src = framePath(i);
          cache[i] = img;
        }
      }

      // backward: crossed below UI_SHOW_FRAME → reset so it can re-trigger
      if (uiShownRef.current && idx < UI_SHOW_FRAME) {
        uiShownRef.current = false;
      }

      // clear reversing only when we've fully scrubbed back to start
      if (reversingRef.current && idx <= 1) {
        reversingRef.current = false;
      }
    }
  }, [drawFrame, loadAround, preloadBackward, onComplete, onFrameChange]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawFrame(Math.round(posRef.current));
    };
    resize();
    window.addEventListener("resize", resize);

    const start = effectiveSkipIntro ? END_FRAME : 0;
    posRef.current = start;
    targetPosRef.current = start;
    loadAround(start, 20);

    // First visit: once the opening frame is on screen, fetch the rest so the
    // whole scroll plays smoothly. Returning visitors land on the last frame
    // and only need the frames around it.
    let stopBackground = null;
    let bgTimer = null;
    if (!effectiveSkipIntro) {
      const first = cacheRef.current[start];
      const begin = () => { if (!stopBackground) stopBackground = preloadAllInBackground(start); };
      if (first && first.complete) bgTimer = setTimeout(begin, 0);
      else if (first) first.addEventListener("load", () => { bgTimer = setTimeout(begin, 300); }, { once: true });
    }

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", resize);
      clearTimeout(bgTimer);
      stopBackground?.();
    };
  }, [loop, drawFrame, loadAround, preloadAllInBackground, effectiveSkipIntro]);

  // ── Wheel: scrub frames ───────────────────────────────────────────────────
  useEffect(() => {
    const onWheel = (e) => {
      if (stoppedRef.current) {
        const frame = Math.round(targetPosRef.current);
        // only dismiss if scrolling out of the stop zone
        if (frame < STOP_FRAME || frame > STOP_FRAME_END) {
          setStoppedSync(false);
        }
      }

      // if welcome UI is fully shown and user scrolls up — scrub backward
      if (e.deltaY < 0 && welcomeOpacity >= 1) {
        uiShownRef.current = false;
        reversingRef.current = true;
        preloadBackward(Math.round(targetPosRef.current), 40);
      }

      const delta = e.deltaY > 0 ? 1 : -1;
      const newTarget = Math.max(0, Math.min(END_FRAME, targetPosRef.current + delta));
      targetPosRef.current = newTarget;

      const t = Math.round(newTarget);
      if (e.deltaY < 0) {
        preloadBackward(t, 30);
      } else {
        loadAround(t, 15);
      }

      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        const frame = Math.round(targetPosRef.current);
        if (frame >= STOP_FRAME && frame <= STOP_FRAME_END && !uiShownRef.current) {
          setStoppedSync(true);
        }
      }, 180);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      clearTimeout(scrollTimerRef.current);
    };
  }, [loadAround, preloadBackward, welcomeOpacity]);



  const showScrollEntry = currentFrame < STOP_FRAME && !stopped && !isMobile;

  return (
    <>
      <Box sx={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", position: "absolute", inset: 0, width: "100vw", height: "100vh" }}
        />

        {/* Room dimmer: once the main UI is up, darken the room (most at the
            edges, where the ceiling lights, floor strips and screens are) so
            attention goes to the panels. Light outside the pod, builds up
            once the door opens, full with the UI (see ROOM_DIM). */}
        {!isMobile && (
          <Box aria-hidden sx={{
            position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
            background: `radial-gradient(ellipse 62% 58% at 50% 48%,
              rgba(0,0,0,${ROOM_DIM.center}) 0%,
              rgba(0,0,0,${ROOM_DIM.mid}) 60%,
              rgba(0,0,0,${ROOM_DIM.edge}) 100%)`,
            opacity: roomDimLevel(currentFrame, welcomeOpacity >= 1),
            // quick while scrubbing, slower for the step up when the UI appears
            transition: `opacity ${welcomeOpacity >= 1 ? ROOM_DIM.fadeMs : 250}ms ease-out`,
          }} />
        )}

        {/* Welcome split screen — fades in with animation */}
        <WelcomeScreen opacity={welcomeOpacity} />

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounceDown {
            0%, 100% { transform: translateY(0); opacity: 0.6; }
            50%       { transform: translateY(5px); opacity: 1; }
          }
          @keyframes bounceUp {
            0%, 100% { transform: translateY(0); opacity: 0.6; }
            50%       { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </Box>

      {/* Scroll entry card — shown on frame 0 before scrolling */}
      {showScrollEntry && (
        <Box sx={{
          position: "fixed", inset: 0, zIndex: 99997,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <Box sx={{
            display: "flex", alignItems: "center", gap: 2,
            px: "40px", py: "22px",
            borderRadius: "14px",
            background: "rgba(40,50,45,0.55)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            minWidth: "280px",
          }}>
            {/* Mouse scroll icon */}
            <Box
              component="img"
              src="/assets/gif/scroll.gif"
              alt="scroll down"
              sx={{ width: "20px" }}
            />
            {/* Text */}
            <Box>
              <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", fontWeight: 400, lineHeight: 1.5 }}>
                Scroll to enter in the
              </Typography>
              <Typography sx={{ color: "#fff", fontSize: "14px", fontWeight: 700, lineHeight: 1.3 }}>
                Design lab
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ON/OFF mute button — bottom right */}
      <AudioButton />

      {/* Scroll gif — bottom left, frame 1–5 (gif only) */}

      {/* Scroll gif + text — bottom left, after frame 6 until welcome UI */}
      {currentFrame > SCROLL_HINT_FRAME && welcomeOpacity === 0 && !isMobile && (
        <Box sx={{
          position: "fixed", bottom: 28, left: 28, zIndex: 99998,
          display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
          pointerEvents: "none",
        }}>
          <Typography sx={{ fontSize: "10px", letterSpacing: "3px", textTransform: "capitalize" }}>
            scroll <br />down
          </Typography>
          <Box
            component="img"
            src="/assets/gif/scroll.gif"
            alt="scroll"
            sx={{ width: 20, opacity: 0.85 }}
          />

        </Box>
      )}

      {/* No scroll hint on the final UI screen: the visitor is inside the
          pod and exploring the site, so "scroll down" would be misleading. */}

    </>
  );
}