import React from "react";
import { Box } from "@mui/material";

const PRIMARY = "#00CD1F";

/**
 * Hover / drag styles for a parent that contains <HandleGrip />. Spread into
 * the parent's sx and give it the class "dragging" while dragging.
 */
export const handleGripHoverSx = {
  "&:hover .handle-pill, &.dragging .handle-pill": {
    borderColor: "rgba(0, 205, 31, 0.85)",
    boxShadow: "0 0 14px rgba(0, 255, 120, 0.45), 0 4px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)",
  },
  "&:hover .handle-dot, &.dragging .handle-dot": { background: PRIMARY, boxShadow: "0 0 4px rgba(0,255,120,0.8)" },
  "&:hover .handle-chev, &.dragging .handle-chev": { opacity: 1, color: PRIMARY },
  "&:hover .handle-chev-l, &.dragging .handle-chev-l": { transform: "translate(-3px, -50%)" },
  "&:hover .handle-chev-r, &.dragging .handle-chev-r": { transform: "translate(3px, -50%)" },
};

const Chev = ({ side }) => (
  <Box className={`handle-chev handle-chev-${side}`} aria-hidden sx={{
    position: "absolute", top: "50%",
    [side === "l" ? "right" : "left"]: "calc(100% + 3px)",
    transform: "translate(0, -50%)",
    width: 5, height: 9, color: "rgba(255,255,255,0.55)", opacity: 0.85,
    transition: "transform 0.25s ease, color 0.25s ease, opacity 0.25s ease",
    display: "flex",
  }}>
    <svg width="5" height="9" viewBox="0 0 5 9">
      <path d={side === "l" ? "M4.2 0.8 0.8 4.5l3.4 3.7" : "M0.8 0.8l3.4 3.7-3.4 3.7"} fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </Box>
);

/**
 * Drag handle between the two HUDs: a dark glass capsule that sits across the
 * channel like a knob, with three grip dots and small ‹ › arrows showing it
 * drags sideways. Turns green with a soft glow on hover / while dragging
 * (styles from handleGripHoverSx on the parent). Centred on its parent.
 */
export function HandleGrip() {
  return (
    <Box className="handle-pill" sx={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: 16, height: 58, boxSizing: "border-box",
      borderRadius: "8px",
      background: "linear-gradient(180deg, rgba(48,52,50,0.96) 0%, rgba(24,27,25,0.96) 100%)",
      border: "1px solid rgba(255,255,255,0.32)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)",
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      transition: "border-color 0.25s ease, box-shadow 0.25s ease",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
      pointerEvents: "none",
    }}>
      {[0, 1, 2].map((i) => (
        <Box key={i} className="handle-dot" sx={{
          width: 3, height: 3, borderRadius: "50%",
          background: "rgba(255,255,255,0.75)",
          transition: "background 0.25s ease, box-shadow 0.25s ease",
        }} />
      ))}
      <Chev side="l" />
      <Chev side="r" />
    </Box>
  );
}

export default function ResizeHandle({ onMouseDown, isDragging }) {
  return (
    <Box
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
      role="separator"
      data-cursor="resize"
      aria-orientation="vertical"
      aria-label="Resize chat panel"
      sx={{
        width: "14px",
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 10,
        alignSelf: "stretch",
        userSelect: "none",
        "&:hover .handle-line, &.dragging .handle-line": {
          background: "rgba(0, 255, 156, 0.45)",
          boxShadow: "0 0 10px rgba(0, 255, 156, 0.4)",
        },
        ...handleGripHoverSx,
      }}
      className={isDragging ? "dragging" : ""}
    >
      {/* Vertical divider line */}
      <Box
        className="handle-line"
        sx={{
          width: "1px",
          height: "100%",
          background: "rgba(255, 255, 255, 0.08)",
          transition: "all 0.25s ease",
        }}
      />
      <HandleGrip />
    </Box>
  );
}
