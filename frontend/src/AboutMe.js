import React, { useState, useEffect } from "react";
import { Box, Typography, Modal, useMediaQuery, useTheme} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { PRIMARY, primaryAlpha } from "./theme";
import CustomTooltip from "./CustomTooltip";
import { fetchCategories } from "./api/chatApi";
import DownloadResume from "./DownloadResume";

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

// Speech-bubble tab using SVG stroke for pixel-perfect border + curved pointer
export const Tab = React.forwardRef(({ active, onClick, children }, ref) => {
  const W = 156, H = 38, R = 4;
  const pw = 11, ph = 14;
  const cx = W / 2;
  const s = active ? 0.85 : 0;
  const P = 2;

  // Full shape path: rounded rect + curved U-notch at bottom center
  const path = [
    `M ${P + R} ${P}`,
    `H ${P + W - R}`,
    `Q ${P + W} ${P} ${P + W} ${P + R}`,
    `V ${P + H - R}`,
    `Q ${P + W} ${P + H} ${P + W - R} ${P + H}`,
    `H ${P + cx + pw}`,
    `C ${P + cx + pw} ${P + H} ${P + cx + 6} ${P + H + ph - 2} ${P + cx} ${P + H + ph}`,
    `C ${P + cx - 6} ${P + H + ph - 2} ${P + cx - pw} ${P + H} ${P + cx - pw} ${P + H}`,
    `H ${P + R}`,
    `Q ${P} ${P + H} ${P} ${P + H - R}`,
    `V ${P + R}`,
    `Q ${P} ${P} ${P + R} ${P} Z`,
  ].join(" ");

  const vw = W + P * 2;
  const vh = H + ph + P * 2;

  return (
    <Box
      ref={ref}
      onClick={onClick}
      sx={{
        position: "relative",
        width: `${vw}px`,
        height: `${vh}px`,
        cursor: "pointer",
        flexShrink: 0,
        margin: `${P}px`,
        "&:hover .tab-label": { color: active ? PRIMARY : "#fff" },
      }}
    >
      <svg
        width={vw} height={vh}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="inactive-tab-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#292929" />
            <stop offset="1" stopColor="#222222" />
          </linearGradient>
          {/* Active border: diagonal green glow from top-right corner to
              bottom-left corner, grey through the middle — matches the
              reference screenshot and the same corner-glow pattern used
              elsewhere in the app (social pill, panel borders, etc). */}
          <linearGradient
            id="active-tab-border"
            x1="100%"
            y1="10%"
            x2="0%"
            y2="100%"
          >
            <stop offset="6%" stop-color="#00CD1F" />
            <stop offset="6%" stop-color="#8C8C8C" />
            <stop offset="95%" stop-color="#8C8C8C" />
            <stop offset="10%" stop-color="#00CD1F" />
          </linearGradient>
          <filter id="active-tab-glow" x="-20%" y="-25%" width="140%" height="180%">
            <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#00CD1F" floodOpacity="0.24" />
          </filter>
        </defs>
        <path
          d={path}
          fill={active ? "#222222" : "url(#inactive-tab-fill)"}
          className="tab-shape"
          stroke={active ? "url(#active-tab-border)" : "transparent"}
          strokeWidth={s}
        />
      </svg>
      <Box className="tab-label" sx={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        height: `${H + P * 2}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: 500,
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
];


export const ICON_MAP = {
  "UI/UX": "/assets/icons/UX.svg",
  "Social Media": "/assets/icons/social-media.svg",
  "Video": "/assets/icons/Video.svg",
  "Videos": "/assets/icons/Video.svg",
  "Print Media": "/assets/icons/print-designs.svg",
  "Print-Designs": "/assets/icons/print-designs.svg",
  "XR": "/assets/icons/XR.svg",
};

export const DEFAULT_WORK_CATEGORIES = [
  { label: "UI/UX", icon: "/assets/icons/UX.svg" },
  { label: "Social Media", icon: "/assets/icons/social-media.svg" },
  { label: "Video", icon: "/assets/icons/Video.svg" },
  { label: "Print Media", icon: "/assets/icons/print-designs.svg" },
];

/* ── Category card with exact Figma SVG shape ── */
export function CategoryCard({ cat, onClick, compact }) {
  const [hovered, setHovered] = useState(false);
  const safeId = cat.label.replace(/\s+/g, "-");

  // Exact path from Figma with-hover.svg (scaled to fit, viewBox 0 0 224 214)
  // The shape path (fill area):
  const shapePath = "M201 11C201 8.23858 198.761 6 196 6H20C17.2386 6 15 8.23858 15 11V169.007C15 171.768 17.2386 174.007 20 174.007H48.2869C49.6135 174.007 50.8857 174.534 51.8235 175.472L56.8827 180.534C57.8204 181.473 59.0927 182 60.4193 182H169.959C171.285 182 172.558 181.473 173.496 180.534L178.088 175.937C179.026 174.998 180.299 174.471 181.626 174.471H189.963C192.725 174.471 194.963 172.232 194.963 169.471V54.3589C194.963 53.0337 195.49 51.7627 196.426 50.8251L199.537 47.711C200.474 46.7734 201 45.5024 201 44.1772V11Z";

  // Stroke path (slightly inset, from with-hover.svg)
  const strokePath = "M20 6.5H196C198.485 6.5 200.5 8.51472 200.5 11V44.1768C200.5 45.3694 200.026 46.5137 199.184 47.3574L196.072 50.4717C195.042 51.503 194.464 52.9017 194.464 54.3594V169.471C194.464 171.956 192.449 173.97 189.964 173.971H181.626C180.166 173.971 178.766 174.551 177.734 175.584L173.142 180.181C172.298 181.025 171.153 181.5 169.959 181.5H60.4189C59.2251 181.5 58.0802 181.025 57.2363 180.181L52.1768 175.119C51.1453 174.087 49.7463 173.507 48.2871 173.507H20C17.5148 173.507 15.5002 171.492 15.5 169.007V11C15.5 8.51472 17.5147 6.5 20 6.5Z";

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        width: compact ? "100%" : "170px",
        height: compact ? "auto" : "170px",
        aspectRatio: compact ? "1.7 / 1" : undefined,
      }}
    >
      {/* SVG card shape — exact Figma paths */}
      <svg
        width="100%" height="100%"
        viewBox="0 0 216 190"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {/* Hover stroke gradient — exact from Figma */}
          <linearGradient id={`grad-hover-${safeId}`} x1="16.9732" y1="11.0129" x2="226.955" y2="108.074" gradientUnits="userSpaceOnUse">
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
          fill={hovered ? "rgba(14,20,14,0.97)" : "rgba(18,22,18,0.92)"}
          style={{ transition: "fill 0.25s" }}
        />

        {/* Border — grey when default, gradient when hover */}
        <path
          d={strokePath}
          fill="none"
          stroke={hovered ? `url(#grad-hover-${safeId})` : "rgba(255,255,255,0.12)"}
          strokeWidth="1"
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
        p: "20px",
      }}>
        <Box
          component="img"
          src={cat.icon}
          alt={cat.label}
          sx={{
            width: 40, height: 40, objectFit: "contain",
            filter: hovered ? "brightness(0) invert(1)" : "brightness(0) invert(0.5)",
            transition: "filter 0.2s",
            mb: "4px",
          }}
        />
        <Typography sx={{
          color: hovered ? "#fff" : "rgba(255,255,255,0.5)",
          fontSize: "14px", fontWeight: 500,
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
function WorkTab({ onClose, inline, compact }) {
  const navigate = useNavigate();
  const [workCategories, setWorkCategories] = useState(DEFAULT_WORK_CATEGORIES);

  useEffect(() => {
    fetchCategories()
      .then(data => {
        if (data && data.length > 0) {
          setWorkCategories(data.map(cat => ({
            label: cat,
            icon: ICON_MAP[cat] || "/assets/icons/UX.svg",
          })));
        }
      })
      .catch(() => { });
  }, []);

  const handleCategoryClick = (label) => {
    if (onClose) onClose();
    navigate(`/portfolio/${encodeURIComponent(label)}`);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, justifyContent: "center" }}>
      {/* Category cards */}
      <Box sx={{
        display: compact ? "grid" : "flex",
        gridTemplateColumns: compact ? "repeat(2, minmax(0, 1fr))" : undefined,
        columnGap: compact ? "18px" : 0,
        rowGap: compact ? "16px" : 0,
        flexWrap: { xs: "wrap", md: "nowrap" },
        gap: "0px",
        mt: "28px",
        flex: "0 0 auto",
      }}>
        {workCategories.map((cat) => (
          <CategoryCard key={cat.label} cat={cat} compact={compact} onClick={() => handleCategoryClick(cat.label)} />
        ))}
      </Box>

      {/* Bio + Download Resume */}
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, mt: "48px", alignItems: "center" }}>
        <Typography sx={{ fontSize: "13px", lineHeight: 1.75, textAlign: "left", flex: 1, maxWidth: "450px" }}>
          Designing immersive, intuitive experiences, focused on clarity         </Typography>
        <DownloadResume />
      </Box>
    </Box>
  );
}

/* ── About Me tab content ── */
function AboutMeTab({ mobile, inline }) {
  const pad = inline ? "20px 0px" : "40px 90px";

  return (
    <Box sx={{ padding: pad }}>
      {/* Experience label */}
      <Typography sx={{ fontSize: "12px", letterSpacing: "1.2px", mb: 1.5, textAlign: 'left' }}>
        Experience
      </Typography>

      {/* Experience cards – horizontal scroll */}
      <Box sx={{
        display: "flex", gap: 1.5, overflowX: "auto", pb: 1, mb: 2.5,
        "&::-webkit-scrollbar": { height: "3px" },
        textAlign: "left",
        "&::-webkit-scrollbar-thumb": { background: primaryAlpha(0.25), borderRadius: "4px" },
      }}>
        {experiences.map((exp) => (
          <ExpCard key={exp.company}>
            <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
              {exp.company}
            </Typography>
            <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#fff", mt: 0.2, whiteSpace: "nowrap" }}>
              {exp.role}
            </Typography>
            <Typography sx={{ fontSize: "11px", mt: 0.3, whiteSpace: "nowrap" }}>
              {exp.period}
            </Typography>
          </ExpCard>
        ))}
      </Box>

      {/* Cert card */}
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
        <Box component="img" src="/assets/icons/UX-Certification.svg" alt="cert" sx={{ width: 40, height: 40, flexShrink: 0 }} />
        <Box sx={{ textAlign: "left" }}>
          <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>
            UI/UX Design with Generative AI
          </Typography>
          <Typography sx={{ fontSize: "11px", mt: 0.3 }}>
            International Institute of Information Technology Bangalore (IIIT-B)
          </Typography>
        </Box>
      </CertCard>

      {/* Divider */}
      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.07)", mb: 2 }} />

      {/* Skills rows + Download Resume */}
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
        <Typography sx={{ fontSize: "13px", lineHeight: 1.8, flex: 1, textAlign: "left" }}>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's.
        </Typography>
        <DownloadResume />
      </Box>
    </Box>
  );
}

/* ── Main modal content ── */
function AboutMeContent({ onClose, mobile, inline, compact = false }) {
  const [activeTab, setActiveTab] = useState("work");

  return (
    <Box sx={inline ? { display: "flex", flexDirection: "column", height: "100%" } : {}}>
      {/* Header: greeting + name on left, tabs on right */}
      <Box sx={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start",
        mb: inline ? "24px" : "24px",
        ...(inline ? {} : { margin: "0px 90px", mb: "4px" }),
      }}>
        <Box sx={{ textAlign: "left" }}>
          <Typography sx={{ fontSize: "14px", mb: "4px" }}>
            Welcome to the Portfolio!
          </Typography>
          <Typography sx={{ fontSize: mobile ? "22px" : "26px", fontWeight: 700, lineHeight: 1.1, color: PRIMARY }}>
            Akash P
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: "4px" }}>
          <CustomTooltip title="View My Work" placement="top">
             <Tab active={activeTab === "work" ? 1 : 0} onClick={() => setActiveTab("work")}>
            Work
          </Tab>
          </CustomTooltip>
         
          <CustomTooltip title="View About Me" placement="top">
            <Tab active={activeTab === "about" ? 1 : 0} onClick={() => setActiveTab("about")}>
              About Me
            </Tab>
          </CustomTooltip>
        </Box>
      </Box>

      {/* Tab content */}
      {activeTab === "work"
        ? <WorkTab onClose={onClose} inline={inline} compact={compact} />
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