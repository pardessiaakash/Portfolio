// The site's standard button (same as "Download Resume" on the home HUD):
// dark liquid glass, 10px corners, the Figma gradient border that turns
// while hovered. Used for the loader's Enter button and Skip the cinematic.
import React, { forwardRef } from "react";
import { Box } from "@mui/material";
import { glassSx, spinBorderSx, useSpinOnHover } from "./glass";

const GlassButton = forwardRef(function GlassButton({ children, icon, sx, size = "md", ...props }, ref) {
  const spin = useSpinOnHover();
  const setRef = (el) => {
    spin.ref.current = el;
    if (typeof ref === "function") ref(el); else if (ref) ref.current = el;
  };
  const lg = size === "lg";
  return (
    <Box component="button" ref={setRef} {...spin.hoverProps} {...props} sx={{
      position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: "10px", cursor: "pointer", fontFamily: "inherit",
      px: lg ? "28px" : "18px", py: lg ? "14px" : "12px", borderRadius: "10px",
      color: "#fff", fontSize: lg ? "15px" : "13px", fontWeight: 500, lineHeight: 1.2,
      ...glassSx(),
      ...spinBorderSx(1),
      border: "1px solid transparent",
      "&::before": { ...spinBorderSx(1)["&::before"], inset: "-1px" },
      transition: "background-color 0.2s ease",
      "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
      "&:active": { backgroundColor: "rgba(255,255,255,0.09)" },
      "&:focus-visible": { outline: "2px solid #00CD1F", outlineOffset: "3px" },
      ...sx,
    }}>
      {icon}
      {children}
    </Box>
  );
});

export default GlassButton;
