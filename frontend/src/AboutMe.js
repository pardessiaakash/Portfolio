import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Typography, Modal, useMediaQuery, useTheme} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { travel } from "./hud/labRoom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { PRIMARY, primaryAlpha } from "./theme";
import { fetchCategories } from "./api/chatApi";
import DownloadResume from "./DownloadResume";
import { pressable } from "./a11y";
import { glassShapeSx, STROKE_STOPS, STROKE_ANGLE, useSpinOnHover, normalizePath } from "./hud/glass";
import { playHoverTick } from "./sound/uiTick";

/* ── Styled components ── */
const ModalBox = styled(Box)(({ mobile }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: mobile ? "100vw" : "860px",
  maxWidth: mobile ? "100vw" : "95vw",
  maxHeight: mobile ? "100dvh" : "88vh",
  height: mobile ? "100dvh" : "auto",
  overflowY: "auto",
  background: "rgba(8, 11, 8, 0.97)",
  backdropFilter: "blur(30px)",
  WebkitBackdropFilter: "blur(30px)",
  border: mobile ? "none" : `1px solid ${primaryAlpha(0.12)}`,
  borderRadius: mobile ? 0 : "20px",
  padding: mobile ? "24px 20px 32px" : "32px 36px 32px",
  color: "#fff",
  boxShadow: mobile ? "none" : `0 0 60px ${primaryAlpha(0.08)}`,
  "&::-webkit-scrollbar": { width: "4px" },
  "&::-webkit-scrollbar-thumb": { background: primaryAlpha(0.25), borderRadius: "4px" },
}));

// Tab from the Figma frame "Main_Landing_Page_For Claude": 5px-radius body
// with Figma's rounded pointer under the middle. Dark liquid glass; the
// active tab has the Figma gradient border and drop shadow, the inactive one
// shows a softer border on hover. The border turns while hovered.
const tabPath = (W, H, P) => {
  const r = 5, cx = P + W / 2, b = P + H;
  return [
    `M ${P + r} ${P}`, `H ${P + W - r}`, `A ${r} ${r} 0 0 1 ${P + W} ${P + r}`,
    `V ${b - r}`, `A ${r} ${r} 0 0 1 ${P + W - r} ${b}`,
    `H ${cx + 13.3037}`,
    `C ${cx + 11.5195} ${b} ${cx + 9.8705} ${b + 0.9507} ${cx + 8.9765} ${b + 2.4948}`,
    `L ${cx + 4.3271} ${b + 10.5257}`,
    `C ${cx + 2.4013} ${b + 13.8522} ${cx - 2.4013} ${b + 13.8522} ${cx - 4.3271} ${b + 10.5257}`,
    `L ${cx - 8.9765} ${b + 2.4948}`,
    `C ${cx - 9.8705} ${b + 0.9507} ${cx - 11.5195} ${b} ${cx - 13.3037} ${b}`,
    `H ${P + r}`, `A ${r} ${r} 0 0 1 ${P} ${b - r}`, `V ${P + r}`, `A ${r} ${r} 0 0 1 ${P + r} ${P}`, "Z",
  ].join(" ");
};
const TAB_POINTER = 13; // pointer depth below the body
const TAB_SHADOW = 24;  // room around the tab for its drop shadow

export const Tab = React.forwardRef(({ active, onClick, children, w = 156, h = 36, fontSize = 14 }, ref) => {
  const W = w, H = h, P = 2;
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradRef = React.useRef(null);
  const vw = W + P * 2;
  const vh = H + TAB_POINTER + P * 2;
  const d = tabPath(W, H, P);
  const cx = vw / 2, cy = P + H / 2;
  const spin = useSpinOnHover({
    onAngle: (a) => gradRef.current?.setAttribute("gradientTransform", `rotate(${a} ${cx} ${cy})`),
  });
  // gradient line across the tab at the Figma stroke angle
  const ang = (STROKE_ANGLE * Math.PI) / 180;
  const dir = { x: Math.sin(ang), y: -Math.cos(ang) };
  const half = (Math.abs(vw * dir.x) + Math.abs(vh * dir.y)) / 2;
  const S = TAB_SHADOW;

  return (
    <Box
      ref={ref}
      onClick={onClick}
      {...spin.hoverProps}
      {...pressable(onClick, undefined, "tab")}
      aria-selected={!!active}
      sx={{
        position: "relative",
        width: `${vw}px`,
        height: `${vh}px`,
        cursor: "pointer",
        flexShrink: 0,
        margin: `${P}px`,
        "&:hover .tab-label": { color: active ? PRIMARY : "#fff" },
        "& .tab-edge": { opacity: active ? 1 : 0, transition: "opacity 0.25s" },
        "&:hover .tab-edge": { opacity: active ? 1 : 0.6 },
      }}
    >
      {/* drop shadow (active), shown only outside the tab like Figma's */}
      {active ? (
        <svg width={vw + S * 2} height={vh + S * 2}
          style={{ position: "absolute", left: -S, top: -S, pointerEvents: "none" }} aria-hidden>
          <defs>
            <filter id={`tab-sh-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="9.5" />
            </filter>
            <mask id={`tab-shm-${uid}`}>
              <rect width="100%" height="100%" fill="#fff" />
              <path d={d} transform={`translate(${S} ${S})`} fill="#000" />
            </mask>
          </defs>
          <g mask={`url(#tab-shm-${uid})`}>
            <path d={d} transform={`translate(${S + 4} ${S + 13})`} fill="rgba(0,0,0,0.35)" filter={`url(#tab-sh-${uid})`} />
          </g>
        </svg>
      ) : null}
      {/* glass body */}
      <Box aria-hidden sx={{
        position: "absolute", inset: 0,
        clipPath: `path("${d}")`,
        ...glassShapeSx,
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
      }} />
      {/* edge */}
      <svg width={vw} height={vh} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} aria-hidden>
        <defs>
          <linearGradient id={`tab-g-${uid}`} ref={gradRef} gradientUnits="userSpaceOnUse"
            x1={cx - dir.x * half} y1={cy - dir.y * half} x2={cx + dir.x * half} y2={cy + dir.y * half}
            gradientTransform={`rotate(${spin.angle.current} ${cx} ${cy})`}>
            {STROKE_STOPS.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
          </linearGradient>
        </defs>
        <path className="tab-edge" d={d} fill="none" stroke={`url(#tab-g-${uid})`} strokeWidth="1" />
      </svg>
      <Box className="tab-label" sx={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        height: `${H + P * 2}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${fontSize}px`,
        fontWeight: active ? 500 : 400,
        color: active ? PRIMARY : "rgba(255,255,255,0.88)",
        transition: "color 0.2s",
        userSelect: "none"
      }}>
        {children}
      </Box>
    </Box>
  );
});

export const ExpCard = styled(Box)({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "12px",
  padding: "14px 16px",
  minWidth: "130px",
  flexShrink: 0,
  transition: "border 0.2s",
  "&:hover": { border: `1px solid ${primaryAlpha(0.35)}` },
});

export const CertCard = styled(Box)({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "14px",
  padding: "14px 20px",
  borderRadius: "14px",
  backdropFilter: "blur(38px)",
  WebkitBackdropFilter: "blur(38px)",
  boxShadow: "0 6px 13px 0 rgba(0,0,0,0.3), inset 0 1px 2px 0 rgba(0,0,0,0.25)",
  background: "rgba(11, 11, 11, 0.4)",
  border: "1px solid rgba(255,255,255,0.15)",
});

/* ── Data ── */
export const experiences = [
  { company: "Publicis Sapient", role: "Art Director", period: "2022 – Present" },
  { company: "Evonix", role: "Art Director", period: "2019 – 2022" },
  { company: "Creative Studio", role: "Project Manager", period: "2018 – 2019" },
  { company: "SRV Media", role: "Assistant Manager", period: "2015 – 2018" },
  { company: "Affinity Express", role: "Sr. Designer", period: "2012 – 2015" },
  // first role (offer letter dated 1 January 2011)
  { company: "Mancers Info Services", role: "Jr. Graphic Designer", period: "2011 – 2012" },
];

/* ── About Me content (what a UX hiring manager / HR scans for first) ──
   Built only from facts already on the site: the roles above, the IIIT-B
   certification, and the methods shown in the case studies. */
// first day in design: Jr. Graphic Designer at Mancers Info Services
export const CAREER_START = 2011;
const CAREER_START_DATE = new Date(2011, 0, 1);
// full years completed (15 on 1 Jan 2026, 16 on 1 Jan 2027, …)
export const yearsInDesign = () => {
  const now = new Date();
  let y = now.getFullYear() - CAREER_START_DATE.getFullYear();
  if (now < new Date(now.getFullYear(), CAREER_START_DATE.getMonth(), CAREER_START_DATE.getDate())) y -= 1;
  return y;
};
// role line under the header (replaces "Welcome to the Portfolio!")
export const ROLE_LINE = "UI/UX Designer, Art Director";
export const WORK_COPY = "Each case study shows the problem, my decisions and the outcome. Start with UI/UX work.";
export const aboutBio = () =>
  `${yearsInDesign()} years in design, from art direction to UX. I simplify complex products with generative AI.`;
export const snapshot = () => [
  { value: `${yearsInDesign()} years`, label: `In design, since ${CAREER_START}` },
  { value: "UX + Visual", label: "Research to final pixel" },
  { value: "Open to roles", label: "UX & Product Design" },
];
// the methods the case studies walk through, plus the craft from art direction
export const SKILLS = ["Research", "Synthesis", "IA & flows", "Hi-fi UI", "Usability testing", "Art direction", "Design with GenAI"];
// recent roles in full; the early years folded into one line
export const EARLIER = {
  company: "2011 – 2019",
  role: "Graphic Designer → Project Manager",
  period: "Mancers, Affinity Express, SRV Media, Creative Studio",
};
export const SELECTED_WORK = [
  { title: "SwiftConnect", text: "AI-assisted support desk", path: `/portfolio/${encodeURIComponent("UI/UX")}?project=swiftconnect` },
  { title: "Chicora", text: "Fashion shopping app", path: `/portfolio/${encodeURIComponent("UI/UX")}?project=chicora` },
  { title: "Portfolio", text: "This immersive site", path: `/portfolio/${encodeURIComponent("UI/UX")}?project=portfolio` },
  { title: "Mandala Vision Pro", text: "Design system for Vision Pro", path: `/portfolio/Immersive?project=mandala-vision-pro` },
];
export const RESUME_LINE = "Every role and project, in detail.";


export const ICON_MAP = {
  "UI/UX": "/assets/icons/UX.svg",
  "Social Media": "/assets/icons/social-media.svg",
  "Video": "/assets/icons/Video.svg",
  "Videos": "/assets/icons/Video.svg",
  "Print Media": "/assets/icons/print-designs.svg",
  "Print-Designs": "/assets/icons/print-designs.svg",
  "XR": "/assets/icons/XR.svg",
  "Immersive": "/assets/icons/XR.svg",
};

// The fourth category used to be "Print Media"; the work now shown there is
// immersive / VR / XR. Older names from the projects API map to the new one.
const CATEGORY_RENAMES = { "Video": "Videos", "Print Media": "Immersive", "Print-Designs": "Immersive", "Print": "Immersive", "XR": "Immersive", "Immersive/VR/XR": "Immersive" };
export const toCategoryCard = (name) => {
  const label = CATEGORY_RENAMES[name] || name;
  return { label, icon: ICON_MAP[label] || "/assets/icons/UX.svg" };
};

export const DEFAULT_WORK_CATEGORIES = [
  { label: "UI/UX", icon: "/assets/icons/UX.svg" },
  { label: "Social Media", icon: "/assets/icons/social-media.svg" },
  { label: "Videos", icon: "/assets/icons/Video.svg" },
  { label: "Immersive", icon: "/assets/icons/XR.svg" },
];

/* ── Category card with exact Figma SVG shape ── */
// Cards in the 50/50 split: fixed height, and the 2x2 grid spans the
// panel's full content width (as in the first split-view draft).
const COMPACT_CARD = { height: 108, gridWidth: 100 };

// Card sizes for the home-screen HUD, measured from the intro's last HUD frame.
const HUD_CARD = { width: 188, height: 164, icon: 42, label: 19, idle: 0.72 };
// Readable type for the desktop HUDs. The HUD stage renders at ~0.68x on a
// 1440×900 laptop (cover scale × the HUD's place in the room), so these
// stage sizes land at ~13px body / ~11.5px small text there, ~15.5 / 14px
// at 1920×1080. (The mobile layout and the modal keep their own sizes.)
export const HUD_TYPE = { role: 21, name: 36, tab: 16, body: 19, small: 17, label: 16, value: 21, title: 18.5, button: 16.5 };

export function CategoryCard({ cat, onClick, compact, hud = false, glass = false, touch = false }) {
  // touch (phones / tablets): no hover there, so the resting state is the bright one
  const idle = hud ? HUD_CARD.idle : touch ? 0.9 : 0.5;
  const [hovered, setHovered] = useState(false);
  const safeId = cat.label.replace(/[^a-zA-Z0-9]/g, "-") + React.useId().replace(/[^a-zA-Z0-9]/g, "");
  // glass version: the hover border turns while hovered and stays put after
  const gradRef = React.useRef(null);
  const spin = useSpinOnHover({
    onAngle: (a) => gradRef.current?.setAttribute("gradientTransform", `rotate(${a} 108 95)`),
  });

  // Exact path from Figma with-hover.svg (scaled to fit, viewBox 0 0 224 214)
  // The shape path (fill area):
  const shapePath = "M201 11C201 8.23858 198.761 6 196 6H20C17.2386 6 15 8.23858 15 11V169.007C15 171.768 17.2386 174.007 20 174.007H48.2869C49.6135 174.007 50.8857 174.534 51.8235 175.472L56.8827 180.534C57.8204 181.473 59.0927 182 60.4193 182H169.959C171.285 182 172.558 181.473 173.496 180.534L178.088 175.937C179.026 174.998 180.299 174.471 181.626 174.471H189.963C192.725 174.471 194.963 172.232 194.963 169.471V54.3589C194.963 53.0337 195.49 51.7627 196.426 50.8251L199.537 47.711C200.474 46.7734 201 45.5024 201 44.1772V11Z";

  // Stroke path (slightly inset, from with-hover.svg)
  const strokePath = "M20 6.5H196C198.485 6.5 200.5 8.51472 200.5 11V44.1768C200.5 45.3694 200.026 46.5137 199.184 47.3574L196.072 50.4717C195.042 51.503 194.464 52.9017 194.464 54.3594V169.471C194.464 171.956 192.449 173.97 189.964 173.971H181.626C180.166 173.971 178.766 174.551 177.734 175.584L173.142 180.181C172.298 181.025 171.153 181.5 169.959 181.5H60.4189C59.2251 181.5 58.0802 181.025 57.2363 180.181L52.1768 175.119C51.1453 174.087 49.7463 173.507 48.2871 173.507H20C17.5148 173.507 15.5002 171.492 15.5 169.007V11C15.5 8.51472 17.5147 6.5 20 6.5Z";

  return (
    <Box
      onClick={onClick}
      {...pressable(onClick, `${cat.label} projects`, "link")}
      onMouseEnter={() => {
        setHovered(true);
        if (glass) spin.hoverProps.onMouseEnter();
        // techno UI tick, mouse/trackpad only (taps also fire mouseenter)
        if (window.matchMedia?.("(hover: hover)").matches) playHoverTick();
      }}
      onMouseLeave={() => { setHovered(false); if (glass) spin.hoverProps.onMouseLeave(); }}
      sx={{
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        // split view: smaller cards with the same proportions as the full
        // layout (width follows height), so the bio and Download Resume fit
        width: compact ? "100%" : hud ? `${HUD_CARD.width}px` : "170px",
        height: compact ? `${COMPACT_CARD.height}px` : hud ? `${HUD_CARD.height}px` : "170px",
      }}
    >
      {/* glass body, clipped to the card shape */}
      {glass && (
        <>
          <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
            <clipPath id={`clip-${safeId}`} clipPathUnits="objectBoundingBox">
              <path d={normalizePath(shapePath, 216, 190)} />
            </clipPath>
          </svg>
          <Box aria-hidden sx={{
            position: "absolute", inset: 0,
            clipPath: `url(#clip-${safeId})`,
            ...glassShapeSx,
            backgroundColor: hovered ? "rgba(255,255,255,0.05)" : "rgba(12,14,13,0.28)",
            transition: "background-color 0.25s",
          }} />
        </>
      )}

      {/* SVG card shape — exact Figma paths */}
      <svg
        width="100%" height="100%"
        viewBox="0 0 216 190"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {/* Hover stroke gradient — exact from Figma */}
          <linearGradient id={`grad-hover-${safeId}`} ref={gradRef}
            gradientTransform={`rotate(${spin.angle.current} 108 95)`} x1="16.9732" y1="11.0129" x2="226.955" y2="108.074" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8F8F8F" />
            <stop offset="0.265501" stopColor="#636363" />
            <stop offset="0.485577" stopColor="#00CD1F" />
            <stop offset="0.709213" stopColor="#636363" />
            <stop offset="1" stopColor="#8F8F8F" />
          </linearGradient>
          {/* Hover glow filter */}
          <filter id={`glow-${safeId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Fill — dark background */}
        <path
          d={shapePath}
          fill={glass ? "rgba(255,255,255,0)" : hovered ? "rgba(14,20,14,0.97)" : "rgba(18,22,18,0.92)"}
          style={{ transition: "fill 0.25s" }}
        />

        {/* Border — grey when default, gradient when hover */}
        <path
          d={strokePath}
          fill="none"
          stroke={hovered ? `url(#grad-hover-${safeId})` : glass ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.12)"}
          strokeWidth="1"
          vectorEffect={glass ? "non-scaling-stroke" : undefined}
        />

        {/* Extra green glow on the stroke when hovered */}
        {hovered && (
          <path
            d={strokePath}
            fill="none"
            stroke={`url(#grad-hover-${safeId})`}
            strokeWidth="2"
            opacity="0.4"
            filter={`url(#glow-${safeId})`}
          />
        )}
      </svg>

      {/* Card content */}
      <Box sx={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%",
        p: compact ? "12px" : "20px",
      }}>
        <Box
          component="img"
          src={cat.icon}
          alt=""
          sx={{
            width: hud ? HUD_CARD.icon : 40, height: hud ? HUD_CARD.icon : 40, objectFit: "contain",
            filter: hovered ? "brightness(0) invert(1)" : `brightness(0) invert(${idle})`,
            transition: "filter 0.2s",
            mb: "4px",
          }}
        />
        <Typography sx={{
          color: hovered ? "#fff" : `rgba(255,255,255,${idle})`,
          fontSize: hud ? `${HUD_CARD.label}px` : glass ? "17px" : touch ? { xs: "15px", sm: "17px" } : "14px", fontWeight: 500,
          transition: "color 0.2s",
        }}>
          {cat.label}
        </Typography>
        <Box sx={{
          opacity: hovered ? 1 : 0,
          height: hovered ? "24px" : "0px",
          overflow: "hidden",
          transition: "all 0.2s ease-in-out",
          mt: hovered ? "4px" : 0,
        }}>
          <ArrowForwardIcon sx={{ color: "#fff", fontSize: 22 }} />
        </Box>
      </Box>
    </Box>
  );
}

/* ── Work tab ── */
function WorkTab({ onClose, inline, compact, hud }) {
  const navigate = useNavigate();
  const [workCategories, setWorkCategories] = useState(DEFAULT_WORK_CATEGORIES);

  useEffect(() => {
    fetchCategories()
      .then(data => {
        if (data && data.length > 0) {
          setWorkCategories(data.map(toCategoryCard));
        }
      })
      .catch(() => { });
  }, []);

  const handleCategoryClick = (label) => {
    if (onClose) onClose();
    // through the room: the eye dives in toward the category's screens
    travel(navigate, `/portfolio/${encodeURIComponent(label)}`, "inner");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, justifyContent: "center" }}>
      {/* Category cards */}
      <Box sx={{
        display: compact ? "grid" : "flex",
        gridTemplateColumns: compact ? "repeat(2, minmax(0, 1fr))" : undefined,
        // split view: how much of the panel's width the grid spans
        width: compact ? `${COMPACT_CARD.gridWidth}%` : undefined,
        columnGap: compact ? "16px" : 0,
        rowGap: compact ? "14px" : 0,
        flexWrap: { xs: "wrap", md: "nowrap" },
        gap: hud ? "5px" : "0px",
        mt: inline ? "18px" : "28px",
        // the card SVG insets its shape ~13px, so pull the row left to line
        // the first card's visible edge up with the header text
        ml: hud ? "-13px" : 0,
        flex: "0 0 auto",
      }}>
        {workCategories.map((cat) => (
          <CategoryCard key={cat.label} cat={cat} compact={compact} hud={hud} glass={inline} onClick={() => handleCategoryClick(cat.label)} />
        ))}
      </Box>

      {/* Bio + Download Resume */}
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, mt: compact ? "22px" : inline ? "30px" : "48px", alignItems: "center" }}>
        <Typography sx={{ fontSize: inline ? `${HUD_TYPE.body}px` : "13px", lineHeight: inline ? 1.55 : 1.75, textAlign: "left", flex: 1, maxWidth: inline ? "560px" : "450px" }}>
          {WORK_COPY}
        </Typography>
        <DownloadResume glass={inline} />
      </Box>
    </Box>
  );
}

/* ── About Me tab content ──
   A scrolling body (same thin scrollbar as the rest of the site) with the
   resume button pinned below it; every card reuses the existing card styles. */
const sectionLabel = { fontSize: `${HUD_TYPE.label}px`, letterSpacing: "1.2px", mb: 1.2, textAlign: "left", color: "rgba(255,255,255,0.75)" };
const T = HUD_TYPE;

/* Always-visible scrollbar for a scroll area inside the HUD. Native
   scrollbars on macOS stay hidden until you scroll, so a new visitor
   wouldn't know there's more; this one shows from the start (thin track,
   brand-green thumb), only when there is something to scroll, and can be
   dragged or clicked like a normal scrollbar. */
function HudScrollbar({ target, offset = 0 }) {
  const [m, setM] = useState({ show: false, top: 0, h: 0 });
  const trackRef = useRef(null);
  const update = useCallback(() => {
    const el = target.current, tr = trackRef.current;
    if (!el || !tr) return;
    const { scrollHeight: sh, clientHeight: ch, scrollTop: st } = el;
    const th = tr.clientHeight;
    if (sh <= ch + 1 || !th) { setM((p) => (p.show ? { ...p, show: false } : p)); return; }
    const h = Math.max(28, (ch / sh) * th);
    setM({ show: true, h, top: (st / (sh - ch)) * (th - h) });
  }, [target]);
  useEffect(() => {
    const el = target.current;
    if (!el) return undefined;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    [...el.children].forEach((c) => ro.observe(c));
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [target, update]);

  // drag the thumb, or click the track to jump there
  const scrollToY = (clientY, grab) => {
    const el = target.current, tr = trackRef.current;
    if (!el || !tr) return;
    const r = tr.getBoundingClientRect(), scale = r.height / tr.clientHeight || 1;
    const y = (clientY - r.top) / scale - grab;
    el.scrollTop = (y / (tr.clientHeight - m.h)) * (el.scrollHeight - el.clientHeight);
  };
  const onThumbDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const tr = trackRef.current; const r = tr.getBoundingClientRect(), scale = r.height / tr.clientHeight || 1;
    const grab = (e.clientY - r.top) / scale - m.top;
    const move = (ev) => scrollToY(ev.clientY, grab);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <Box ref={trackRef} aria-hidden onPointerDown={(e) => scrollToY(e.clientY, m.h / 2)} sx={{
      position: "absolute", top: "4px", bottom: "18px", right: `${offset}px`, width: "14px",
      cursor: "pointer", opacity: m.show ? 1 : 0, pointerEvents: m.show ? "auto" : "none",
      transition: "opacity 0.3s ease",
      // the track line
      "&::before": { content: '""', position: "absolute", top: 0, bottom: 0, left: "50%", width: "3px",
        transform: "translateX(-50%)", borderRadius: "3px", background: "rgba(255,255,255,0.12)" },
      "&:hover .thumb, & .thumb:active": { width: "6px", background: PRIMARY },
    }}>
      <Box className="thumb" onPointerDown={onThumbDown} sx={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        top: `${m.top}px`, height: `${m.h}px`, width: "4px", borderRadius: "4px",
        background: primaryAlpha(0.8), boxShadow: `0 0 8px ${primaryAlpha(0.35)}`,
        transition: "width 0.2s ease, background 0.2s ease",
      }} />
    </Box>
  );
}

function AboutMeTab({ mobile, inline }) {
  const scrollRef = useRef(null);
  const pad = inline ? "0px" : "40px 90px";
  const navigate = useNavigate();
  const recent = experiences.slice(0, 2);
  const openWork = (path) => travel(navigate, path, "inner");

  return (
    <Box sx={{ padding: pad, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <HudScrollbar target={scrollRef} offset={-58} />
      <Box ref={scrollRef} sx={{
        flex: 1, minHeight: 0, overflowY: "auto", pr: "10px", mr: "-10px", pb: "14px",
        textAlign: "left",
        // the native scrollbar is replaced by HudScrollbar (always visible)
        scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" },
        // the last lines fade into the panel, a hint there's more below
        maskImage: "linear-gradient(#000 calc(100% - 22px), transparent)",
        WebkitMaskImage: "linear-gradient(#000 calc(100% - 22px), transparent)",
      }}>
        {/* who, in one line */}
        <Typography sx={{ fontSize: `${T.body}px`, lineHeight: 1.55, mb: 2 }}>
          {aboutBio()}
        </Typography>

        {/* snapshot: the facts HR looks for first */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2.5 }}>
          {snapshot().map((f) => (
            <ExpCard key={f.label} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: `${T.value}px`, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", lineHeight: 1.25 }}>{f.value}</Typography>
              <Typography sx={{ fontSize: `${T.small}px`, mt: 0.4, lineHeight: 1.35 }}>{f.label}</Typography>
            </ExpCard>
          ))}
        </Box>

        {/* skills */}
        <Typography sx={sectionLabel}>Skills</Typography>
        <Box component="ul" sx={{ display: "flex", flexWrap: "wrap", gap: "8px", listStyle: "none", p: 0, m: 0, mb: 2.5 }}>
          {SKILLS.map((k) => (
            <Box component="li" key={k} sx={{
              fontSize: `${T.small}px`, color: "#fff", px: "14px", py: "7px", borderRadius: "8px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
            }}>{k}</Box>
          ))}
        </Box>

        {/* experience: recent roles in full, the early years in one card */}
        <Typography sx={sectionLabel}>Experience</Typography>
        <Box sx={{ display: "flex", gap: 1.5, mb: 2.5 }}>
          {[...recent, EARLIER].map((exp) => (
            <ExpCard key={exp.company} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: `${T.title}px`, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", lineHeight: 1.3 }}>{exp.company}</Typography>
              <Typography sx={{ fontSize: `${T.small}px`, fontWeight: 600, color: "#fff", mt: 0.3, lineHeight: 1.35 }}>{exp.role}</Typography>
              <Typography sx={{ fontSize: `${T.small}px`, mt: 0.3, lineHeight: 1.35 }}>{exp.period}</Typography>
            </ExpCard>
          ))}
        </Box>

        {/* certification */}
        <CertCard sx={{
          mb: 2.5, border: "0.5px solid transparent",
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
          <Box component="img" src="/assets/icons/UX-Certification.svg" alt="" sx={{ width: 40, height: 40, flexShrink: 0 }} />
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontSize: `${T.title}px`, fontWeight: 600, color: "#fff" }}>
              UI/UX Design with Generative AI
            </Typography>
            <Typography sx={{ fontSize: `${T.small}px`, mt: 0.3, lineHeight: 1.35 }}>
              International Institute of Information Technology Bangalore (IIIT-B)
            </Typography>
          </Box>
        </CertCard>

        {/* selected work: straight to the strongest case studies */}
        <Typography sx={sectionLabel}>Selected work</Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          {SELECTED_WORK.map((w) => (
            <ExpCard key={w.title} onClick={() => openWork(w.path)} {...pressable(() => openWork(w.path), `Open the ${w.title} case study`, "link")}
              sx={{ flex: 1, minWidth: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
                "&:hover .go, &:focus-visible .go": { color: PRIMARY, transform: "translateX(2px)" } }}>
              <Box>
                <Typography sx={{ fontSize: `${T.title}px`, fontWeight: 700, color: "#fff" }}>{w.title}</Typography>
                <Typography sx={{ fontSize: `${T.small}px`, mt: 0.3 }}>{w.text}</Typography>
              </Box>
              <ArrowForwardIcon className="go" sx={{ fontSize: 22, color: "rgba(255,255,255,0.7)", transition: "color 0.2s, transform 0.2s" }} />
            </ExpCard>
          ))}
        </Box>
      </Box>

      </Box>

      {/* pinned: resume */}
      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.07)", pt: 1.5, mt: 0.5,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3 }}>
        <Typography sx={{ fontSize: `${T.body}px`, lineHeight: 1.5, flex: 1, textAlign: "left" }}>
          {RESUME_LINE}
        </Typography>
        <DownloadResume glass={inline} />
      </Box>
    </Box>
  );
}

/* ── Main modal content ── */
function AboutMeContent({ onClose, mobile, inline, compact = false, hud = false }) {
  const tabSize = inline ? { w: 168, h: 40, fontSize: HUD_TYPE.tab } : {};
  const [activeTab, setActiveTab] = useState("work");

  return (
    <Box sx={inline ? { display: "flex", flexDirection: "column", height: "100%" } : {}}>
      {/* Header: greeting + name on left, tabs on right */}
      <Box sx={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start",
        mb: inline ? "18px" : "24px",
        ...(inline ? {} : { margin: "0px 90px", mb: "4px" }),
      }}>
        <Box sx={{ textAlign: "left" }}>
          <Typography sx={{ fontSize: inline ? `${HUD_TYPE.role}px` : "14px", mb: "4px" }}>
            {ROLE_LINE}
          </Typography>
          <Typography sx={{ fontSize: mobile ? "22px" : inline ? `${HUD_TYPE.name}px` : "26px", fontWeight: 700, lineHeight: 1.1, color: PRIMARY }}>
            Akash P
          </Typography>
        </Box>

        <Box role="tablist" aria-label="Sections" sx={{ display: "flex", alignItems: "center", gap: hud ? "13px" : 1, mt: "4px" }}>
          {/* no tooltips here: the labels say it all, and a tooltip wrapper
              inside the tab list breaks it for screen readers */}
          <Tab active={activeTab === "work" ? 1 : 0} onClick={() => setActiveTab("work")} {...tabSize}>
            Work
          </Tab>
          <Tab active={activeTab === "about" ? 1 : 0} onClick={() => setActiveTab("about")} {...tabSize}>
            About Me
          </Tab>
        </Box>
      </Box>

      {/* Tab content */}
      {activeTab === "work"
        ? <WorkTab onClose={onClose} inline={inline} compact={compact} hud={hud} />
        : <AboutMeTab mobile={mobile} inline={inline} />}
    </Box>
  );
}

/* ── Export inline content (for embedding without Modal) ── */
export { AboutMeContent };

/* ── Export ── */
export default function AboutMe({ open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Modal open={open} onClose={onClose} sx={{ zIndex: 999999 }}>
      <ModalBox mobile={isMobile ? 1 : 0}>
        <AboutMeContent onClose={onClose} mobile={isMobile} />
      </ModalBox>
    </Modal>
  );
}