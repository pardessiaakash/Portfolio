import React from "react";
import { Box } from "@mui/material";

export default function ResizeHandle({ onMouseDown, isDragging }) {
  return (
    <Box
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
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
        "&:hover .handle-pill, &.dragging .handle-pill": {
          background: "#00CD1F",
          boxShadow: "0 0 12px rgba(0, 255, 156, 0.8)",
          borderColor: "rgba(0, 255, 156, 0.5)",
        },
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
      
      {/* Drag handle pill */}
      <Box
        className="handle-pill"
        sx={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          width: "8px",
          height: "42px",
          borderRadius: "4px",
          background: "rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(4px)",
          transition: "all 0.25s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          "&::before, &::after, & .grip-dot": {
            content: '""',
            width: "2px",
            height: "2px",
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.6)",
          }
        }}
      >
        <div className="grip-dot" />
      </Box>
    </Box>
  );
}
