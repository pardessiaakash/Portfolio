import { Box, Button } from "@mui/material";
import CustomTooltip from "./CustomTooltip";
import { glassSx, spinBorderSx, useSpinOnHover } from "./hud/glass";

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

function DownloadResume({ sx, glass = false }) {
  const spin = useSpinOnHover();
  return (
    <CustomTooltip
      title={<>Click to Download</>}
      placement="top"
    >
      <Button
        component="a"
        href="/Round-1_Corrections.pdf"
        download
        data-autohover="download-resume"
        variant="contained"
        ref={glass ? spin.ref : undefined}
        {...(glass ? spin.hoverProps : {})}
        startIcon={
          <Box
            component="img"
            src="/assets/icons/download-resume.svg"
            alt=""
            sx={{ width: 20, height: 20 }}
          />
        }
        sx={{
          ...(glass ? glassButtonStyles : buttonStyles),
          // keyboard focus ring (MUI turns the outline off; mouse never shows it)
          "&.Mui-focusVisible": { outline: "2px solid #00CD1F", outlineOffset: "3px" },
          ...sx,
        }}
      >
        Download Resume
      </Button>
    </CustomTooltip>
  );
}

export default DownloadResume;
