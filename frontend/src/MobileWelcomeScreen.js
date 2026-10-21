import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { PRIMARY} from "./theme";
import {
  Tab,
  ExpCard,
  CertCard,
  CategoryCard,
  experiences,
  toCategoryCard,
  DEFAULT_WORK_CATEGORIES,
} from "./AboutMe";
import { fetchCategories } from "./api/chatApi";
import DownloadResume from "./DownloadResume";
import { externalLinkProps } from "./siteConfig";
import { srOnly } from "./a11y";
import MobileChatDrawer from "./hud/MobileChatDrawer";

/* ── Short copy + Download Resume, at the end of both tabs (as on desktop) ── */
const WORK_COPY = "Pick a category to explore my projects, or download my resume for the full picture.";
const ABOUT_COPY = "A UI/UX designer who turns complex problems into clear, human-centred experiences, now designing with generative AI.";

function BioAndResume({ text }) {
  return (
    <>
      <Typography sx={{ fontSize: "14px", lineHeight: 1.75, color: "#fff", textAlign: "left", mt: "30px" }}>
        {text}
      </Typography>
      <Box sx={{ mt: "30px" }}>
        <DownloadResume />
      </Box>
    </>
  );
}

/* ── Work tab ── */
function MobileWorkTab() {
  const navigate = useNavigate();
  const [workCategories, setWorkCategories] = useState(DEFAULT_WORK_CATEGORIES);

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        if (data && data.length > 0) {
          setWorkCategories(data.map(toCategoryCard));
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
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: "12px",
          mt: "4px",
          // the card outline is drawn 15/216 in from each side of its box, so
          // pull the grid out by that much: the visible cards then line up
          // with the "Welcome / Akash P" heading and the bio text
          mx: { xs: "calc((100% - 12px) * -15 / 402)", md: "calc((100% - 36px) * -15 / 804)" },
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

      <BioAndResume text={WORK_COPY} />
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
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          gap: "10px",
          mb: 2.5,
        }}
      >
        {experiences.map((exp) => (
          <ExpCard key={exp.company} sx={{ textAlign: "left" }}>
            <Typography
              sx={{ fontSize: "12px", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}
            >
              {exp.company}
            </Typography>
            <Typography
              sx={{ fontSize: "12px", fontWeight: 600, color: "#fff", mt: 0.2, lineHeight: 1.3 }}
            >
              {exp.role}
            </Typography>
            <Typography sx={{ fontSize: "12px", mt: 0.3, color: "rgba(255,255,255,0.6)" }}>
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
          alt=""
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
      <BioAndResume text={ABOUT_COPY} />
    </Box>
  );
}

/* ── Main Mobile Welcome Screen ── */
export default function MobileWelcomeScreen({ opacity, socialIcons }) {
  const [activeTab, setActiveTab] = useState("work");

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
        // tablets: a centred card instead of one stretched across the screen
        alignItems: { sm: "center" },
        justifyContent: { sm: "center" },
        // keep clear of the notch / status bar and the home indicator
        pt: "max(20px, env(safe-area-inset-top))",
        pb: "max(12px, env(safe-area-inset-bottom))",
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
          p: { xs: "20px 16px 24px", sm: "32px 32px 36px" },
          flex: { xs: 1, sm: "0 1 auto" },
          width: { sm: "100%" },
          maxWidth: { sm: 720, md: 860, lg: 960 },
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2, textAlign: "left" }}>
          <Typography sx={{ fontSize: { xs: "14px", sm: "16px" }, color: "#fff", mb: "2px" }}>
            Welcome to the Portfolio!
          </Typography>
          <Typography component="h1" sx={{ fontSize: { xs: "30px", sm: "38px" }, fontWeight: 800, color: PRIMARY, lineHeight: 1.1 }}>
            Akash P
            <Box component="span" sx={srOnly}>, UI/UX Designer and Art Director</Box>
          </Typography>
          <Typography aria-hidden sx={{ fontSize: { xs: "13px", sm: "15px" }, color: "rgba(255,255,255,0.7)", mt: "4px" }}>
            UI/UX Designer &amp; Art Director
          </Typography>
        </Box>

        {/* Desktop-style SVG speech-bubble tabs */}
        <Box role="tablist" aria-label="Sections" sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1, gap: "4px" }}>
          <Tab active={activeTab === "work" ? 1 : 0} onClick={() => setActiveTab("work")}>
            Work
          </Tab>
          <Tab active={activeTab === "about" ? 1 : 0} onClick={() => setActiveTab("about")}>
            About Me
          </Tab>
        </Box>

        {/* Tab content */}
        <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", "&::-webkit-scrollbar": { display: "none" } }}>
          {activeTab === "work" ? <MobileWorkTab /> : <MobileAboutTab />}
        </Box>
      </Box>

      <Box
        component="nav" aria-label="Contact and social links"
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
            {...externalLinkProps(link, label)}
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
              alt=""
              sx={{ width: 45, height: 45, filter: "brightness(0) invert(0.85)" }}
            />
          </Box>
        ))}
      </Box>
      {/* chat: green edge tab, short hint and full-screen drawer */}
      <MobileChatDrawer chips={["View Case Study", "How I Design", "Start Chat"]} />
    </Box>
  );
}
