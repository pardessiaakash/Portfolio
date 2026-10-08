import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, IconButton,useMediaQuery } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChatbotPanel from "./ChatbotPanel";
import { useChatContext } from "./ChatContext";
import { useResizableChatbot } from "./hooks/useResizableChatbot";
import ResizeHandle from "./ResizeHandle";
import { fetchCategories, fetchProjects } from "./api/chatApi";
import CustomTooltip from "./CustomTooltip";
import { Tab } from "./AboutMe";

const PRIMARY = "#00CD1F";

const PORTFOLIO_TABS = [
  { label: "UI/UX", aliases: ["UI/UX"] },
  { label: "Social Media", aliases: ["Social Media"] },
  { label: "Videos", aliases: ["Videos", "Video"] },
  { label: "XR", aliases: ["XR"] },
];

const orbVideos = [
  "/assets/orb/Idle State.mp4",
  "/assets/orb/Listening State.mp4",
  "/assets/orb/Searching State.mp4",
  "/assets/orb/Speaking State.mp4",
];

const SLIDE_PROMPTS = [
  `Project Scope & Requirements\nNova: "I can explain the project scope, summarize the key requirements, or walk you through the goals and constraints."`,
  `Competitor SWOT Analysis\nNova: "I can explain the competitor SWOT analysis, summarize the key market insights, or walk you through the opportunities identified for SwiftConnect."`,
  `The "SwiftConnect" Opportunity\nNova: "I can explain the SwiftConnect opportunity, summarize the user and business gaps, or walk you through the opportunity behind the solution."`,
  `User Research & Synthesis\nNova: "I can explain the user research, summarize the key insights, or walk you through how the findings shaped the design direction."`,
  `Survey Questions (Quantitative) – Report\nNova: "I can explain the survey results, summarize the key data-driven insights, or walk you through how the findings influenced the design."`,
  `Stakeholder & Admin Interviews – Qualitative\nNova: "I can explain the interview findings, summarize the key qualitative insights, or walk you through how stakeholder needs shaped the product direction."`,
  `Top Pain Points (Ranking)\nNova: "I can explain the top pain points, summarize their impact, or walk you through how they were prioritized."`,
  `Actionable Observations\nNova: "I can explain the key observations, summarize the most important findings, or walk you through how they became design opportunities."`,
  `Sample Demographics & Behavior\nNova: "I can explain the user demographics, summarize the key behavioral patterns, or walk you through what these insights mean for the product."`,
  `Problem Statement\nNova: "I can explain the core problem, summarize who it affects, or walk you through why solving it matters."`,
  `Affinity Mapping\nNova: "I can explain the affinity mapping process, summarize the key themes, or walk you through how research data was grouped into insights."`,
  `Empathy Map: The Support Agent (Peak Season)\nNova: "I can explain the Support Agent empathy map, summarize their key needs and frustrations, or walk you through their peak-season experience."`,
  `User Personas\nNova: "I can introduce the user personas, summarize their goals and frustrations, or walk you through how they influenced the design."`,
  `Support Agent Journey Map\nNova: "I can explain the Support Agent journey, summarize the key pain points, or walk you through the opportunities identified at each stage."`,
  `Information Architecture\nNova: "I can explain the Information Architecture, summarize the content structure, or walk you through how it helps users find information."`,
  `User Task Flow\nNova: "I can explain the user task flow, summarize the key steps, or walk you through how users complete their primary task."`,
  `Phase 1: Initial High-Fidelity Iteration (Pre-Usability Testing)\nNova: "I can explain the initial high-fidelity design, summarize the key UX decisions, or walk you through the thinking behind this iteration."`,
  `Usability Testing Data Report\nNova: "I can explain the usability testing results, summarize the key findings, or walk you through what was improved based on user feedback."`,
  `Colours\nNova: "I can explain the colour system, summarize the visual decisions, or walk you through how colour supports hierarchy and accessibility."`,
  `Typography\nNova: "I can explain the typography system, summarize the type choices, or walk you through how typography supports readability and hierarchy."`,
  `Space & Radius\nNova: "I can explain the spacing and radius system, summarize the visual rules, or walk you through how they create consistency across the interface."`,
  `Final High-Fidelity Solution (Validated & Optimized)\nNova: "I can explain the final solution, summarize the key improvements, or walk you through how research and testing shaped the final experience."`
];

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { category: urlCategory } = useParams();
  const isMobile = useMediaQuery("(max-width:1024px)");

  const { widthPercent, isDragging, handleMouseDown, containerRef } = useResizableChatbot(30, "project_chatbot_width_percentage_v2", 30, 50, [30, 50]);

  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [chatTooltipDismissed, setChatTooltipDismissed] = useState(false);

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
          setProjects(data);
          setSubTab(0);
          setSlideIndex(0);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setProjects([]);
          setLoading(false);
        });
    }
  }, [mainTab, mainTabs]);

  const activeProject = projects[subTab] || null;
  const slides = activeProject && activeProject.slides && activeProject.slides.length > 0
    ? activeProject.slides
    : ["/assets/images/projects/swift/1.jpg"]; // fallback

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

  const next = () => setSlideIndex((p) => (p + 1) % slides.length);
  const prev = () => setSlideIndex((p) => (p === 0 ? slides.length - 1 : p - 1));
  const lbNext = () => setLightboxIndex((p) => (p + 1) % slides.length);
  const lbPrev = () => setLightboxIndex((p) => (p === 0 ? slides.length - 1 : p - 1));
  const openLightbox = () => { setLightboxIndex(slideIndex); setLightboxOpen(true); };

  const handleAskAI = (index = slideIndex) => {
    if (index >= 0 && index < SLIDE_PROMPTS.length) {
      const rawPrompt = SLIDE_PROMPTS[index];
      // Extract only the topic title (the part before the newline/Nova: description)
      // and form a clean question so the intent classifier routes it correctly.
      const topicTitle = rawPrompt.split('\n')[0].trim();
      const cleanQuestion = `Tell me about the ${topicTitle} for this project.`;
      setRequestedAIInput({ text: cleanQuestion, timestamp: Date.now() });
      if (isMobile) {
        setMobileChatOpen(true);
      }
    }
  };

  return (
    <Box sx={{
      width: "100vw", height: "100vh", overflow: "hidden",
      backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12)), url('/assets/images/bg-images/bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex", flexDirection: "column",
      boxSizing: "border-box",
      p: { xs: "20px 16px", md: "12.5vh 10.5vw" },
      color: "#fff",
      position: "relative",
    }}>
      {/* MAIN TABS */}
      <Box sx={{
        display: "flex",
        width: "100%",
        pr: { xs: 0, md: `${widthPercent}%` },
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "12px",
        mb: { xs: "-2px", md: "0px" },
        flexShrink: 0,
        position: "relative",
        zIndex: 2,
      }}>
        {/* Back Button */}
        <CustomTooltip title="Back to Home" placement="top">
          <Box onClick={() => navigate("/")} sx={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32,
            cursor: "pointer",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.02)",
            color: "rgba(255,255,255,0.6)",
            transition: "all 0.2s ease-in-out",
            padding: "25px",
            flexShrink: 0,
          }}>
            <img src="/assets/icons/home.png" alt="Home" />
          </Box>
        </CustomTooltip>

        <Box sx={{
          display: "flex",
          gap: { xs: "10px", md: "0px" },
          overflowX: { xs: "auto", md: "visible" },
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}>
          {mainTabs.map((tab, i) => {
            const isActive = mainTab === i;

            // ---- MOBILE: speech-bubble tabs — pure CSS (border-radius + clip-path), no SVG ----
            if (isMobile) {
              return (
                <Box
                  key={i}
                  onClick={() => navigate(`/portfolio/${encodeURIComponent(tab.label)}`)}
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
                      pt: "10px",
                      pb: "10px",
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
        </Box>
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
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "0.5px solid transparent",
          background: `
            linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
            linear-gradient(11deg, #00CD1F 0%, #8C8C8C 6%, #8C8C8C 95%, #00CD1F 100%) border-box
          `,
          borderRadius: "20px",
          overflow: "hidden",
          minHeight: 0,
          opacity: 0.95
        }}>

          {/* SUB TABS */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2, pt: 2, pb: 1,
            flexShrink: 0,
            overflowX: { xs: "auto", md: "visible" },
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
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

              // Desktop: keep original style
              return (
                <Box key={i} sx={{ position: "relative", flexShrink: 0 }}>
                  <Box onClick={() => { setSubTab(i); setSlideIndex(0); }} sx={{
                    borderRadius: "8px", cursor: "pointer",
                    padding: "10px 30px",
                    fontSize: "13px", fontWeight: 500,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    color: isActive ? PRIMARY : "rgba(255,255,255,0.4)",
                    border: isActive ? "1px solid transparent" : "1px solid rgba(255,255,255,0.08)",
                    background: isActive
                      ? `linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
                         linear-gradient(11deg, #00CD1F 0%, #8C8C8C 16%, #8C8C8C 85%, #00CD1F 100%) border-box`
                      : "rgba(255,255,255,0.02)",
                    transition: "all 0.2s",
                  }}>{proj.title}</Box>
                </Box>
              );
            })}
          </Box>

          {/* SLIDER */}
          <Box sx={{ position: "relative", flex: 1, display: "flex", alignItems: "center", px: { xs: 0.5, md: 1 }, minHeight: 0 }}>
            {/* Desktop: Show slider with navigation */}
            {!isMobile && (
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
            {isMobile && (
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
                        <Box onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }} component="img" src="/assets/images/extend.svg" alt="Maximize" sx={{ cursor: "pointer", width: "40px" }} />
                      </CustomTooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* DOTS - Desktop only */}
          {!isMobile && (
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
            />
          </>
        )}

        {/* MOBILE: slide-in chatbot */}
        {isMobile && (
          <>
            <Box
              onClick={() => setMobileChatOpen(false)}
              sx={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.55)",
                opacity: mobileChatOpen ? 1 : 0,
                pointerEvents: mobileChatOpen ? "auto" : "none",
                transition: "opacity 0.3s ease",
                zIndex: 40,
              }}
            />
            <Box sx={{
              position: "fixed", top: 0, left: 0,
              width: "100vw", height: "100vh",
              zIndex: 50, p: "12px",
              boxSizing: "border-box",
              transform: mobileChatOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.90s cubic-bezier(0.4, 0, 0.2, 1)",
            }}>
              <ChatbotPanel
                orb={orb}
                chips={["View Case Study", "About Akash"]}
                wrapperSx={{ width: "100%", height: "100%" }}
                requestedInput={requestedAIInput}
              />
            </Box>
            <Box
              onClick={() => setMobileChatOpen((p) => !p)}
              sx={{
                position: "fixed", right: 0, bottom: "150px",
                width: 34, height: 96,
                background: PRIMARY,
                borderRadius: "14px 0 0 14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", zIndex: 55,
                boxShadow: "0 0 18px rgba(0,205,31,0.5)",
                transition: "right 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {mobileChatOpen
                ? <ChevronRightIcon sx={{ color: "#08120a" }} />
                : <ChevronLeftIcon sx={{ color: "#08120a" }} />}
            </Box>

            {/* "Click to talk with AI" tooltip bubble */}
            {!mobileChatOpen && !chatTooltipDismissed && (
              <Box sx={{
                position: "fixed", right: 44, bottom: "168px",
                zIndex: 56,
                background: "rgba(20,24,20,0.95)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px",
                px: "12px", py: "8px",
                display: "flex", alignItems: "center", gap: "8px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                whiteSpace: "nowrap",
              }}>
                <Box sx={{ fontSize: "12px", color: "#fff", lineHeight: 1.4 }}>
                  Click to<br />talk with AI
                </Box>
                <Box
                  onClick={(e) => { e.stopPropagation(); setChatTooltipDismissed(true); }}
                  sx={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: "rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                    fontSize: "11px", color: "rgba(255,255,255,0.7)",
                    "&:active": { background: "rgba(255,255,255,0.2)" },
                  }}
                >✕</Box>
              </Box>
            )}          </>
        )}
      </Box>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Box sx={{
          position: "fixed", inset: 0, zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          px: { xs: 2, md: 0 },
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
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            {slides.map((_, i) => (
              <Box key={i} onClick={() => setLightboxIndex(i)} sx={{
                width: 10, height: 10, borderRadius: "50%", cursor: "pointer",
                background: i === lightboxIndex ? PRIMARY : "transparent",
                border: i === lightboxIndex ? `2px solid ${PRIMARY}` : "2px solid #555",
              }} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}