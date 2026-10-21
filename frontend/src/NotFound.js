// Unknown addresses get a proper "page not found" in the site's style,
// instead of silently restarting the intro.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { glassHudRectSx, spinBorderSx } from "./hud/glass";
import { setPageMeta } from "./pageMeta";
import { SITE } from "./siteConfig";

const PRIMARY = "#00CD1F";
const btn = {
  height: 48, px: "22px", display: "inline-flex", alignItems: "center", justifyContent: "center",
  borderRadius: "10px", border: "1px solid #8F8F8F", background: "rgba(255,255,255,0.04)",
  color: "#fff", fontFamily: "inherit", fontSize: 15, cursor: "pointer",
  transition: "border-color 0.25s ease, background 0.25s ease",
  "&:hover, &:focus-visible": { borderColor: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.08)" },
};

export default function NotFound() {
  const navigate = useNavigate();
  useEffect(() => {
    setPageMeta(`Page not found · ${SITE.name}`, `This page doesn't exist on ${SITE.name}'s portfolio.`);
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  return (
    <Box component="main" sx={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      p: 2, color: "#fff",
      backgroundImage: "radial-gradient(ellipse 62% 58% at 50% 48%, rgba(0,0,0,0.45), rgba(0,0,0,0.85)), url('/assets/images/bg-images/bg.jpg')",
      backgroundSize: "cover", backgroundPosition: "center",
    }}>
      <Box sx={{
        ...glassHudRectSx, ...spinBorderSx(1), borderRadius: "20px",
        width: "100%", maxWidth: 520, p: { xs: "32px 24px", sm: "44px 48px" }, textAlign: "center",
      }}>
        <Box sx={{ fontSize: 14, letterSpacing: "4px", color: PRIMARY, mb: "12px" }}>ERROR 404</Box>
        <Box component="h1" sx={{ m: 0, fontSize: { xs: 26, sm: 32 }, fontWeight: 700, lineHeight: 1.2 }}>
          This room isn't part of the lab
        </Box>
        <Box component="p" sx={{ m: "14px 0 28px", fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.75)" }}>
          The page you're looking for doesn't exist or has moved.
        </Box>
        <Box sx={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Box component="button" type="button" onClick={() => navigate("/")}
            sx={{ ...btn, background: PRIMARY, borderColor: PRIMARY, color: "#080808", fontWeight: 600,
              "&:hover, &:focus-visible": { background: "#14e033", borderColor: "#14e033" } }}>
            Back to the Design Lab
          </Box>
          <Box component="button" type="button" onClick={() => navigate(`/portfolio/${encodeURIComponent("UI/UX")}`)} sx={btn}>
            See case studies
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
