import React, { useState, useEffect } from "react";
import { Box, Typography, InputBase, IconButton, CircularProgress, useMediaQuery } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import MicIcon from "@mui/icons-material/Mic";
import CustomTooltip from "./CustomTooltip";
import { useChatContext } from "./ChatContext";
import { useSpeech } from "./hooks/useSpeech";
import { transcribeAudio } from "./api/chatApi";

const PRIMARY = "#00CD1F";
const CHIP_BG = "#8F8F8F";


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
}) {
  const isMobile = useMediaQuery("(max-width:1024px)")
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

      {/* Orb — top-right, overflows the frame (Desktop only) */}
      {!isMobile && (
        <CustomTooltip title={
          <>Ask anything<br />about me<br />clicking here</>
        } placement="left">
          <Box sx={{
            position: "absolute",
            top: -44, right: -44,
            width: 110, height: 110,
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
        </CustomTooltip>
      )}

      {/* HUD frame + content */}
      <Box sx={{
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

        clipPath: isMobile ? "none" : "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",

        // This mask cuts a perfect circle out of the top right corner to hug the orb (Desktop only)
        maskImage: isMobile ? "none" : "radial-gradient(circle at calc(100% - 11px) 11px, transparent 61px, black 61.5px)",
        WebkitMaskImage: isMobile ? "none" : "radial-gradient(circle at calc(100% - 11px) 11px, transparent 61px, black 61.5px)",

        border: "1px solid transparent",

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
      }}>
        {/* Messages area */}
        <Box
          onWheel={(e) => e.stopPropagation()}
          sx={{
            flex: 1, overflowY: "auto",
            pt: isMobile ? "20px" : "75px", // Adjusted pt for mobile (no orb) vs desktop (orb present)
            px: "20px", pb: "8px",
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
              p: "14px 16px",
              mb: 1.5,
            }}>
              <Typography sx={{ fontSize: "13px", lineHeight: 1.75, color: "rgba(255,255,255,0.85)" }}>
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
          <Box sx={{ display: "flex", gap: "8px", px: "20px", pb: "10px", flexWrap: "wrap" }}>
            {chips.map((s) => (
              <Box key={s} onClick={() => sendMessage(s)} sx={{
                px: "14px", py: "7px",
                borderRadius: "20px",
                background: CHIP_BG,
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#000000",
                fontSize: "12px", fontWeight: 600,
                cursor: "pointer",
                transition: "border-color 0.2s, color 0.2s"
              }}>{s}</Box>
            ))}
          </Box>
        )}

        {/* Input bar */}
        <Box sx={{ px: "15px", pb: "20px", pt: "10px" }}>
          <Box sx={{
            display: "flex", alignItems: "flex-end", gap: "9px",
            minHeight: "54px",
            boxSizing: "border-box",
            background: "rgba(61, 76, 75, 0.92)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "7px",
            boxShadow: "0 10px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.04)",
            px: "12px",
            py: "8px",
          }}>
            <InputBase
              multiline
              maxRows={6}
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
                color: "#f4f6f5", fontSize: "14px",
                lineHeight: 1.5,
                pt: "7px",
                pb: "7px",
                "& textarea::placeholder": { color: isListening ? PRIMARY : "rgba(255,255,255,0.62)", opacity: 1 },
                "& textarea::-webkit-scrollbar": { width: "4px" },
                "& textarea::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.2)", borderRadius: "2px" },
              }}
            />
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
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
