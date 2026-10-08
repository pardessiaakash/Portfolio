import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { AboutMeContent } from "./AboutMe";
import AudioButton from "./AudioButton";
import ChatbotPanel from "./ChatbotPanel";
import { useResizableChatbot } from "./hooks/useResizableChatbot";
import ResizeHandle from "./ResizeHandle";
import MobileWelcomeScreen from "./MobileWelcomeScreen";
import AnimatedTooltip from "./AnimatedTooltip";

const STOP_FRAME = 10;
const STOP_FRAME_END = 20;
const UI_SHOW_FRAME = 197;
const END_FRAME = 202;

const framePath = (i) => {
  const n = String(i).padStart(5, "0");
  return `/assets/images/Updated-Sequence/Comp 1_${n}.jpg`;
};

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


/* ── Welcome split screen ── */
function WelcomeScreen({ opacity }) {
  const { widthPercent, isDragging, handleMouseDown, containerRef } = useResizableChatbot(30, "home_chatbot_width_percentage_v2", 30, 50, [30, 50]);
  const isHalfSplit = widthPercent === 50;
  const isMobile = useMediaQuery("(max-width:1024px)");

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
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity, visibility: opacity > 0 ? "visible" : "hidden",
      pointerEvents: opacity > 0.5 ? "auto" : "none",
      px: "4vw", py: "4vh",
    }}>
      {/* Root row: [social pill] [left panel col-9] [right panel col-3] */}
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          alignItems: "stretch",
          gap: "0px",
          width: "80%",
          height: "min(72vh, 520px)",
          position: "relative",
        }}
      >

        {/* Social icons pill */}
        <Box sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "15px",
          borderRadius: "15px",
          px: "6px",
          py: "18px",
          position: "absolute",
          left: "-28px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          border: "1px solid transparent",

          background: `
      linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
      linear-gradient(
        11deg,
        #00CD1F 0%,
        #8C8C8C 6%,
        #8C8C8C 95%,
        #00CD1F 100%
      ) border-box
    `,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,205,31,0.25), inset 0 -1px 0 rgba(0,205,31,0.25)",
        }}>
          {socialIcons.map(({ label, icon, hoverIcon, link }) => (
            <Box
              key={label}
              component="a"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "50%",
                textDecoration: "none",

                "& img": {
                  width: 40,
                  height: 40,
                  opacity: 0.75,
                  filter: "brightness(0) invert(0.75)",
                  transition: "all 0.3s ease",
                },

                "&:hover img": {
                   width: 55,
                  height: 55,
                  content: `url(${hoverIcon})`, 
                  opacity: 1,
                  filter: "none",
                },
              }}
            >
              <Box
                component="img"
                src={icon}
                alt={label}
              />
            </Box>
          ))}
        </Box>

        {/* Left panel — col 9 */}
        <Box
          onWheel={(e) => e.stopPropagation()}
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            overflowY: "auto", // Allow scrolling if content doesn't fit
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.15)", borderRadius: "4px" },
            p: isHalfSplit ? "42px 48px" : "60px",
            border: "1px solid transparent",
            opacity: 0.95,
            background: `
      linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
      linear-gradient(
        11deg,
        #00CD1F 0%,
        #8C8C8C 6%,
        #8C8C8C 95%,
        #00CD1F 100%
      ) border-box
    `,
          }}>
          <AboutMeContent onClose={() => { }} mobile={false} inline={true} compact={isHalfSplit} />
        </Box>

        {/* Resize Handle */}
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
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
  const loadAround = useCallback((index, radius = 10) => {
    const cache = cacheRef.current;
    const from = Math.max(0, index - radius);
    const to = Math.min(END_FRAME, index + radius);
    for (let i = from; i <= to; i++) {
      if (cache[i]) continue;
      const img = new Image();
      img.src = framePath(i);
      cache[i] = img;
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

  // direction ref: +1 forward, -1 backward
  const dirRef = useRef(1);

  // ── Draw frame ───────────────────────────────────────────────────────────
  const drawFrame = useCallback((index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cache = cacheRef.current;

    let img = cache[index];

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
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    animIdRef.current = requestAnimationFrame(loop);

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

    if (idx !== lastDrawnRef.current) {
      drawFrame(idx);
      // preload ahead in direction of travel
      if (dirRef.current < 0) {
        preloadBackward(idx, 40);
      } else {
        loadAround(idx, 20);
      }
      setCurrentFrame(idx);
      onFrameChange?.(idx);

      // welcome UI: show only on frames 201 and 202
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

    animIdRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [loop, drawFrame, loadAround, skipIntro]);

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



  const showScrollUpHint = welcomeOpacity >= 1 && !isMobile;
  const showScrollEntry = currentFrame < STOP_FRAME && !stopped && !isMobile;

  return (
    <>
      <Box sx={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", position: "absolute", inset: 0, width: "100vw", height: "100vh" }}
        />

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
      {currentFrame > 6 && welcomeOpacity === 0 && !isMobile && (
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

      {/* Scroll UP hint — on final UI screen */}
      {showScrollUpHint && (
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

    </>
  );
}