// Turns the interface sounds (card hover) on and off. Remembered per browser.
import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import CustomTooltip from "../CustomTooltip";
import { isMuted, setMuted, onMuteChange } from "../sound/uiTick";

export default function SoundToggle({ sx }) {
  const [muted, set] = useState(isMuted);
  useEffect(() => onMuteChange(set), []);
  return (
    <CustomTooltip title={muted ? "Sound off" : "Sound on"} placement="left" wrapperSx={sx}>
      <Box component="button" type="button" aria-pressed={!muted}
        aria-label="Interface sounds" onClick={() => setMuted(!muted)}
        sx={{
          width: 40, height: 40, p: 0, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "10px", border: "1px solid rgba(143,143,143,0.8)",
          background: "rgba(12,14,13,0.5)", backdropFilter: "blur(13.55px)", WebkitBackdropFilter: "blur(13.55px)",
          color: muted ? "rgba(255,255,255,0.6)" : "#00CD1F", cursor: "pointer",
          transition: "border-color 0.25s ease, color 0.25s ease",
          "&:hover, &:focus-visible": { borderColor: "rgba(255,255,255,0.85)" },
        }}>
        <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden>
          <path d="M1 5.5h3.5L9 1.5v13l-4.5-4H1z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          {muted
            ? <path d="M12 5.5l5 5M17 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            : <path d="M12 5a4 4 0 010 6M14.5 2.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
        </svg>
      </Box>
    </CustomTooltip>
  );
}
