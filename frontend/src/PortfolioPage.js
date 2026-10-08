import { Box, Button, Typography, IconButton, InputBase, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import MicIcon from "@mui/icons-material/Mic";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AudioButton from "./AudioButton";
import { useChat } from "./hooks/useChat";
import { useSpeech } from "./hooks/useSpeech";
import { transcribeAudio, fetchCategories } from "./api/chatApi";
import { useResizableChatbot } from "./hooks/useResizableChatbot";
import ResizeHandle from "./ResizeHandle";

// ─── Styled ───────────────────────────────────────────────────────────────────

const PageWrapper = styled(Box)({
  height: "100vh",
  width: "100%",
  backgroundImage: "url('/assets/images/bg-images/Background.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundColor: "#05070a",
  position: "relative",
  overflow: "hidden",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
});

const CategoryTab = styled(Box)(({ active }) => ({
  position: "relative",
  padding: "9px 32px 10px",
  fontSize: "13px",
  fontWeight: active ? 600 : 400,
  color: active ? "#00CD1F" : "#555",
  cursor: "pointer",
  whiteSpace: "nowrap",
  letterSpacing: "0.3px",
  transition: "color 0.2s ease",
  marginBottom: "-1px",
  marginRight: "-8px",
  zIndex: active ? 3 : 1,
  userSelect: "none",
  isolation: "isolate",
  "&::before": {
    content: '""', position: "absolute", inset: "-1px",
    clipPath: "polygon(14px 0%, calc(100% - 14px) 0%, 100% 100%, 0% 100%)",
    background: active ? "rgba(0,205,31,0.18)" : "rgba(255,255,255,0.06)",
    zIndex: -1,
  },
  "&::after": {
    content: '""', position: "absolute", inset: 0,
    clipPath: "polygon(14px 0%, calc(100% - 14px) 0%, 100% 100%, 0% 100%)",
    background: active ? "rgba(8,14,8,0.97)" : "rgba(8,10,8,0.55)",
    zIndex: -1,
  },
  "& span": { position: "relative", zIndex: 1 },
  "&:hover": { color: active ? "#00CD1F" : "#888" },
}));

const CategoryCard = styled(Box)({
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "14px",
  backdropFilter: "blur(12px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  cursor: "pointer",
  transition: "all 0.25s ease",
  "&:hover": {
    border: "1px solid rgba(0,205,31,0.45)",
    boxShadow: "0 0 18px rgba(0,205,31,0.12)",
    background: "rgba(0,205,31,0.04)",
  },
});

// Mobile pill tab
const PillTab = styled(Button)(({ active }) => ({
  borderRadius: "20px",
  padding: "6px 22px",
  textTransform: "none",
  fontSize: "12px",
  border: active ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.15)",
  color: active ? "#fff" : "#666",
  background: active ? "rgba(255,255,255,0.06)" : "transparent",
  minWidth: 0,
  "&:hover": { background: "rgba(255,255,255,0.08)" },
}));

const DEFAULT_CATEGORIES = [
  { label: "UI/UX", route: "UI/UX" },
  { label: "Social Media", route: "Social Media" },
  { label: "Videos", route: "Video" },
  { label: "Print Media", route: "Print-Designs" },
];

const DEFAULT_DESKTOP_CATEGORIES = [
  { label: "Print-Designs", icon: "/assets/icons/print-designs.svg" },
  { label: "Social Media", icon: "/assets/icons/social-media.svg" },
  { label: "UI/UX", icon: "/assets/icons/UX.svg" },
  { label: "Video", icon: "/assets/icons/Video.svg" },
  { label: "XR", icon: "/assets/icons/XR.svg" },
];

const DEFAULT_MOBILE_CATEGORIES = [
  { label: "UI/UX", icon: "/assets/icons/UX.svg" },
  { label: "Social Media", icon: "/assets/icons/social-media.svg" },
  { label: "XR", icon: "/assets/icons/XR.svg" },
  { label: "Video", icon: "/assets/icons/Video.svg" },
  { label: "Print-Designs", icon: "/assets/icons/print-designs.svg" },
];

const iconMapping = {
  "UI/UX": "/assets/icons/UX.svg",
  "Social Media": "/assets/icons/social-media.svg",
  "Videos": "/assets/icons/Video.svg",
  "Video": "/assets/icons/Video.svg",
  "Print Media": "/assets/icons/print-designs.svg",
  "Print-Designs": "/assets/icons/print-designs.svg",
  "XR": "/assets/icons/XR.svg"
};

// ─── Chatbot Panel ────────────────────────────────────────────────────────────

function ChatbotPanel() {
  const { messages, isLoading, sendMessage, messagesEndRef } = useChat();
  const [inputValue, setInputValue] = useState("");

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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Messages */}
      <Box sx={{
        flex: 1, overflowY: "auto", px: 2.5, pt: 3, pb: 1,
        "&::-webkit-scrollbar": { width: "3px" },
        "&::-webkit-scrollbar-thumb": { background: "rgba(0,205,31,0.2)", borderRadius: "2px" },
      }}>
        {messages.length === 0 ? (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ color: "#aaa", fontSize: "13px", lineHeight: 1.8 }}>
              Hi!<br />
              I'm <span style={{ color: "#00CD1F", fontWeight: 600 }}>Nova</span>, Akash's AI Assistant.<br />
              I can walk you through projects, thinking, and decisions.<br />
              Where should we start?
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {messages.map((msg) => (
              <Box key={msg.id} sx={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "rgba(0,205,31,0.1)" : "rgba(255,255,255,0.05)",
                border: msg.role === "user" ? "1px solid rgba(0,205,31,0.25)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px", px: 2, py: 1,
                maxWidth: "85%", color: "#fff", fontSize: "13px", lineHeight: 1.5,
              }}>{msg.content}</Box>
            ))}
            {isLoading && <CircularProgress size={18} sx={{ color: "#00CD1F", alignSelf: "flex-start" }} />}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Suggestion chips */}
      {messages.length === 0 && (
        <Box sx={{ display: "flex", gap: 1, px: 2.5, pb: 1.5, flexWrap: "wrap" }}>
          {["View Case Study", "About Akash"].map((s) => (
            <Box key={s} onClick={() => sendMessage(s)} sx={{
              px: 2, py: 0.7, borderRadius: "20px",
              background: "rgba(0,205,31,0.12)",
              border: "1px solid rgba(0,205,31,0.35)",
              color: "#00CD1F", fontSize: "11px", fontWeight: 600, cursor: "pointer",
              "&:hover": { background: "rgba(0,205,31,0.2)" },
            }}>{s}</Box>
          ))}
        </Box>
      )}

      {/* Input bar */}
      <Box sx={{ px: "15px", pb: "20px", pt: "10px" }}>
        <Box sx={{
          display: "flex", alignItems: "center", gap: "9px",
          minHeight: "54px", boxSizing: "border-box",
          background: "rgba(61, 76, 75, 0.92)",
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: "7px", px: "12px",
          boxShadow: "0 10px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}>
          <InputBase
            placeholder={isListening ? "Listening..." + (interimText ? ` ${interimText}` : "") : "Ask anything"}
            fullWidth value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading || isProcessing}
            sx={{ color: "#f4f6f5", fontSize: "14px", "& input::placeholder": { color: isListening ? "#00CD1F" : "rgba(255,255,255,0.62)", opacity: 1 } }}
          />
          <IconButton onClick={toggleListening} size="small" aria-label={isListening ? "Stop listening" : "Start voice input"} sx={{ width: 36, height: 36, color: isListening ? "#00CD1F" : "#fff", p: 0, flexShrink: 0, border: "1px solid rgba(255,255,255,0.22)", borderRadius: "10px", background: "rgba(14,20,20,0.22)", "&:hover": { background: "rgba(255,255,255,0.08)" } }}>
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
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PortfolioPage = () => {
  const navigate = useNavigate();
  const { widthPercent, isDragging, handleMouseDown, containerRef } = useResizableChatbot(28);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [desktopCats, setDesktopCats] = useState(DEFAULT_DESKTOP_CATEGORIES);
  const [mobileCats, setMobileCats] = useState(DEFAULT_MOBILE_CATEGORIES);

  useEffect(() => {
    fetchCategories().then(data => {
      if (data && data.length > 0) {
        setCategories(data.map(cat => ({ label: cat, route: cat })));
        const mappedWithIcons = data.map(cat => ({
          label: cat,
          icon: iconMapping[cat] || "/assets/icons/UX.svg"
        }));
        setDesktopCats(mappedWithIcons);
        setMobileCats(mappedWithIcons);
      }
    }).catch(console.error);
  }, []);

  return (
    <PageWrapper>
      <AudioButton />

      {/* ══════════════ DESKTOP ══════════════ */}
      <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", height: "100%", p: "16px", position: "relative", zIndex: 1 }}>

        {/* Row 1: Category tabs — same as ProjectDetailPage */}
        <Box sx={{ display: "flex", alignItems: "flex-end", mb: 0, pl: "2px", flexShrink: 0 }}>
          {categories.map((cat) => (
            <CategoryTab key={cat.route} active={0}
              onClick={() => navigate(`/portfolio/${encodeURIComponent(cat.route)}`)}>
              <span>{cat.label}</span>
            </CategoryTab>
          ))}
        </Box>

        {/* Row 2: Body — main panel + chatbot */}
        <Box ref={containerRef} sx={{ flex: 1, display: "flex", gap: "0px", minHeight: 0 }}>

          {/* ── Col 8: Main panel ── */}
          <Box sx={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
            {/* Dark bg */}
            <Box sx={{
              position: "absolute", inset: 0,
              background: "rgba(8,12,8,0.85)",
              borderRadius: "0 12px 12px 12px",
              backdropFilter: "blur(20px)",
              zIndex: 0,
            }} />
            {/* HUD frame */}
            <Box alt=""
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", zIndex: 2 }} />

            {/* Inner content */}
            <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", p: "12px 16px 36px 16px", zIndex: 1 }}>

              {/* Back button row — same style as project tabs row */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexShrink: 0 }}>
                <Box onClick={() => navigate('/')} sx={{
                  width: 28, height: 28, borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff", flexShrink: 0,
                  "&:hover": { background: "rgba(255,255,255,0.08)" },
                }}>
                  <ArrowBackIosNewIcon sx={{ fontSize: 12 }} />
                </Box>
                <Typography sx={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>
                  Welcome!
                </Typography>
                <Typography sx={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>
                  Here is my work
                </Typography>
              </Box>

              {/* Category grid */}
              <Box sx={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Box sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 175px)",
                  gridTemplateRows: "repeat(3, 115px)",
                  gap: "14px",
                }}>
                  {desktopCats.map((cat, i) => (
                    <CategoryCard
                      key={i}
                      onClick={() => navigate(`/portfolio/${encodeURIComponent(cat.label)}`)}
                      sx={{ ...(i === 4 && { gridColumn: "1 / 2" }) }}
                    >
                      <Box component="img" src={cat.icon} alt={cat.label} sx={{ width: 36, height: 36, objectFit: "contain" }} />
                      <Typography sx={{ fontSize: "11px", color: "#bbb", letterSpacing: "0.5px", fontWeight: 500 }}>
                        {cat.label}
                      </Typography>
                    </CategoryCard>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Resize Handle */}
          <ResizeHandle onMouseDown={handleMouseDown} isDragging={isDragging} />

          {/* ── Col 3: Chatbot panel ── */}
          <Box sx={{ width: `${widthPercent}%`, flexShrink: 0, position: "relative" }}>
            {/* Dark bg */}
            <Box sx={{
              position: "absolute", inset: 0,
              background: "rgba(8,12,8,0.85)",
              borderRadius: "12px",
              backdropFilter: "blur(20px)",
              zIndex: 0,
            }} />
            {/* HUD frame */}
            <Box component="img" src="/assets/images/hud/portfolio-chantbot.svg" alt=""
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", zIndex: 2 }} />

            {/* Orb */}
            <Box sx={{
              position: "absolute", top: -8, right: -8, zIndex: 5,
              width: 120, height: 120, borderRadius: "50%",
              background: "rgba(0,0,0,0.85)",
              border: "1px solid rgba(0,205,31,0.25)",
              boxShadow: "0 0 30px rgba(0,205,31,0.2)",
              overflow: "hidden",
            }}>
              <video src="/assets/orb/Welcome-state.mp4" autoPlay loop muted playsInline
                style={{ width: "160%", height: "160%", objectFit: "cover", mixBlendMode: "screen", marginLeft: "-30%", marginTop: "-30%" }} />
            </Box>

            {/* Chat content */}
            <Box sx={{ position: "absolute", inset: 0, pt: "120px", pb: "8px", zIndex: 1 }}>
              <ChatbotPanel />
            </Box>
          </Box>

        </Box>
      </Box>

      {/* ══════════════ MOBILE ══════════════ */}
      <Box sx={{
        display: { xs: "flex", md: "none" },
        flexDirection: "column",
        height: "100%",
        px: 2, pt: 2.5, pb: 2,
        position: "relative", zIndex: 1,
      }}>
        {/* Pill tabs */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
          <PillTab active={1} onClick={() => navigate('/')}>Main Menu</PillTab>
          <PillTab active={1} onClick={() => navigate('/')}>AI Mode</PillTab>
        </Box>

        {/* Card */}
        <Box sx={{
          flex: 1,
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          px: 2.5, pt: 3, pb: 2.5,
          overflow: "hidden",
        }}>
          <Box component="img" src="/assets/images/hud/project-detail-Page.svg" alt=""
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", zIndex: 0 }} />

          <Box sx={{ mb: 2.5, zIndex: 1 }}>
            <Typography sx={{ fontSize: "12px", textAlign: "left" }}>Welcome!</Typography>
            <Typography sx={{ fontSize: "22px", fontWeight: 700, textAlign: "left" }}>Here is my work</Typography>
          </Box>

          <Box sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gridAutoRows: "90px",
            gap: "10px",
            flex: 1, zIndex: 1,
          }}>
            {mobileCats.map((cat, i) => (
              <CategoryCard
                key={i}
                onClick={() => navigate(`/portfolio/${encodeURIComponent(cat.label)}`)}
                sx={{ ...(i === 4 && { gridColumn: "1 / 2" }) }}
              >
                <Box component="img" src={cat.icon} alt={cat.label} sx={{ width: 32, height: 32, objectFit: "contain" }} />
                <Typography sx={{ fontSize: "11px", color: "#bbb", letterSpacing: "0.5px", fontWeight: 500 }}>
                  {cat.label}
                </Typography>
              </CategoryCard>
            ))}
          </Box>
        </Box>
      </Box>

    </PageWrapper>
  );
};

export default PortfolioPage;
