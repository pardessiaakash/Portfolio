import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, useMediaQuery } from "@mui/material";
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
import { pressable, srOnly } from "./a11y";
import SlideFigure from "./hud/SlideFigure";
import EmptyCategory from "./hud/EmptyCategory";
import { SC_TEXT, FA_TEXT, SC_TOPICS, FA_TOPICS } from "./caseStudyText";
import { SITE } from "./siteConfig";
import { setPageMeta } from "./pageMeta";
import { COMPACT_QUERY } from "./breakpoints";

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
const CASE_STUDIES = [
  { title: "SwiftConnect", slug: "swiftconnect", slides: deck("swiftconnect", SC_TOPICS.length),
    topics: SC_TOPICS, text: SC_TEXT, summary: "AI-assisted support desk: case study" },
  { title: "Chicora", slug: "chicora", slides: deck("chicora", FA_TOPICS.length),
    topics: FA_TOPICS, text: FA_TEXT, summary: "Fashion shopping app: case study" },
];
const isCaseStudy = (p) => /swift|chicora|fashion/i.test(p?.title || "");
export const projectSlug = (p) => p?.slug || String(p?.title || "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Only real projects are listed: no "Project -3" placeholders. Categories
// without projects yet get an honest empty state instead (see EmptyCategory).
const withCaseStudies = (label, list) => {
  const real = list.filter((p) => !isCaseStudy(p) && Array.isArray(p.slides) && p.slides.length > 0);
  return label === "UI/UX" ? [...CASE_STUDIES, ...real] : real;
};
// last slide of a case study is the "Let's talk" call to action
const isCtaSlide = (project, i) => !!project?.text && i === project.slides.length - 1;

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
  // ?project=chicora&slide=5 opens that project and slide (shareable links)
  const [searchParams, setSearchParams] = useSearchParams();
  const wanted = useRef({ project: searchParams.get("project"), slide: parseInt(searchParams.get("slide"), 10) });
  const isMobile = useMediaQuery(COMPACT_QUERY);

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

  // the link's project / slide only applies to the category it was opened in
  const firstCat = useRef(urlCategory);
  useEffect(() => {
    if (urlCategory !== firstCat.current) { wanted.current = {}; firstCat.current = null; }
  }, [urlCategory]);

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
      if (!error?.offline) console.error(error);
      const urlCatDecoded = decodeURIComponent(urlCategory || "");
      const index = PORTFOLIO_TABS.findIndex((tab) =>
        tab.label === urlCatDecoded || tab.aliases.includes(urlCatDecoded)
      );
      setMainTab(index === -1 ? 0 : index);
    });
  }, [urlCategory]);

  // Load projects when mainTab changes
  useEffect(() => {
    let alive = true;   // ignore a slower, older request
    if (mainTabs.length > 0) {
      setLoading(true);
      fetchProjects(mainTabs[mainTab].category)
        .then(data => Array.isArray(data) ? data : [])
        .catch((err) => {
          if (!err?.offline) console.error(err);
          return [];
        })
        .then((list) => {
          if (!alive) return;
          const items = withCaseStudies(mainTabs[mainTab].label, list);
          // open the project / slide named in the link, once
          const w = wanted.current;
          const pi = w.project ? items.findIndex((p) => projectSlug(p) === w.project) : -1;
          const proj = items[pi === -1 ? 0 : pi];
          const si = proj && w.slide > 0 ? Math.min(w.slide, proj.slides.length) - 1 : 0;
          setProjects(items);
          setSubTab(pi === -1 ? 0 : pi);
          setSlideIndex(si);
          setLoading(false);
          if (si > 0) pendingScroll.current = si;
        });
    }
    return () => { alive = false; };
  }, [mainTab, mainTabs]);

  const activeProject = projects[subTab] || null;
  const slides = activeProject && activeProject.slides && activeProject.slides.length > 0
    ? activeProject.slides
    : [];
  const hasSlides = slides.length > 0;
  const pendingScroll = useRef(0);
  // mobile: the stacked slide list, which slide is in view, and jumping to one
  const slidesListRef = useRef(null);
  const [visibleSlide, setVisibleSlide] = useState(0);
  const jumpingUntil = useRef(0);   // ignore the observer while gliding to a slide
  const scrollToSlide = (i) => {
    jumpingUntil.current = performance.now() + 900;
    setSlideIndex(i);
    const list = slidesListRef.current;
    const el = list?.querySelector(`[data-slide="${i}"]`);
    if (list && el) {
      const top = list.scrollTop + el.getBoundingClientRect().top - list.getBoundingClientRect().top - 4;
      list.scrollTo({ top, behavior: "smooth" });
    }
    setVisibleSlide(i);
  };
  useEffect(() => {
    const list = slidesListRef.current;
    if (!isMobile || !list || !hasSlides) return undefined;
    if (pendingScroll.current) {
      const i = pendingScroll.current; pendingScroll.current = 0;
      requestAnimationFrame(() => scrollToSlide(i));
    } else setVisibleSlide(0);
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (seen && performance.now() > jumpingUntil.current) {
        const i = Number(seen.target.dataset.slide);
        setVisibleSlide(i); setSlideIndex(i);
      }
    }, { root: list, threshold: [0.6] });
    list.querySelectorAll("[data-slide]").forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, activeProject, hasSlides]);
  const category = mainTabs[mainTab]?.label ?? "";

  // keep the address bar in step: /portfolio/UI%2FUX?project=chicora&slide=5
  useEffect(() => {
    if (loading) return;
    const next = {};
    if (activeProject) next.project = projectSlug(activeProject);
    if (slideIndex > 0) next.slide = String(slideIndex + 1);
    const cur = Object.fromEntries(searchParams.entries());
    if (JSON.stringify(cur) !== JSON.stringify(next)) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, activeProject, slideIndex]);

  // browser tab title and description per project
  useEffect(() => {
    if (activeProject) {
      setPageMeta(`${activeProject.title} case study · ${SITE.name}`,
        `${activeProject.title}: ${activeProject.summary || `${category} project`} by ${SITE.name}, ${SITE.role}.`);
    } else if (category) {
      setPageMeta(`${category} · ${SITE.name}`, `${category} work by ${SITE.name}, ${SITE.role}.`);
    }
  }, [activeProject, category]);
  const seeUiux = () => navigate(`/portfolio/${encodeURIComponent("UI/UX")}`);

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

  // mobile / tablet expanded slide: zoom in to read, or read the slide as text
  const [lbZoom, setLbZoom] = useState(false);
  const [lbText, setLbText] = useState(false);
  useEffect(() => { setLbZoom(false); if (!lightboxOpen) setLbText(false); }, [lightboxIndex, lightboxOpen]);
  const lastTap = useRef(0);
  const onLbTouchEnd = (e) => {
    if (e.touches?.length) return;
    const t = Date.now();
    if (t - lastTap.current < 300) { setLbZoom((z) => !z); lastTap.current = 0; } else lastTap.current = t;
  };
  const lbClose = () => { setLightboxOpen(false); setLbText(false); };
  const lbSlideText = activeProject?.text?.[lightboxIndex];
  const lbBtn = (on) => ({
    height: 44, px: "16px", display: "inline-flex", alignItems: "center", gap: "8px",
    borderRadius: "10px", border: `1px solid ${on ? PRIMARY : "#8F8F8F"}`,
    background: on ? "rgba(0,205,31,0.12)" : "rgba(12,14,13,0.62)",
    backdropFilter: "blur(13.55px)", WebkitBackdropFilter: "blur(13.55px)",
    color: on ? PRIMARY : "#fff", fontSize: 14, fontFamily: "inherit", cursor: "pointer",
  });

  const lightbox = (
    <>
      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Box role="dialog" aria-modal="true" aria-label={`${activeProject?.title ?? "Project"}: slide ${lightboxIndex + 1} of ${slides.length}`} sx={{
          position: "fixed", inset: 0, zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          px: { xs: 2, md: 4 },
          pt: "max(16px, env(safe-area-inset-top))", pb: "max(16px, env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          // dim and blur everything behind, so only the expanded slide is in focus
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          animation: "lbIn 0.25s ease-out",
          "@keyframes lbIn": { from: { opacity: 0 }, to: { opacity: 1 } },
        }} onClick={(e) => { if (e.target === e.currentTarget) lbClose(); }}>
          {/* top bar: where you are + close */}
          <Box sx={{ width: "100%", maxWidth: 960, display: "flex", alignItems: "center", gap: "12px", mb: "12px", flexShrink: 0 }}>
            <Box sx={{ flex: 1, minWidth: 0, fontSize: 14, color: "rgba(255,255,255,0.86)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Box component="span" sx={{ color: PRIMARY, fontWeight: 600 }}>{String(lightboxIndex + 1).padStart(2, "0")}</Box>
              <Box component="span" sx={{ opacity: 0.55 }}> / {String(slides.length).padStart(2, "0")}</Box>
              {activeProject?.topics?.[lightboxIndex] ? ` · ${activeProject.topics[lightboxIndex]}` : ""}
            </Box>
            <Box component="button" type="button" onClick={lbClose} aria-label="Close (Esc)" sx={{ ...lbBtn(false), width: 44, px: 0, justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M1 1l12 12M13 1 1 13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </Box>
          </Box>
          <Box sx={{
            position: "relative",
            width: "100%", maxWidth: 960,
            borderRadius: "10px",
            border: "1px solid transparent",
            background: `
              linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
              linear-gradient(11deg, #00CD1F 0%, #8C8C8C 6%, #8C8C8C 95%, #00CD1F 100%) border-box
            `,
            boxShadow: "0 0 2px rgba(0,255,133,.25), inset 0 0 1px rgba(255,255,255,.05)",
            flexShrink: lbText ? 1 : 0, minHeight: 0,
          }}>
            {lbText ? (
              // the slide's words as plain, readable text
              <Box tabIndex={0} aria-label="Slide text" sx={{ maxHeight: "60vh", overflowY: "auto", p: "18px 18px 22px", outline: "none" }}>
                <Box component="h2" sx={{ m: 0, mb: "10px", fontSize: 18, lineHeight: 1.3, color: "#fff", fontWeight: 600 }}>{lbSlideText?.[0]}</Box>
                <Box component="p" sx={{ m: 0, fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.82)" }}>{lbSlideText?.[1]}</Box>
              </Box>
            ) : (
              <Box onTouchEnd={onLbTouchEnd} onDoubleClick={() => setLbZoom((z) => !z)}
                {...(lbZoom ? { tabIndex: 0, role: "region", "aria-label": "Zoomed slide, scroll to pan" } : {})} sx={{
                borderRadius: "10px", overflow: lbZoom ? "auto" : "hidden",
                aspectRatio: "1676 / 961", WebkitOverflowScrolling: "touch",
              }}>
                <Box sx={{ width: lbZoom ? "260%" : "100%", aspectRatio: "1676 / 961", transition: "width 0.2s ease" }}>
                  <SlideFigure src={slides[lightboxIndex]} index={lightboxIndex} count={slides.length}
                    title={activeProject?.title} text={activeProject?.text?.[lightboxIndex]}
                    isCta={isCtaSlide(activeProject, lightboxIndex)} />
                </Box>
              </Box>
            )}
          </Box>
          {/* prev / dots / next */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "10px", mt: "14px", flexShrink: 0 }}>
            <Box component="button" type="button" onClick={lbPrev} aria-label="Previous slide" sx={{ ...lbBtn(false), width: 44, px: 0, justifyContent: "center" }}>
              <svg width="9" height="16" viewBox="0 0 9 16" aria-hidden><path d="M8 1 1 8l7 7" fill="none" stroke={PRIMARY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Box>
            <SlideDots count={slides.length} current={lightboxIndex} onSelect={setLightboxIndex}
              view={210} sx={{ position: "relative", flexShrink: 0 }} />
            <Box component="button" type="button" onClick={lbNext} aria-label="Next slide" sx={{ ...lbBtn(false), width: 44, px: 0, justifyContent: "center" }}>
              <svg width="9" height="16" viewBox="0 0 9 16" aria-hidden><path d="M1 1l7 7-7 7" fill="none" stroke={PRIMARY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Box>
          </Box>
          {/* reading tools */}
          <Box sx={{ display: "flex", gap: "10px", mt: "12px", flexShrink: 0 }}>
            {!lbText && (
              <Box component="button" type="button" aria-pressed={lbZoom} onClick={() => setLbZoom((z) => !z)} sx={lbBtn(lbZoom)}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M11 11l4 4M5 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />{!lbZoom && <path d="M7 5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}</svg>
                {lbZoom ? "Zoom out" : "Zoom in"}
              </Box>
            )}
            {lbSlideText && (
              <Box component="button" type="button" aria-pressed={lbText} onClick={() => setLbText((v) => !v)} sx={lbBtn(lbText)}>
                <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden><path d="M1 1h14M1 5h14M1 9h14M1 13h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                {lbText ? "Show slide" : "Read as text"}
              </Box>
            )}
          </Box>
          {!lbText && !lbZoom && (
            <Box sx={{ mt: "10px", fontSize: 12, color: "rgba(255,255,255,0.55)", textAlign: "center",
              "@media (orientation: landscape)": { display: "none" } }}>
              Double-tap to zoom · rotate your phone for a bigger slide
            </Box>
          )}
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
      <Box component="main" sx={pageBg}>
        <Box component="h1" sx={srOnly}>{category} work by {SITE.name}, {SITE.role}</Box>
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
          category={category}
          onSeeUiux={seeUiux}
          isCtaSlide={(i) => isCtaSlide(activeProject, i)}
        />
        {/* expand → Figma "Full Scree Mode_For Claude"; closing keeps the slide */}
        {lightboxOpen && hasSlides && (
          <FullScreenView
            project={activeProject}
            isCtaSlide={(i) => isCtaSlide(activeProject, i)}
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
    <Box component="main" sx={{
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
      <Box component="h1" sx={srOnly}>{category} work by {SITE.name}, {SITE.role}</Box>
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
          {projects.length > 0 && (
          <Box ref={subTabsRef} role="tablist" aria-label="Projects" sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2, pt: 2, pb: 1,
            flexShrink: 0,
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            ...subFade,
          }}>
            {projects.map((proj, i) => (
              <Tab
                key={i}
                active={subTab === i ? 1 : 0}
                onClick={() => { setSubTab(i); setSlideIndex(0); slidesListRef.current?.scrollTo({ top: 0 }); }}
              >
                {proj.title}
              </Tab>
            ))}
          </Box>
          )}

          {/* jump to a chapter of the case study */}
          {hasSlides && activeProject?.topics && (
            <Box sx={{ px: 2, pb: 1, flexShrink: 0, position: "relative" }}>
              <Box component="label" htmlFor="chapter-select" sx={srOnly}>Jump to chapter</Box>
              <Box component="select" id="chapter-select" value={visibleSlide}
                onChange={(e) => scrollToSlide(Number(e.target.value))}
                sx={{
                  width: "100%", height: 44, pl: "14px", pr: "36px", boxSizing: "border-box",
                  appearance: "none", WebkitAppearance: "none",
                  borderRadius: "10px", border: "1px solid rgba(143,143,143,0.7)",
                  background: "rgba(12,14,13,0.62)", color: "#fff",
                  fontFamily: "inherit", fontSize: 14,
                  "& option": { background: "#111", color: "#fff" },
                }}>
                {activeProject.topics.map((t, i) => (
                  <option key={i} value={i}>{String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")} · {t}</option>
                ))}
              </Box>
              <svg aria-hidden width="11" height="7" viewBox="0 0 11 7"
                style={{ position: "absolute", right: 30, top: 19, pointerEvents: "none" }}>
                <path d="M1 1l4.5 4.5L10 1" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </Box>
          )}

          {/* SLIDES */}
          <Box sx={{ position: "relative", flex: 1, display: "flex", alignItems: "center", px: 0.5, minHeight: 0 }}>
            {!loading && projects.length === 0 && (
              <EmptyCategory category={category} onSeeUiux={seeUiux} compact />
            )}

            {/* all slides stacked; tap one to expand it */}
            {hasSlides && (
              <Box ref={slidesListRef} sx={{
                width: "100%",
                height: "100%",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                px: 1, pb: 2,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "rgba(0,205,31,0.4)", borderRadius: "2px" },
              }}>
                <Box component="h2" sx={srOnly}>{activeProject?.title} case study</Box>
                {slides.map((slide, index) => (
                  <Box key={slide} data-slide={index} sx={{ position: "relative", flexShrink: 0, width: "100%", aspectRatio: "1676 / 961" }}>
                    <SlideFigure src={slide} index={index} count={slides.length} lazy={index > 1}
                      title={activeProject?.title} text={activeProject?.text?.[index]}
                      isCta={isCtaSlide(activeProject, index)} radius="12px" />
                    <Box sx={{ position: "absolute", bottom: 10, right: 10, display: "flex", flexDirection: "column", gap: "6px", zIndex: 3 }}>
                      <Box component="button" type="button" onClick={() => handleAskAI(index)}
                        aria-label={`Ask AI about slide ${index + 1}`}
                        sx={{ p: 0, border: 0, background: "none", width: 36, height: 36, cursor: "pointer" }}>
                        <Box component="img" src="/assets/icons/AI.png" alt="" sx={{ width: 36, display: "block" }} />
                      </Box>
                      {/* extend.svg is a 44px button inside a 70px canvas (room for its
                          shadow), so scale and offset it to the same 36px as the AI button */}
                      <Box component="button" type="button" onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                        aria-label={`Expand slide ${index + 1}`}
                        sx={{ position: "relative", width: "36px", height: "36px", p: 0, border: 0, background: "none", cursor: "pointer" }}>
                        <Box component="img" src="/assets/images/extend.svg" alt="" aria-hidden sx={{
                          position: "absolute", width: `${36 * 70 / 44}px`, maxWidth: "none",
                          left: `${-36 * 14 / 44}px`, top: `${-36 * 10 / 44}px`, pointerEvents: "none",
                        }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
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