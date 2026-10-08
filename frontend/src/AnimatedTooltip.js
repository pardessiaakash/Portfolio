import { useEffect, useId, useRef, useState } from "react";
import { Box, IconButton, Typography, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
/**
 * AnimatedTooltip
 * ----------------
 * Small "hint" bubble with:
 *  - a curved, dashed arrow that draws itself in and points at a target element
 *  - a green progress-bar underline that fills over `duration` ms, then auto-dismisses
 *  - desktop-only (hidden below 1024px, matching the app's existing breakpoint)
 *
 * Usage (absolute-position it relative to a positioned ancestor near your target):
 *
 *   <Box sx={{ position: "absolute", top: 40, right: 260 }}>
 *     <AnimatedTooltip
 *       text={"Ask anything about me\nclicking here"}
 *       curve="down-right"
 *       visible={showAvatarHint}
 *       onDismiss={() => setShowAvatarHint(false)}
 *     />
 *   </Box>
 *
 * `curve` picks which corner the arrow points toward, relative to the bubble:
 *   "down-right" | "down-left" | "up-right" | "up-left"
 */
export default function AnimatedTooltip({
  text = "Ask anything about me\nclicking here",
  visible = true,
  duration = 10000,
  onDismiss,
  curve = "down-right",
  width = 220,
}) {
  const isMobile = useMediaQuery("(max-width:1024px)");
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    if (!visible || isMobile) return;
    setClosing(false);
    timerRef.current = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isMobile, duration]);

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => onDismiss?.(), 280);
  };

  if (isMobile || !visible) return null;

  // gentle S-curve paths, arrow always travels toward the bubble's pointed corner
  const paths = {
    "down-right": "M6 6 C 45 8, 78 42, 108 82",
    "down-left": "M108 6 C 69 8, 36 42, 6 82",
    "up-right": "M6 82 C 45 80, 78 46, 108 6",
    "up-left": "M108 82 C 69 80, 36 46, 6 6",
  };
  const arrowBoxPos = {
    "down-right": { top: "55%", left: "98%" },
    "down-left": { top: "100%", right: "6%" },
    "up-right": { bottom: "48%", left: "97%" },
    "up-left": { bottom: "100%", right: "6%" },
  }[curve];

  return (
    <Box
      sx={{
        position: "relative",
        width,
        zIndex: 200,
        opacity: closing ? 0 : 1,
        transform: closing ? "translateY(-4px) scale(0.98)" : "translateY(0) scale(1)",
        transition: "opacity 0.28s ease, transform 0.28s ease",
      }}
    >
      {/* Bubble */}
      <Box
        sx={{
          position: "relative",
          borderRadius: "24px",
          p: "14px 25px",
          background: "linear-gradient(135deg, #1a1d1a 0%, #0d0f0d 100%)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)",
          animation: "tooltipPopIn 0.35s ease",
        }}
      >
        {/* <Box
          component="button"
          aria-label="Dismiss hint"
          onClick={dismiss}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            color: "rgba(255,255,255,0.45)",
            fontSize: 14,
            lineHeight: 1,
            "&:hover": { color: "#fff" },
          }}
        >
          ×
        </Box> */}
         <IconButton
            size="small"
             aria-label="Dismiss hint"
              onClick={dismiss}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 18,
              height: 18,
              bgcolor: "#343838",
              color: "#fff",
              border: "1px solid rgba(0,255,120,.35)",

              "&:hover": {
                bgcolor: "#404444",
              },

              "& svg": {
                fontSize: 14,
              },
            }}
          >
            <CloseIcon />
          </IconButton>

        <Typography
          sx={{
            color: "rgba(255,255,255,0.9)",
            fontSize: "14px",
            fontWeight: 500,
            lineHeight: 1.5,
            whiteSpace: "pre-line",
            letterSpacing: "0.02em",
          }}
        >
          {text}
        </Typography>

        {/* progress track */}
        <Box
          sx={{
            mt: "10px",
            height: "2px",
            width: "100%",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.14)",
            overflow: "hidden",
          }}
        >
          <Box
            key={visible ? "run" : "idle"} // restart the fill whenever it (re)appears
            sx={{
              height: "100%",
              width: "100%",
              transformOrigin: "left center",
              background: "linear-gradient(90deg, #00CD1F, #7CFF95)",
              transform: "scaleX(0)",
              animation: closing ? "none" : `progressFill ${duration}ms linear forwards`,
            }}
          />
        </Box>
      </Box>

      {/* Curved dashed arrow, drawn with SVG so the arrowhead auto-orients along the path */}
      <Box sx={{ position: "absolute", width: 114, height: 88, pointerEvents: "none", ...arrowBoxPos }}>
        <svg width="114" height="88" viewBox="0 0 114 88" fill="none">
          <defs>
            <marker
              id={`arrowhead-${uid}`}
              markerWidth="8"
              markerHeight="8"
              refX="5"
              refY="4"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#ffffff" opacity="0.9" />
            </marker>
          </defs>
          <path
            d={paths[curve]}
            stroke="#ffffff"
            strokeOpacity="0.85"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            markerEnd={`url(#arrowhead-${uid})`}
            style={{
              strokeDasharray: "5 5",
              opacity: 0,
              animation: "drawArrow 0.5s ease-out 0.15s forwards",
            }}
          />
        </svg>
      </Box>

      <style>{`
        @keyframes tooltipPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes progressFill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes drawArrow {
          from { opacity: 0; transform: scale(0.85); transform-origin: 0% 0%; }
          to   { opacity: 1; transform: scale(1); transform-origin: 0% 0%; }
        }
      `}</style>
    </Box>
  );
}