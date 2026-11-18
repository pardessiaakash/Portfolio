// "View in VR": opens the Design Lab as a WebXR space (/vr). On a Meta
// Quest the next page has an "Enter VR" button; elsewhere it's a preview.
import React from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import CustomTooltip from "../CustomTooltip";
import { playHoverTick } from "../sound/uiTick";

export default function VRButton({ sx }) {
  const navigate = useNavigate();
  return (
    <CustomTooltip title="Step inside the lab in VR" placement="left" wrapperSx={sx}>
      <Box component="a" href={`${process.env.PUBLIC_URL || ""}/vr`} aria-label="View the Design Lab in VR"
        onMouseEnter={playHoverTick}
        onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate("/vr"); }}
        sx={{
          height: 40, px: 1.5, display: "flex", alignItems: "center", gap: 1, textDecoration: "none",
          borderRadius: "10px", border: "1px solid rgba(143,143,143,0.8)",
          background: "rgba(12,14,13,0.5)", backdropFilter: "blur(13.55px)", WebkitBackdropFilter: "blur(13.55px)",
          color: "#fff", fontSize: 13, fontWeight: 500, letterSpacing: 0.3, cursor: "pointer",
          transition: "border-color 0.25s ease, color 0.25s ease",
          "& svg": { color: "#00CD1F" },
          "&:hover, &:focus-visible": { borderColor: "#00CD1F", color: "#00CD1F" },
        }}>
        <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
          <path d="M3 1.5h16a2 2 0 012 2v6.2a2 2 0 01-2 2h-4.2l-2-2.6a1.1 1.1 0 00-1.7 0l-2 2.6H3a2 2 0 01-2-2V3.5a2 2 0 012-2z"
            fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="6.5" cy="6.2" r="1.6" fill="currentColor" /><circle cx="15.5" cy="6.2" r="1.6" fill="currentColor" />
        </svg>
        View in VR
      </Box>
    </CustomTooltip>
  );
}
