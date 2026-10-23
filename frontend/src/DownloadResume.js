import { useState } from "react";
import { Box, Button } from "@mui/material";
import CustomTooltip from "./CustomTooltip";
import { glassSx, spinBorderSx, useSpinOnHover } from "./hud/glass";
import { useResume } from "./useResume";
import { track } from "./analytics";

const buttonStyles = {
  px: "18px",
  py: "12px",
  borderRadius: "10px",
  border: "1px solid transparent",
  background: `linear-gradient(#1C1C1C, #3A3A3A) padding-box, linear-gradient(11deg, #00CD1F 0%, #8C8C8C 14%, #8C8C8C 87%, #00CD1F 100%) border-box;
  `,
  color: "#fff",
  fontSize: "13px",
  fontWeight: 500,
  textTransform: "none",
  minWidth: "fit-content",
  flexShrink: 0,
  boxShadow: "none",
  "& .MuiButton-startIcon": {
    marginRight: "10px",
    marginLeft: 0,
  },
  "&:hover": {
     background: `linear-gradient(#1C1C1C, #3A3A3A) padding-box, linear-gradient(11deg, #00CD1F 0%, #8C8C8C 14%, #8C8C8C 87%, #00CD1F 100%) border-box;
  `,
    boxShadow: "none",
  },
  "&:active": { boxShadow: "none" },
};

// Home-screen HUD version: dark liquid glass with the Figma gradient border,
// which turns while hovered and stays where it stopped.
const glassButtonStyles = {
  ...buttonStyles,
  ...glassSx(),
  ...spinBorderSx(1),
  // the 1px transparent border keeps the button the same size as before
  border: "1px solid transparent",
  // desktop HUD: readable at the HUD's scale
  fontSize: "16.5px", px: "22px", py: "13px",
  "&:hover": {
    ...glassSx(),
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  "&:active": { backgroundColor: "rgba(255,255,255,0.09)" },
  "&::before": {
    ...spinBorderSx(1)["&::before"],
    inset: "-1px", // draw the ring over the transparent border
  },
};

// Icon: the resume file, which turns into the green download icon (Figma
// "Resume_Default" → "Resume_Hover") while hovered or focused.
function ResumeIcon({ active }) {
  const layer = { position: "absolute", inset: 0, width: 20, height: 20, transition: "opacity 0.2s ease, transform 0.25s ease" };
  return (
    <Box component="span" sx={{ position: "relative", display: "block", width: 20, height: 20 }}>
      <Box component="img" src="/assets/icons/download-resume.svg" alt=""
        sx={{ ...layer, opacity: active ? 0 : 1, transform: active ? "scale(0.85)" : "none" }} />
      <Box component="img" src="/assets/icons/download-resume-hover.svg" alt=""
        sx={{ ...layer, opacity: active ? 1 : 0, transform: active ? "none" : "translateY(-3px)" }} />
    </Box>
  );
}

function DownloadResume({ sx, glass = false }) {
  const spin = useSpinOnHover();
  const [active, setActive] = useState(false);
  const on = (h) => (e) => { setActive(true); h?.(e); };
  const off = (h) => (e) => { setActive(false); h?.(e); };
  const hp = glass ? spin.hoverProps : {};
  // The resume PDF is configured in siteConfig; until it's uploaded the
  // button asks for it by email instead of serving a missing file.
  const resume = useResume();
  return (
    <CustomTooltip
      title={resume.available ? <>Download PDF</> : <>Email Akash for the latest resume</>}
      placement="top"
    >
      <Button
        component="a"
        href={resume.href}
        {...(resume.available ? { download: resume.fileName } : {})}
        onClickCapture={() => track(resume.available ? "Resume download" : "Resume request")}
        data-autohover="download-resume"
        variant="contained"
        ref={glass ? spin.ref : undefined}
        onMouseEnter={on(hp.onMouseEnter)}
        onMouseLeave={off(hp.onMouseLeave)}
        onFocus={on(hp.onFocus)}
        onBlur={off(hp.onBlur)}
        startIcon={<ResumeIcon active={active} />}
        sx={{
          ...(glass ? glassButtonStyles : buttonStyles),
          // keyboard focus ring (MUI turns the outline off; mouse never shows it)
          "&.Mui-focusVisible": { outline: "2px solid #00CD1F", outlineOffset: "3px" },
          ...sx,
        }}
      >
        {resume.available ? "Download Resume" : "Request Resume"}
      </Button>
    </CustomTooltip>
  );
}

export default DownloadResume;
