import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, IconButton,useMediaQuery } from "@mui/material";
import ChatbotPanel from "./ChatbotPanel";
import { useChatContext } from "./ChatContext";
import { useResizableChatbot } from "./hooks/useResizableChatbot";
import ResizeHandle from "./ResizeHandle";
import { fetchCategories, fetchProjects } from "./api/chatApi";
import CustomTooltip from "./CustomTooltip";
import { Tab } from "./AboutMe";
import InnerStage from "./hud/InnerStage";
import SlideDots from "./hud/SlideDots";
import FullScreenView from "./hud/FullScreenView";
import MobileChatDrawer from "./hud/MobileChatDrawer";
import { glassHudRectSx, spinBorderSx } from "./hud/glass";
import { pressable } from "./a11y";

const PRIMARY = "#00CD1F";

const PORTFOLIO_TABS = [
  { label: "UI/UX", aliases: ["UI/UX"] },
  { label: "Social Media", aliases: ["Social Media"] },
  { label: "Videos", aliases: ["Videos", "Video"] },
  // formerly "Print Media"; the old names still open this tab and find its projects
  { label: "Immersive", aliases: ["Print Media", "Print", "XR", "Immersive", "Immersive/VR/XR"] },
];

// UI/UX case studies, exported from the Figma slide decks (1676 × 961).
// They always fill the first two UI/UX project tabs; other categories use
// the projects API, or placeholders while it is unavailable.
const deck = (folder, n) => Array.from({ length: n }, (_, i) =>
  `/assets/images/projects/${folder}/${String(i + 1).padStart(2, "0")}.webp`);
const SC_TOPICS = ["Cover", "Project Scope", "Root Cause", "Competitor Analysis", "Gap Analysis",
  "User Research", "Survey Insights", "Stakeholder Interviews", "Affinity Mapping", "Empathy Map",
  "Problem Statement", "Ideation & Dot Voting", "Prioritisation", "Personas", "Journey Map",
  "Information Architecture & Flow", "Phase 1 Hi-fi Iteration", "Usability Testing", "Iteration",
  "Design System", "Final Solution: AI Briefing", "Final Solution: Supporting Context",
  "Secondary Capabilities", "AI Safeguards", "Traceability", "Outcomes & Next Steps", "Let's Talk"];
const FA_TOPICS = ["Cover", "The Ask", "Framework", "Research Goals", "User Interviews", "Synthesis",
  "Empathy Map", "Problem Statement", "Personas", "Research to Design", "IA & Wireframes",
  "Visual Design", "Proposed Product Page", "Final UI: Discover", "Final UI: Evaluate & Buy",
  "Validation & Next Steps", "Let's Talk"];
const CASE_STUDIES = [
  { title: "SwiftConnect", slides: deck("swiftconnect", SC_TOPICS.length), topics: SC_TOPICS },
  { title: "Chicora", slides: deck("chicora", FA_TOPICS.length), topics: FA_TOPICS },
];
const isCaseStudy = (p) => /swift|chicora|fashion/i.test(p?.title || "");
const placeholderProjects = (label, from = 1) =>
  [1, 2, 3, 4].slice(from - 1).map((n) => ({ title: `Project -${n}`, slides: [] }));
const withCaseStudies = (label, list) => {
  if (label !== "UI/UX") return list.length > 0 ? list : placeholderProjects(label);
  const rest = list.filter((p) => !isCaseStudy(p));
  return [...CASE_STUDIES, ...(rest.length > 0 ? rest : placeholderProjects(label, 3))];
};

const orbVideos = [
  "/assets/orb/Idle State.mp4",
  "/assets/orb/Listening State.mp4",
  "/assets/orb/Searching State.mp4",
  "/assets/orb/Speaking State.mp4",
];


// Fade a horizontally scrolling row only on the side(s) with more to scroll to.
function useEdgeFade(ref, deps) {
  const [edges, setEdges] = useState({ l: false, r: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setEdges({
      l: el.scrollLeft > 2,
      r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const m = `linear-gradient(to right, ${edges.l ? "transparent" : "#000"}, #000 28px, #000 calc(100% - 28px), ${edges.r ? "transparent" : "#000"})`;
  return { maskImage: m, WebkitMaskImage: m };
}

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { category: urlCategory } = useParams();
  const isMobile = useMediaQuery("(max-width:1024px)");

  const { widthPercent, isDragging, handleMouseDown, containerRef } = useResizableChatbot(30, "project_chatbot_width_percentage_v2", 30, 50, [30, 50]);

  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [mainTabs, setMainTabs] = useState(() => PORTFOLIO_TABS.map((tab) => ({
    ...tab,
    category: tab.aliases[0],
  })));
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState(0);
  const [subTab, setSubTab] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [requestedAIInput, setRequestedAIInput] = useState(null);

  useEffect(() => {
    fetchCategories().then(data => {
      const availableCategories = Array.isArray(data) ? data : [];
      const tabs = PORTFOLIO_TABS.map((tab) => ({
        ...tab,
        category: availableCategories.find((category) => tab.aliases.includes(category)) || tab.aliases[0],
      }));
      setMainTabs(tabs);

      const urlCatDecoded = decodeURIComponent(urlCategory || "");
      const index = tabs.findIndex((tab) =>
        tab.label === urlCatDecoded || tab.aliases.includes(urlCatDecoded)
      );
      setMainTab(index === -1 ? 0 : index);
    }).catch((error) => {
      console.error(error);
      const urlCatDecoded = decodeURIComponent(urlCategory || "");
      const index = PORTFOLIO_TABS.findIndex((tab) =>
        tab.label === urlCatDecoded || tab.aliases.includes(urlCatDecoded)
      );
      setMainTab(index === -1 ? 0 : index);
    });
  }, [urlCategory]);

  // Load projects when mainTab changes
  useEffect(() => {
    if (mainTabs.length > 0) {
      setLoading(true);
      fetchProjects(mainTabs[mainTab].category)
        .then(data => {
          setProjects(withCaseStudies(mainTabs[mainTab].label, Array.isArray(data) ? data : []));
          setSubTab(0);
          setSlideIndex(0);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setProjects(withCaseStudies(mainTabs[mainTab].label, []));
          setSubTab(0);
          setSlideIndex(0);
          setLoading(false);
        });
    }
  }, [mainTab, mainTabs]);

  const activeProject = projects[subTab] || null;
  const slides = activeProject && activeProject.slides && activeProject.slides.length > 0
    ? activeProject.slides
    : [];
  const hasSlides = slides.length > 0;

  // mobile: keep the selected category / project tab in view
  const mainTabsRef = useRef(null);
  const subTabsRef = useRef(null);
  useEffect(() => {
    [mainTabsRef, subTabsRef].forEach((r) => {
      const row = r.current;
      const tab = row?.querySelector('[aria-selected="true"]');
      if (!row || !tab) return;
      const left = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2;
      row.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    });
  }, [mainTab, subTab, projects.length, isMobile]);
  const mainFade = useEdgeFade(mainTabsRef, [isMobile, mainTabs.length]);
  const subFade = useEdgeFade(subTabsRef, [isMobile, projects.length]);

  const { setMode, setProjectId } = useChatContext();

  useEffect(() => {
    if (activeProject && activeProject.id) {
      setMode("web");
      setProjectId(String(activeProject.id));
    } else {
      setMode("ai");
      setProjectId("");
    }

    return () => {
      setMode("ai");
      setProjectId("");
    };
  }, [activeProject, setMode, setProjectId]);

  const orb = orbVideos[mainTab % orbVideos.length];

  const next = () => hasSlides && setSlideIndex((p) => (p + 1) % slides.length);
  const prev = () => hasSlides && setSlideIndex((p) => (p === 0 ? slides.length - 1 : p - 1));
  const lbNext = () => setLightboxIndex((p) => (p + 1) % slides.length);
  const lbPrev = () => setLightboxIndex((p) => (p === 0 ? slides.length - 1 : p - 1));
  const openLightbox = () => { setLightboxIndex(slideIndex); setLightboxOpen(true); };

  const handleAskAI = (index = slideIndex) => {
    const topics = activeProject?.topics || [];
    const topic = topics[index] && index > 0 ? topics[index] : null;
    const name = activeProject?.title || "this project";
    const cleanQuestion = topic
      ? `Tell me about the ${topic} of the ${name} case study.`
      : `Give me an overview of the ${name} case study.`;
    setRequestedAIInput({ text: cleanQuestion, timestamp: Date.now() });
    if (isMobile) setMobileChatOpen(true);
  };


  // mobile / tablet expanded slide: Esc closes it
  useEffect(() => {
    if (!lightboxOpen || !isMobile) return undefined;
    const n = slides.length || 1;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowLeft") setLightboxIndex((p) => (p === 0 ? n - 1 : p - 1));
      else if (e.key === "ArrowRight") setLightboxIndex((p) => (p + 1) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, isMobile, slides.length]);

  const lightbox = (
    <>
      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Box role="dialog" aria-modal="true" aria-label="Expanded slide" sx={{
          position: "fixed", inset: 0, zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          px: { xs: 2, md: 0 },
          // dim and blur everything behind, so only the expanded slide is in focus
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          animation: "lbIn 0.25s ease-out",
          "@keyframes lbIn": { from: { opacity: 0 }, to: { opacity: 1 } },
        }} onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false); }}>
          <Box sx={{
            position: "relative",
            maxWidth: "90vw", maxHeight: "90vh",
            borderRadius: "10px",
            border: "1px solid transparent",
            background: `
              linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
              linear-gradient(11deg, #00CD1F 0%, #8C8C8C 6%, #8C8C8C 95%, #00CD1F 100%) border-box
            `,
            boxShadow: "0 0 2px rgba(0,255,133,.25), inset 0 0 1px rgba(255,255,255,.05)",
          }}>
            <IconButton onClick={lbPrev} sx={{ position: "absolute", top: "50%", left: "0px", transform: "translateY(-50%)", zIndex: 2, p: 0 }}>
              <img src="/assets/icons/right.svg" alt="prev" style={{ width: isMobile ? 50 : undefined }} />
            </IconButton>
            <Box sx={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}>
              <img src={slides[lightboxIndex]} alt={`slide ${lightboxIndex + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </Box>
            <IconButton onClick={lbNext} sx={{ position: "absolute", top: "50%", right: "0px", transform: "translateY(-50%)", zIndex: 2, p: 0 }}>
              <img src="/assets/icons/left.svg" alt="next" style={{ width: isMobile ? 50 : undefined }} />
            </IconButton>
            <CustomTooltip title="Minimize" placement="top">
              <Box
                component="img"
                src="/assets/icons/minimize.png"
                alt="minimize"
                onClick={() => setLightboxOpen(false)}
                sx={{ position: "absolute", bottom: 10, right: 10, zIndex: 2, cursor: "pointer" }}
              />
            </CustomTooltip>
          </Box>
          {/* same sliding dots as the desktop carousel */}
          <SlideDots count={slides.length} current={lightboxIndex} onSelect={setLightboxIndex}
            view={270} sx={{ position: "relative", mt: 2, flexShrink: 0 }} />
        </Box>
      )}
    </>
  );

  const pageBg = {
    width: "100vw", height: "100vh", overflow: "hidden", position: "relative",
    backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12)), url('/assets/images/bg-images/bg.jpg')",
    backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
    color: "#fff",
  };

  // Desktop: the Figma frame "Inner_Page_For Claude"
  if (!isMobile) {
    return (
      <Box sx={pageBg}>
        <InnerStage
          tabs={mainTabs.map((t) => t.label)}
          activeTab={mainTab}
          onSelectTab={(i) => navigate(`/portfolio/${encodeURIComponent(mainTabs[i].label)}`)}
          projects={projects}
          activeProject={activeProject}
          subTab={subTab}
          onSelectProject={(i) => { setSubTab(i); setSlideIndex(0); }}
          loading={loading}
          slides={slides}
          slideIndex={slideIndex}
          onSlide={setSlideIndex}
          onPrev={prev}
          onNext={next}
          onAskAI={handleAskAI}
          onExpand={openLightbox}
          onBack={() => navigate("/")}
          orb={orb}
          requestedInput={requestedAIInput}
          keysDisabled={lightboxOpen}
        />
        {/* expand → Figma "Full Scree Mode_For Claude"; closing keeps the slide */}
        {lightboxOpen && hasSlides && (
          <FullScreenView
            slides={slides}
            index={lightboxIndex}
            onIndex={setLightboxIndex}
            onClose={() => { setSlideIndex(lightboxIndex); setLightboxOpen(false); }}
            title={activeProject?.title}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{
      width: "100vw", height: "100vh", overflow: "hidden",
      // phones: the visible height (browser toolbars excluded) where supported
      "@supports (height: 100dvh)": { height: "100dvh" },
      backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12)), url('/assets/images/bg-images/bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex", flexDirection: "column",
      boxSizing: "border-box",
      p: { xs: "20px 16px", md: "12.5vh 10.5vw" },
      // keep clear of the notch / status bar and the home indicator
      // extra breathing room above the tabs on phones / tablets
      pt: { xs: "max(32px, calc(env(safe-area-inset-top) + 16px))" },
      pb: { xs: "max(16px, env(safe-area-inset-bottom))" },
      color: "#fff",
      position: "relative",
    }}>
      {/* MAIN TABS */}
      <Box sx={{
        display: "flex",
        width: "100%",
        pr: { xs: 0, md: `${widthPercent}%` },
        // phones / tablets: the tabs reserve space below for their tail, so
        // line the back button up with the tab bodies, not the whole row
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "flex-start",
        gap: "12px",
        mb: isMobile ? "8px" : "0px",
        flexShrink: 0,
        position: "relative",
        zIndex: 2,
      }}>
        {/* Back Button */}
        <CustomTooltip title="Back to Home" placement="top">
          {/* back: the same glass arrow button as the desktop category page */}
          <Box component="button" onClick={() => navigate("/")} aria-label="Back to home" sx={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, p: 0, boxSizing: "border-box",
            cursor: "pointer",
            borderRadius: "10px",
            border: "1px solid #8F8F8F",
            // darker glass so it reads over the bright ceiling lights too
            background: "rgba(12,14,13,0.62)",
            backdropFilter: "blur(13.55px)", WebkitBackdropFilter: "blur(13.55px)",
            boxShadow: "-1px 3px 13px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
            color: "#fff",
            transition: "border-color 0.25s ease, background 0.25s ease",
            "&:hover": { borderColor: "rgba(255,255,255,0.85)", background: "rgba(30,34,32,0.7)" },
            flexShrink: 0,
          }}>
            <svg width="16" height="13" viewBox="0 0 16 13" aria-hidden>
              <path d="M15 6.5H1.5M6.5 1 1 6.5 6.5 12" fill="none" stroke="#fff" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Box>
        </CustomTooltip>

        {isMobile && <Box ref={mainTabsRef} role="tablist" aria-label="Categories" sx={{
          display: "flex",
          gap: { xs: "10px", md: "0px" },
          overflowX: { xs: "auto", md: "visible" },
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          // soft fade on the side(s) with more tabs to swipe to
          ...mainFade,
        }}>
          {mainTabs.map((tab, i) => {
            const isActive = mainTab === i;

            // ---- MOBILE: speech-bubble tabs — pure CSS (border-radius + clip-path), no SVG ----
            if (isMobile) {
              return (
                <Box
                  key={i}
                  onClick={() => navigate(`/portfolio/${encodeURIComponent(tab.label)}`)}
                  {...pressable(() => navigate(`/portfolio/${encodeURIComponent(tab.label)}`), undefined, "tab")}
                  aria-selected={isActive}
                  sx={{
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                    mb: "14px", // reserve space below for the tail
                  }}
                >
                  {/* Shape layer: rounded pill body */}
                  <Box
                    sx={{
                      borderRadius: isActive ? "6px" : "1px",
                      background: isActive ? PRIMARY : "rgba(30,30,30,0.92)",
                      border: "none",
                      boxShadow: isActive
                        ? "0 6px 10px rgba(0,205,31,0.45)"
                        : "0 2px 4px rgba(0,0,0,0.35)",
                      px: "18px",
                      // same 44px height as the back button beside it
                      height: "44px", boxSizing: "border-box",
                      display: "flex", alignItems: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: "13px",
                        fontWeight: isActive ? 700 : 500,
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        userSelect: "none",
                        color: isActive ? "#080808" : "rgba(255,255,255,0.78)",
                        transition: "color 0.2s",
                      }}
                    >
                      {tab.label}
                    </Box>
                  </Box>

                  {/* Tail layer: small square rotated 45deg, centered under the pill */}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: "-6px",
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: "14px",
                      height: "14px",
                      borderRadius: "1px",
                      background: isActive ? PRIMARY : "",
                      border: "none",
                      borderTop: "none",
                      borderLeft: "none",
                      zIndex: -1,
                    }}
                  />
                </Box>
              );
            }

            // ---- DESKTOP: original overlapping chevron tabs (unchanged) ----
            const CLIP = "polygon(24px 0%, calc(100% - 24px) 0%, 100% 100%, 0% 100%)";
            return (
              <Box
                key={i}
                onClick={() => navigate(`/portfolio/${encodeURIComponent(tab.label)}`)}
                sx={{
                  position: "relative",
                  cursor: "pointer",
                  padding: "1px 1px 0",
                  flexShrink: 0,
                  background: isActive
                    ? PRIMARY
                    : "linear-gradient(100deg, rgba(0,205,31,0.8), rgba(186,186,186,0.58) 20%, rgba(186,186,186,0.58) 80%, rgba(0,205,31,0.8))",
                  clipPath: CLIP,
                  zIndex: isActive ? 10 : i + 1,
                  marginLeft: i === 0 ? "0px" : "-24px",
                  transition: "all 0.2s",
                  filter: isActive ? "drop-shadow(0 -5px 14px rgba(0,205,31,0.2))" : "none",
                  "&:hover": {
                    filter: isActive ? "drop-shadow(0 -5px 14px rgba(0,205,31,0.28))" : "brightness(1.18)",
                  },
                }}
              >
                <Box sx={{
                  clipPath: CLIP,
                  background: isActive
                    ? PRIMARY
                    : "linear-gradient(105deg, rgba(33,33,33,0.96), rgba(41,41,41,0.9))",
                  px: { xs: "28px", md: "44px" },
                  py: "13px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: { xs: "13px", md: "15px" },
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#080808" : "rgba(255,255,255,0.82)",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  "&:hover": { color: isActive ? "#080808" : "#fff" }
                }}>
                  {tab.label}
                </Box>
              </Box>
            );
          })}
        </Box>}
      </Box>

      {/* CONTENT ROW */}
      <Box ref={containerRef} sx={{
        display: "flex",
        flex: 1,
        gap: "0px",
        minHeight: 0,
        overflow: "visible",
        position: "relative",
      }}>

        {/* LEFT PANEL */}
        <Box sx={{
          flex: 1,
          minWidth: 0,
          display: "flex", flexDirection: "column",
          // same dark liquid glass and grey→green edge as the home HUDs
          ...glassHudRectSx,
          ...spinBorderSx(1),
          borderRadius: "20px",
          overflow: "hidden",
          minHeight: 0,
        }}>

          {/* SUB TABS */}
          <Box ref={subTabsRef} role="tablist" aria-label="Projects" sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2, pt: 2, pb: 1,
            flexShrink: 0,
            overflowX: { xs: "auto", md: "visible" },
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            ...(isMobile ? subFade : {}),
          }}>
            {!loading && projects.length === 0 && (
              <Box sx={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", p: 1 }}>No projects found for this category.</Box>
            )}
            {projects.map((proj, i) => {
              const isActive = subTab === i;

              // Mobile: use AboutMe Tab component (SVG speech bubble)
              if (isMobile) {
                return (
                  <Tab
                    key={i}
                    active={isActive ? 1 : 0}
                    onClick={() => { setSubTab(i); setSlideIndex(0); }}
                  >
                    {proj.title}
                  </Tab>
                );
              }

              // Desktop: the home page's Work / About Me tab, as in the Figma template
              return (
                <Tab
                  key={i}
                  active={isActive ? 1 : 0}
                  w={132}
                  h={36}
                  fontSize={13}
                  onClick={() => { setSubTab(i); setSlideIndex(0); }}
                >
                  {proj.title}
                </Tab>
              );
            })}
          </Box>

          {/* SLIDER */}
          <Box sx={{ position: "relative", flex: 1, display: "flex", alignItems: "center", px: { xs: 0.5, md: 1 }, minHeight: 0 }}>
            {/* Project without slides yet */}
            {!loading && activeProject && !hasSlides && (
              <Box sx={{
                flex: 1, height: "100%", minHeight: 200, m: { xs: 1, md: 2 },
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                borderRadius: "12px",
                border: "1px dashed rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.02)",
                textAlign: "center",
              }}>
                <Box sx={{ fontSize: { xs: "16px", md: "20px" }, color: "#fff" }}>{activeProject.title}</Box>
                <Box sx={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>Case study coming soon</Box>
              </Box>
            )}

            {/* Desktop: Show slider with navigation */}
            {!isMobile && hasSlides && (
              <>
                <IconButton onClick={prev} sx={{ position: "absolute", left: 8, zIndex: 2, p: 0 }}>
                  <img src="/assets/icons/right.svg" alt="prev" />
                </IconButton>

                <Box sx={{ flex: 1, display: "flex", alignItems: "center", p: 0, height: "100%" }}>
                  <Box sx={{
                    flex: "0 0 100%",
                    position: "relative",
                  }}>
                    <img
                      src={slides[slideIndex]}
                      alt={`slide ${slideIndex + 1}`}
                      style={{ width: "100%", display: "block", borderRadius: "12px", objectFit: "contain" }}
                    />
                    <Box sx={{ position: "absolute", bottom: 10, right: 10, display: "flex", flexDirection: "column", gap: "6px", zIndex: 3 }}>
                      {/* AI icon — desktop only */}
                      <CustomTooltip title="Ask To AI" placement="top">
                        <Box onClick={() => handleAskAI(slideIndex)} component="img" src="/assets/icons/AI.png" alt="Ask To AI" sx={{ cursor: "pointer", marginLeft: "12px", width: "40px" }} />
                      </CustomTooltip>
                      <CustomTooltip title="Maximize" placement="top">
                        <Box onClick={openLightbox} component="img" src="/assets/icons/extend.png" alt="Maximize" sx={{ cursor: "pointer"}} />
                      </CustomTooltip>
                    </Box>
                  </Box>
                </Box>

                <IconButton onClick={next} sx={{ position: "absolute", right: 8, zIndex: 2, p: 0 }}>
                  <img src="/assets/icons/left.svg" alt="next" />
                </IconButton>
              </>
            )}

            {/* Mobile: Show all images stacked vertically */}
            {isMobile && hasSlides && (
              <Box sx={{
                width: "100%",
                height: "100%",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                px: 1,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "rgba(0,205,31,0.4)", borderRadius: "2px" },
              }}>
                {slides.map((slide, index) => (
                  <Box key={index} sx={{ position: "relative", flexShrink: 0 }}>
                    <img
                      src={slide}
                      alt={`slide ${index + 1}`}
                      style={{ width: "100%", display: "block", borderRadius: "12px", objectFit: "contain" }}
                    />
                    <Box sx={{ position: "absolute", bottom: 10, right: 10, display: "flex", flexDirection: "column", gap: "6px", zIndex: 3 }}>
                      <CustomTooltip title="Ask To AI" placement="top">
                        <Box onClick={() => handleAskAI(index)} component="img" src="/assets/icons/AI.png" alt="Ask To AI" sx={{ cursor: "pointer", width: "36px" }} />
                      </CustomTooltip>

                      <CustomTooltip title="Maximize" placement="top">
                        {/* extend.svg is a 44px button inside a 70px canvas (room for its
                            shadow), so scale and offset it to the same 36px as the AI button */}
                        <Box onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                          {...pressable(() => { setLightboxIndex(index); setLightboxOpen(true); }, "Maximize")}
                          sx={{ position: "relative", width: "36px", height: "36px", cursor: "pointer" }}>
                          <Box component="img" src="/assets/images/extend.svg" alt="" aria-hidden sx={{
                            position: "absolute", width: `${36 * 70 / 44}px`, maxWidth: "none",
                            left: `${-36 * 14 / 44}px`, top: `${-36 * 10 / 44}px`, pointerEvents: "none",
                          }} />
                        </Box>
                      </CustomTooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* DOTS - Desktop only */}
          {!isMobile && hasSlides && (
            <Box sx={{ display: "flex", gap: 1, py: 4, justifyContent: "center", flexShrink: 0 }}>
              {slides.map((_, i) => (
                <Box key={i} onClick={() => setSlideIndex(i)} sx={{
                  width: 10, height: 10, borderRadius: "50%", cursor: "pointer",
                  transition: "all 0.3s",
                  background: i === slideIndex ? PRIMARY : "transparent",
                  border: i === slideIndex ? `2px solid ${PRIMARY}` : "2px solid #555",
                }} />
              ))}
            </Box>
          )}
        </Box>

        {/* DESKTOP: resizable chatbot */}
        {!isMobile && (
          <>
            <ResizeHandle onMouseDown={handleMouseDown} isDragging={isDragging} />
            <ChatbotPanel
              orb={orb}
              chips={["View Case Study", "About Akash"]}
              wrapperSx={{ width: `${widthPercent}%`, flexShrink: 0, minWidth: 0, height: "100%" }}
              requestedInput={requestedAIInput}
              hud
              fadeTop
            />
          </>
        )}

        {/* MOBILE: green edge tab, short hint and full-screen chat drawer */}
        {isMobile && (
          <MobileChatDrawer
            chips={["View Case Study", "About Akash"]}
            requestedInput={requestedAIInput}
            open={mobileChatOpen}
            onOpenChange={setMobileChatOpen}
          />
        )}
      </Box>

      {lightbox}
    </Box>
  );
}