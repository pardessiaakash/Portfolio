import React, { useState, useEffect } from "react";
import { Box, Typography, useMediaQuery } from "@mui/material";
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
  ROLE_LINE,
  WORK_COPY,
  RESUME_LINE,
  aboutBio,
  snapshot,
  SKILLS,
  EARLIER,
  SELECTED_WORK,
} from "./AboutMe";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { pressable } from "./a11y";
import { fetchCategories } from "./api/chatApi";
import DownloadResume from "./DownloadResume";
import { externalLinkProps } from "./siteConfig";
import { srOnly } from "./a11y";
import MobileChatDrawer from "./hud/MobileChatDrawer";

/* ── Readable type for phones and tablets (tablets are read at arm's length,
   so they step up a size). Nothing goes below 13px. ── */
const MT = {
  body: { xs: "15px", sm: "17px" },
  small: { xs: "13.5px", sm: "15px" },
  title: { xs: "14.5px", sm: "16.5px" },
  label: { xs: "13px", sm: "15px" },
};
// the social bar overlaps the card's bottom edge by this much (see below), so
// the scrolling content ends that far above it plus breathing room
const BAR_OVERLAP = 35;

/* ── Short copy + Download Resume, at the end of both tabs (as on desktop) ── */

function BioAndResume({ text }) {
  return (
    <>
      <Typography sx={{ fontSize: MT.body, lineHeight: 1.6, color: "#fff", textAlign: "left", mt: "28px" }}>
        {text}
      </Typography>
      <Box sx={{ mt: "20px" }}>
        <DownloadResume sx={{ fontSize: { xs: "15px", sm: "16px" }, py: "13px", px: "20px", minHeight: 48 }} />
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
            touch
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
const mLabel = { fontSize: MT.label, letterSpacing: "1.2px", color: "rgba(255,255,255,0.8)", mb: 1.5, textAlign: "left" };

function MobileAboutTab() {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: "left" }}>
      <Typography sx={{ fontSize: MT.body, lineHeight: 1.6, color: "#fff", mb: 2.5 }}>
        {aboutBio()}
      </Typography>

      {/* snapshot */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", mb: 3 }}>
        {snapshot().map((f) => (
          <ExpCard key={f.label} sx={{ minWidth: 0, p: "12px" }}>
            <Typography sx={{ fontSize: MT.title, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{f.value}</Typography>
            <Typography sx={{ fontSize: MT.small, mt: 0.4, color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>{f.label}</Typography>
          </ExpCard>
        ))}
      </Box>

      <Typography sx={mLabel}>Skills</Typography>
      <Box component="ul" sx={{ display: "flex", flexWrap: "wrap", gap: "8px", listStyle: "none", p: 0, m: 0, mb: 3 }}>
        {SKILLS.map((k) => (
          <Box component="li" key={k} sx={{
            fontSize: MT.small, color: "#fff", px: "12px", py: "7px", borderRadius: "8px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
          }}>{k}</Box>
        ))}
      </Box>

      <Typography sx={mLabel}>Experience</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: "10px", mb: 2.5 }}>
        {[...experiences.slice(0, 2), EARLIER].map((exp) => (
          <ExpCard key={exp.company} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: MT.title, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{exp.company}</Typography>
            <Typography sx={{ fontSize: MT.small, fontWeight: 600, color: "#fff", mt: 0.3, lineHeight: 1.35 }}>{exp.role}</Typography>
            <Typography sx={{ fontSize: MT.small, mt: 0.3, color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>{exp.period}</Typography>
          </ExpCard>
        ))}
      </Box>

      {/* Cert card — same gradient border as desktop */}
      <CertCard
        sx={{
          mb: 3,
          border: "0.5px solid transparent",
          background: `
            linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
            linear-gradient(11deg, #00CD1F 0%, #8C8C8C 6%, #8C8C8C 95%, #00CD1F 100%) border-box
          `,
        }}
      >
        <Box component="img" src="/assets/icons/UX-Certification.svg" alt="" sx={{ width: 38, height: 38, flexShrink: 0 }} />
        <Box sx={{ textAlign: "left" }}>
          <Typography sx={{ fontSize: { xs: "15px", sm: "17px" }, fontWeight: "bold", color: "#fff", lineHeight: 1.3 }}>
            UI/UX Design with Generative AI
          </Typography>
          <Typography sx={{ fontSize: MT.small, mt: 0.5, lineHeight: 1.4, color: "rgba(255,255,255,0.85)" }}>
            International Institute of Information Technology Bangalore (IIIT-B)
          </Typography>
        </Box>
      </CertCard>

      <Typography sx={mLabel}>Selected work</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {SELECTED_WORK.map((w) => (
          <ExpCard key={w.title} onClick={() => navigate(w.path)} {...pressable(() => navigate(w.path), `Open the ${w.title} case study`, "link")}
            sx={{ minWidth: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: MT.title, fontWeight: 700, color: "#fff" }}>{w.title}</Typography>
              <Typography sx={{ fontSize: MT.small, mt: 0.3, color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>{w.text}</Typography>
            </Box>
            <ArrowForwardIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.7)" }} />
          </ExpCard>
        ))}
      </Box>
      <BioAndResume text={RESUME_LINE} />
    </Box>
  );
}

/* ── Main Mobile Welcome Screen ── */
export default function MobileWelcomeScreen({ opacity, socialIcons }) {
  const [activeTab, setActiveTab] = useState("work");
  const tablet = useMediaQuery("(min-width:600px)");
  const tabSize = tablet ? { w: 176, h: 44, fontSize: 16 } : { w: 150, h: 44, fontSize: 15 };
  // switching tabs starts the new content at the top
  const scrollRef = React.useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [activeTab]);

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
          <Typography sx={{ fontSize: { xs: "15px", sm: "18px" }, color: "#fff", mb: "2px" }}>
            {ROLE_LINE}
          </Typography>
          <Typography component="h1" sx={{ fontSize: { xs: "32px", sm: "42px" }, fontWeight: 800, color: PRIMARY, lineHeight: 1.1 }}>
            Akash P
            <Box component="span" sx={srOnly}>, UI/UX Designer and Art Director</Box>
          </Typography>
        </Box>

        {/* Desktop-style SVG speech-bubble tabs */}
        <Box role="tablist" aria-label="Sections" sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1, gap: "4px" }}>
          <Tab active={activeTab === "work" ? 1 : 0} onClick={() => setActiveTab("work")} {...tabSize}>
            Work
          </Tab>
          <Tab active={activeTab === "about" ? 1 : 0} onClick={() => setActiveTab("about")} {...tabSize}>
            About Me
          </Tab>
        </Box>

        {/* Tab content */}
        <Box ref={scrollRef} sx={{
          flex: 1, overflowY: "auto", overflowX: "hidden", "&::-webkit-scrollbar": { display: "none" },
          // the social bar overlaps the card's bottom edge: end the content
          // above it so the last item (the resume button) is never covered
          pb: `${BAR_OVERLAP + 12}px`,
          pt: "6px",
          // content slides under the tabs with a soft edge, not a hard cut
          maskImage: "linear-gradient(transparent 0, #000 14px)",
          WebkitMaskImage: "linear-gradient(transparent 0, #000 14px)",
        }}>
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
          padding: { xs: "8px 18px", sm: "10px 30px" },
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
      <MobileChatDrawer chips={["Best Case Study", "Why Hire Akash", "His Design Process"]} phoneTop="80px" />
    </Box>
  );
}
