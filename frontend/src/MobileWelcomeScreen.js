import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { PRIMARY} from "./theme";
import {
  Tab,
  ExpCard,
  CertCard,
  CategoryCard,
  experiences,
  ICON_MAP,
  DEFAULT_WORK_CATEGORIES,
} from "./AboutMe";
import { fetchCategories } from "./api/chatApi";
import DownloadResume from "./DownloadResume";
import ChatbotPanel from "./ChatbotPanel";

/* ── Work tab ── */
function MobileWorkTab() {
  const navigate = useNavigate();
  const [workCategories, setWorkCategories] = useState(DEFAULT_WORK_CATEGORIES);

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        if (data && data.length > 0) {
          setWorkCategories(
            data.map((cat) => ({
              label: cat,
              icon: ICON_MAP[cat] || "/assets/icons/UX.svg",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {/* 2-col category grid using desktop CategoryCard */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          mt: "4px",
        }}
      >
        {workCategories.map((cat) => (
          <CategoryCard
            key={cat.label}
            cat={cat}
            compact={true}
            onClick={() =>
              navigate(`/portfolio/${encodeURIComponent(cat.label)}`)
            }
          />
        ))}
      </Box>

      {/* Bio + download */}
      <Typography
        sx={{
          fontSize: "14px",
          lineHeight: 1.75,
          color: "#fff",
          textAlign: "left",
          mt: "30px",
        }}
      >
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966.
      </Typography>
      <Box sx={{ mt: "30px" }}>
        <DownloadResume />
      </Box>
    </Box>
  );
}

/* ── About Me tab ── */
function MobileAboutTab() {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: "13px",
          letterSpacing: "1.2px",
          color: "#fff",
          mb: 3,
          textAlign: "left",
        }}
      >
        Experience
      </Typography>

      {/* 2-col grid of ExpCards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          mb: 2.5,
        }}
      >
        {experiences.map((exp) => (
          <ExpCard key={exp.company}>
            <Typography
              sx={{ fontSize: "12px", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}
            >
              {exp.company}
            </Typography>
            <Typography
              sx={{ fontSize: "11px", fontWeight: 600, color: "#fff", mt: 0.2, lineHeight: 1.3 }}
            >
              {exp.role}
            </Typography>
            <Typography sx={{ fontSize: "10px", mt: 0.3, color: "rgba(255,255,255,0.5)" }}>
              {exp.period}
            </Typography>
          </ExpCard>
        ))}
      </Box>

      {/* Cert card — same gradient border as desktop */}
      <CertCard
        sx={{
          mb: 2,
          border: "0.5px solid transparent",
          background: `
            linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
            linear-gradient(11deg, #00CD1F 0%, #8C8C8C 6%, #8C8C8C 95%, #00CD1F 100%) border-box
          `,
        }}
      >
        <Box
          component="img"
          src="/assets/icons/UX-Certification.svg"
          alt="cert"
          sx={{ width: 38, height: 38, flexShrink: 0 }}
        />
        <Box sx={{ textAlign: "left" }}>
          <Typography sx={{ fontSize: "15px", fontWeight: "bold", color: "#fff", lineHeight: 1.3 }}>
            UI/UX Design with Generative AI
          </Typography>
          <Typography sx={{ fontSize: "13px", mt: 0.5, lineHeight: 1.4, color: "#fff" }}>
            International Institute of Information Technology Bangalore (IIIT-B)
          </Typography>
        </Box>
      </CertCard>
    </Box>
  );
}

/* ── Main Mobile Welcome Screen ── */
export default function MobileWelcomeScreen({ opacity, socialIcons }) {
  const [activeTab, setActiveTab] = useState("work");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [chatTooltipDismissed, setChatTooltipDismissed] = useState(false);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        opacity,
        visibility: opacity > 0 ? "visible" : "hidden",
        pointerEvents: opacity > 0.5 ? "auto" : "none",
        px: "16px",
        pt: "20px",
        pb: "12px",
        overflowY: "auto",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {/* Main card */}
      <Box
        sx={{
          borderRadius: "20px",
          border: "1px solid transparent",
          background: `
            linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
            linear-gradient(11deg, #00CD1F 0%, #8C8C8C 6%, #8C8C8C 95%, #00CD1F 100%) border-box
          `,
          p: "20px 16px 24px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2, textAlign: "left" }}>
          <Typography sx={{ fontSize: "14px", color: "#fff", mb: "2px" }}>
            Welcome !
          </Typography>
          <Typography sx={{ fontSize: "30px", fontWeight: 800, color: PRIMARY, lineHeight: 1.1 }}>
            Akash P
          </Typography>
        </Box>

        {/* Desktop-style SVG speech-bubble tabs */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1, gap: "4px" }}>
          <Tab active={activeTab === "work" ? 1 : 0} onClick={() => setActiveTab("work")}>
            Work
          </Tab>
          <Tab active={activeTab === "about" ? 1 : 0} onClick={() => setActiveTab("about")}>
            About Me
          </Tab>
        </Box>

        {/* Tab content */}
        <Box sx={{ flex: 1, overflowY: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
          {activeTab === "work" ? <MobileWorkTab /> : <MobileAboutTab />}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          borderRadius: "20px",
          border: "1px solid transparent",
          background:
            "linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box, linear-gradient(11deg, #00CD1F 0%, #8C8C8C 6%, #8C8C8C 95%, #00CD1F 100%) border-box",
          padding: "10px 30px",
          mt: "-35px",       // pulls it up to overlap the card, same visual as before
          mx: "auto",        // centers it horizontally
          width: "fit-content",
          position: "relative",
          zIndex: 10,        // stays above the card's bottom edge
          flexShrink: 0,     // don't let flex column squash it
        }}
      >
        {socialIcons.map(({ label, icon, link }) => (
          <Box
            key={label}
            component="a"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src={icon}
              alt={label}
              sx={{ width: 45, height: 45, filter: "brightness(0) invert(0.85)" }}
            />
          </Box>
        ))}
      </Box>
      {/* ── Chatbot drawer (same as ProjectDetailPage) ── */}
      {/* Backdrop */}
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

      {/* Sliding panel */}
      <Box sx={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 50, p: "12px",
        boxSizing: "border-box",
        transform: mobileChatOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.90s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <ChatbotPanel
          chips={["View Case Study", "How I Design", "Start Chat"]}
          wrapperSx={{ width: "100%", height: "100%" }}
        />
      </Box>

      {/* Toggle tab */}
      <Box
        onClick={() => setMobileChatOpen((p) => !p)}
        sx={{
          position: "fixed", right: 0, bottom: "40px",
          width: 34, height: 96,
          background: PRIMARY,
          borderRadius: "14px 0 0 14px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 55,
          boxShadow: "0 0 18px rgba(0,205,31,0.5)",
        }}
      >
        {mobileChatOpen
          ? <ChevronRightIcon sx={{ color: "#08120a" }} />
          : <ChevronLeftIcon sx={{ color: "#08120a" }} />}
      </Box>

      {/* "Click to talk with AI" tooltip bubble */}
      {!mobileChatOpen && !chatTooltipDismissed && (
        <Box sx={{
          position: "fixed", right: 44, bottom: "58px",
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
      )}
    </Box>
  );
}
