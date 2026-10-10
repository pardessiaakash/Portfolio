import React, { useState, useEffect } from "react";
import { Box, Typography, InputBase, IconButton, CircularProgress, useMediaQuery } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import MicIcon from "@mui/icons-material/Mic";
import { useChatContext } from "./ChatContext";
import { useSpeech } from "./hooks/useSpeech";
import { transcribeAudio } from "./api/chatApi";
import { chatHudPath, hudChannel, useElementSize, HudOutline } from "./hud/hudShapes";
import { glassSx, glassPanelSx, spinBorderSx, useSpinOnHover } from "./hud/glass";
import CustomTooltip from "./CustomTooltip";

const PRIMARY = "#00CD1F";
const CHIP_BG = "#8F8F8F";

/** Glass icon button (mic / send) for the home-screen HUD; border turns on hover. */
function GlassIconButton({ active = false, sx, children, ...props }) {
  const spin = useSpinOnHover();
  return (
    <IconButton
      ref={spin.ref}
      {...spin.hoverProps}
      size="small"
      {...props}
      sx={{
        ...glassSx({ shadow: false }),
        ...spinBorderSx(1),
        width: 36, height: 36, p: 0, flexShrink: 0,
        borderRadius: "10px",
        color: active ? PRIMARY : "#fff",
        transition: "background-color 0.2s, color 0.2s",
        "&:hover": { ...glassSx({ shadow: false }), backgroundColor: "rgba(255,255,255,0.08)" },
        "&.Mui-disabled": { color: "rgba(255,255,255,0.3)" },
        "&.Mui-disabled::before": { opacity: 0.35 },
        "&:focus-visible": { outline: "1px solid #00CD1F", outlineOffset: "2px" },
        ...sx,
      }}
    >
      {children}
    </IconButton>
  );
}

// Quiet gray border for the chat chips and the input box (no green).
const CHAT_BORDER = "rgba(255,255,255,0.22)";
const CHAT_BORDER_ACTIVE = "rgba(255,255,255,0.40)";

/** Glass suggestion chip for the home-screen HUD: gray border, minimal hover. */
function GlassChip({ label, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        ...glassSx({ shadow: false }),
        px: "21px", py: "6px",
        whiteSpace: "nowrap", flexShrink: 0,
        borderRadius: "20px",
        border: `1px solid ${CHAT_BORDER}`,
        color: "rgba(255,255,255,0.86)",
        font: "inherit",
        fontSize: "11px", fontWeight: 600,
        cursor: "pointer",
        transition: "color 0.25s ease, border-color 0.25s ease, background-color 0.25s ease",
        // minimal hover: border and text brighten a touch, faint fill
        "&:hover": { color: "#fff", borderColor: CHAT_BORDER_ACTIVE, backgroundColor: "rgba(255,255,255,0.04)" },
        "&:focus-visible": { outline: `1px solid ${CHAT_BORDER_ACTIVE}`, outlineOffset: "2px" },
      }}
    >
      {label}
    </Box>
  );
}

// Fade for the top of the home-screen chat (fixed to the visible area, not
// the scrolled content): 10% under the orb, ~35% just below, then 100%.
const CHAT_TOP_FADE =
  "linear-gradient(to bottom, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 70px, rgba(0,0,0,0.35) 115px, rgba(0,0,0,0.35) 135px, #000 185px)";


/**
 * Shared chatbot panel — homepage right col & project detail right panel.
 * Props:
 *   orb       — orb video src
 *   hudBg     — HUD frame SVG (default: portfolio-chantbot.svg matches design)
 *   chips     — suggestion chip labels
 *   wrapperSx — extra sx on outer wrapper
 */
export default function ChatbotPanel({
  orb = "/assets/orb/Idle State.mp4",
  hudBg = "/assets/images/hud/portfolio-chantbot.svg",
  chips = ["View Case Study", "How I Design", "Start Chat"],
  wrapperSx = {},
  requestedInput = null,
  // Orb geometry (desktop). Defaults keep the original look on inner pages;
  // the home screen passes the size measured from the intro's last HUD frame.
  orbSize = 110,
  orbOffset = -44,
  // Home-screen layout matched to the intro's last HUD frame: greeting sits
  // above the chips, chips stay on one row, tighter type.
  hud = false,
  // Experiment: cut the panel to the chat HUD shape from the Figma frame
  // "Main_Landing_Page_For Claude" (desktop only).
  hudShape = false,
  // Width of the gap to the main HUD; the left edge then runs parallel to
  // the main HUD's right edge (equal gap along the diagonal too).
  hudChannelGap = null,
  // Exact left-edge geometry ({ inset, stepY, step, rUpper, rLower }) for a
  // page whose HUD layout differs from the home screen (the category page).
  hudChannelShape = null,
  // Taller input box with the mic / send buttons nearer its right edge
  // (category page); the home screen keeps the default.
  tallInput = false,
  // Fade messages out toward the top of the chat (home screen).
  fadeTop = false,
}) {
  // Centre of the orb, measured from the panel's top-right corner. The panel
  // mask cuts a circle at this point so the frame hugs the orb.
  const orbCenter = orbOffset + orbSize / 2;
  const orbCut = orbSize / 2 + 6;
  const isMobile = useMediaQuery("(max-width:1024px)")

  const [shapeRef, shapeSize] = useElementSize();
  const useShape = hudShape && !isMobile;
  const shapePath = useShape && shapeSize.w && shapeSize.h
    ? chatHudPath(shapeSize.w, shapeSize.h, {
        // orb centre and radius in this panel's coordinates
        cx: shapeSize.w - orbCenter, cy: orbCenter, r: orbSize / 2,
      }, undefined, hudChannelShape || (hudChannelGap != null ? hudChannel(shapeSize.h, hudChannelGap) : null))
    : null;
  const { messages, isLoading, sendMessage, messagesEndRef } = useChatContext();
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (requestedInput?.text) {
      setInputValue(requestedInput.text);
    }
  }, [requestedInput]);

  const handleSend = () => {
    if (inputValue.trim()) { sendMessage(inputValue); setInputValue(""); }
  };

  const { isListening, interimText, toggleListening, isProcessing } = useSpeech({
    onTranscript: (text) => setInputValue((p) => p ? p + " " + text : text),
    useBackend: true,
    onBackendTranscript: async (blob) => {
      try {
        const data = await transcribeAudio(blob);
        if (data.transcript) setInputValue((p) => p ? p + " " + data.transcript : data.transcript);
      } catch (e) { console.error(e); }
    },
  });

  return (
    /* Outer wrapper — position:relative so orb can overflow */
    <Box sx={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", ...wrapperSx }}>

      {/* Orb — top-right, overflows the frame (Desktop only). No hover
          tooltip: the timed guide popup already points here. */}
      {!isMobile && (
          <Box aria-hidden sx={{
            position: "absolute",
            top: orbOffset, right: orbOffset,
            width: orbSize, height: orbSize,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            border: "1.5px solid rgba(0,255,150,0.3)",
            boxShadow: "0 0 32px rgba(0,255,150,0.2), inset 0 0 20px rgba(0,255,150,0.07)",
            overflow: "hidden",
            zIndex: 20,
            flexShrink: 0,
          }}>
            <video key={orb} src={orb} autoPlay loop muted playsInline
              style={{ width: "160%", height: "160%", objectFit: "cover", mixBlendMode: "screen", marginLeft: "-30%", marginTop: "-30%" }} />
          </Box>
      )}

      {/* HUD frame + content */}
      <Box ref={shapeRef} sx={{
        flex: 1,
        display: "flex", flexDirection: "column",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "20px",
        opacity: 0.95,
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
        transform: "translateZ(0)", // Force compositing so maskImage properly clips the scrolling child

        border: "1px solid transparent",

        ...(useShape ? {
          // Figma HUD shape: the outline is the clip, the border is drawn by
          // HudOutline, and the orb cut is part of the shape (no mask needed)
          borderRadius: shapePath ? 0 : "20px",
          clipPath: shapePath ? `path("${shapePath}")` : "none",
          // the shape does the clipping; overflow:hidden would also cut the
          // outline where it runs over the 1px border
          overflow: shapePath ? "visible" : "hidden",
          // dark liquid glass (edge, rim light and glow come from HudOutline)
          ...glassPanelSx,
          opacity: 1,
        } : {
        clipPath: isMobile ? "none" : "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",

        // This mask cuts a perfect circle out of the top right corner to hug the orb (Desktop only)
        maskImage: isMobile ? "none" : `radial-gradient(circle at calc(100% - ${orbCenter}px) ${orbCenter}px, transparent ${orbCut}px, black ${orbCut + 0.5}px)`,
        WebkitMaskImage: isMobile ? "none" : `radial-gradient(circle at calc(100% - ${orbCenter}px) ${orbCenter}px, transparent ${orbCut}px, black ${orbCut + 0.5}px)`,

        background: `
      linear-gradient(50deg, #0A0A0A 0%, #1B1B1B 100%) padding-box,
      linear-gradient(
        11deg,
        #00CD1F 0%,
        #8C8C8C 6%,
        #8C8C8C 95%,
        #00CD1F 100%
      ) border-box
    `,
        }),
      }}>
        {useShape && <HudOutline d={shapePath} w={shapeSize.w} h={shapeSize.h} border={1} />}
        {/* Messages area (announced to screen readers as Nova replies) */}
        <Box
          role="log"
          aria-live="polite"
          aria-label="Conversation with Nova"
          onWheel={(e) => e.stopPropagation()}
          sx={{
            flex: 1, overflowY: "auto",
            pt: isMobile ? "20px" : "75px", // Adjusted pt for mobile (no orb) vs desktop (orb present)
            pl: hud ? "14px" : "20px", pr: hud ? "28px" : "20px", pb: hud ? "16px" : "8px",
            // home screen: the greeting sits just above the chips (also in the split view)
            ...((hud || fadeTop) && messages.length === 0 ? { display: "flex", flexDirection: "column", justifyContent: "flex-end" } : {}),
            // Messages scrolling up under the orb fade out instead of being
            // cut off: top band 10%, next band ~35%, the rest fully visible.
            // (only once there are messages, so the greeting is never faded)
            ...(fadeTop && !isMobile && messages.length > 0 ? { maskImage: CHAT_TOP_FADE, WebkitMaskImage: CHAT_TOP_FADE } : {}),
            "&::-webkit-scrollbar": { width: "3px" },
            "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.1)", borderRadius: "2px" },
            textAlign: "left"
          }}>
          {messages.length === 0 ? (
            /* Greeting bubble */
            <Box sx={{
              background: "rgba(20,26,20,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              p: hud ? "13px 22px" : "14px 16px",
              mb: hud ? 0 : 1.5,
            }}>
              <Typography sx={{ fontSize: "13px", lineHeight: hud ? 1.35 : 1.75, color: "rgba(255,255,255,0.85)" }}>
                Hi!<br />
                I'm <span style={{ color: '#fff', fontWeight: 700 }}>Nova</span>, Akash's AI Assistant.<br />
                I can walk you through projects, thinking, and decisions.<br />
                Where should we start?
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {messages.map((msg) => (
                <Box key={msg.id} sx={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  background: msg.role === "user" ? "rgba(0,255,150,0.08)" : "rgba(20,26,20,0.85)",
                  border: msg.role === "user" ? "1px solid rgba(0,255,150,0.2)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px", px: "14px", py: "10px",
                  maxWidth: "88%", color: "#fff", fontSize: "13px", lineHeight: 1.6,
                }}>{msg.content}</Box>
              ))}
              {isLoading && <CircularProgress size={16} sx={{ color: PRIMARY, alignSelf: "flex-start", mt: 0.5 }} />}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Box>

        {/* Suggestion chips */}
        {messages.length === 0 && (
          <Box sx={{
            display: "flex", gap: "8px", px: hud ? "14px" : "20px", pb: hud ? "4px" : "10px",
            flexWrap: hud ? "nowrap" : "wrap",
            ...(hud ? { overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } } : {}),
          }}>
            {chips.map((s) => useShape ? (
              <GlassChip key={s} label={s} onClick={() => sendMessage(s)} />
            ) : (
              <Box key={s} onClick={() => sendMessage(s)} sx={{
                px: hud ? "21px" : "14px", py: hud ? "6px" : "7px",
                ...(hud ? { whiteSpace: "nowrap", flexShrink: 0 } : {}),
                borderRadius: "20px",
                background: CHIP_BG,
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#000000",
                fontSize: hud ? "11px" : "12px", fontWeight: 600,
                cursor: "pointer",
                transition: "border-color 0.2s, color 0.2s"
              }}>{s}</Box>
            ))}
          </Box>
        )}

        {/* Input bar */}
        <Box sx={{ px: hud ? "14px" : "15px", pb: hud ? "15px" : "20px", pt: "10px" }}>
          <Box sx={{
            display: "flex", alignItems: "flex-end", gap: "9px",
            minHeight: tallInput ? "60px" : hud ? "48px" : "54px",
            boxSizing: "border-box",
            background: "rgba(61, 76, 75, 0.92)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "7px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.04)",
            px: "12px",
            ...(tallInput ? { pl: "16px", pr: "7px" } : {}),
            py: hud ? "5.5px" : "8px",
            ...(hud ? { alignItems: "center" } : {}),
            // HUD glass, matching the panels: blurred backdrop, lit top edge,
            // quiet gray border and 10px corners (lighter while typing)
            ...(useShape ? {
              ...glassSx(),
              border: `1px solid ${CHAT_BORDER}`,
              borderRadius: "10px",
              transition: "border-color 0.25s ease",
              "&:focus-within": { borderColor: CHAT_BORDER_ACTIVE },
            } : {}),
          }}>
            <InputBase
              multiline
              maxRows={6}
              inputProps={{ "aria-label": "Ask Nova anything" }}
              placeholder={isListening ? "Listening..." + (interimText ? ` ${interimText}` : "") : "Ask anything"}
              fullWidth value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading || isProcessing}
              sx={{
                color: "#f4f6f5", fontSize: hud ? "12px" : "14px",
                lineHeight: 1.5,
                pt: "7px",
                pb: "7px",
                "& textarea::placeholder": { color: isListening ? PRIMARY : "rgba(255,255,255,0.62)", opacity: 1 },
                "& textarea::-webkit-scrollbar": { width: "4px" },
                "& textarea::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.2)", borderRadius: "2px" },
              }}
            />
            {useShape ? (
              <>
                <CustomTooltip title={isListening ? "Stop listening" : "Voice input"} placement="top">
                <GlassIconButton onClick={toggleListening} active={isListening}
                  aria-label={isListening ? "Stop listening" : "Start voice input"}>
                  <MicIcon sx={{ fontSize: 20 }} />
                </GlassIconButton>
                </CustomTooltip>
                <CustomTooltip title="Send" placement="top">
                <GlassIconButton onClick={handleSend} disabled={isLoading || isProcessing} aria-label="Send message">
                  {isLoading || isProcessing
                    ? <CircularProgress size={15} sx={{ color: "#fff" }} />
                    : <ArrowUpwardIcon sx={{ fontSize: 21 }} />}
                </GlassIconButton>
                </CustomTooltip>
              </>
            ) : (<>
            <IconButton onClick={toggleListening} size="small"
              aria-label={isListening ? "Stop listening" : "Start voice input"}
              sx={{
                width: 36, height: 36, color: isListening ? PRIMARY : "#fff", p: 0, flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.22)", borderRadius: "10px",
                background: "rgba(14,20,20,0.22)",
                "&:hover": { background: "rgba(255,255,255,0.08)" },
              }}>
              <MicIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton onClick={handleSend} size="small" disabled={isLoading || isProcessing}
              sx={{
                width: 36, height: 36, color: "#fff", borderRadius: "10px", p: 0, flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.22)", background: "rgba(14,20,20,0.22)",
                "&:hover": { background: "rgba(255,255,255,0.08)" },
                "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" },
              }}>
              {isLoading || isProcessing
                ? <CircularProgress size={15} sx={{ color: "#fff" }} />
                : <ArrowUpwardIcon sx={{ fontSize: 21 }} />}
            </IconButton>
            </>)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
