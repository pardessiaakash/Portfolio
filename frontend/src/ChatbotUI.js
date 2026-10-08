import React, { useState } from "react";
import { Box, Typography, IconButton, InputBase } from "@mui/material";
import { styled } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import MicIcon from "@mui/icons-material/Mic";
import { useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { useChat } from "./hooks/useChat";
import { useSpeech } from "./hooks/useSpeech";
import { transcribeAudio } from "./api/chatApi";
// Simple markdown renderer to avoid external dependency
const ReactMarkdown = ({ children }) => {
  const html = (children || "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const OverlayContainer = styled(Box)({
    position: "fixed",
    inset: 0,
    zIndex: 100000, // Very high to sit on top of everything
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(5px)",
    padding: "20px",
});

const TabButton = styled(Box)(({ active }) => ({
    padding: "10px 30px",
    backgroundColor: active ? "rgba(30, 30, 30, 0.9)" : "rgba(20, 20, 20, 0.6)",
    color: active ? "#fff" : "#888",
    border: active ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(255, 255, 255, 0.1)",
    borderBottom: "none",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "30px", // slanted feel on the right
    clipPath: "polygon(0 0, 85% 0, 100% 100%, 0% 100%)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "1px",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "140px",
    "&:hover": {
        color: "#fff",
    },
}));

const ChatCard = styled(Box)({
    width: "100%",
    maxWidth: "850px",
    height: "500px",
    position: "relative",
    background: "linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(10, 10, 10, 0.9) 100%)",
    borderTop: "1px solid rgba(0, 255, 150, 0.3)",
    borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
    borderRight: "1px solid rgba(255, 255, 255, 0.1)",
    borderBottom: "1px solid rgba(0, 255, 150, 0.3)",
    backdropFilter: "blur(20px)",
    borderBottomLeftRadius: "16px",
    borderBottomRightRadius: "16px",
    borderTopRightRadius: "16px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
    marginTop: "-1px", // Seamless with tabs
    
});

const GlowingOrbContainer = styled(Box)({
    position: "absolute",
    top: "-40px",
    right: "-40px",
    width: "140px",
    height: "140px",
    borderRadius: "50%",
    background: "rgba(0, 0, 0, 0.6)",
    border: "1px solid rgba(0, 255, 150, 0.3)",
    boxShadow: "0 0 20px rgba(0, 255, 150, 0.2), inset 0 0 20px rgba(0, 255, 150, 0.1)",
    overflow: "hidden",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
});

const SuggestionButton = styled(Box)({
    padding: "8px 20px",
    borderRadius: "20px",
    backgroundColor: "#00CD1F",
    color: "#000",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(0, 255, 150, 0.4)",
    },
});

const InputContainer = styled(Box)({
    display: "flex",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "8px 16px",
    gap: "12px",
    width: "100%",
});

const MessagesContainer = styled(Box)({
    flexGrow: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "0 32px",
    marginTop: "16px",
    marginBottom: "16px",
    "&::-webkit-scrollbar": {
        width: "6px",
    },
    "&::-webkit-scrollbar-thumb": {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: "3px",
    },
});

const MessageBubble = styled(Box)(({ role }) => ({
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    backgroundColor: role === "user" ? "rgba(0, 255, 156, 0.15)" : "rgba(255, 255, 255, 0.05)",
    border: role === "user" ? "1px solid rgba(0, 255, 156, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
    padding: "10px 16px",
    borderRadius: "12px",
    maxWidth: "80%",
    color: "#fff",
    fontSize: "14px",
    lineHeight: 1.5,
    "& p": {
        margin: "0 0 10px 0",
        "&:last-child": {
            margin: 0,
        }
    },
    "& h1, & h2, & h3, & h4, & h5, & h6": {
        marginTop: "15px",
        marginBottom: "10px",
        color: "#00CD1F",
        fontWeight: 600,
        "&:first-of-type": {
            marginTop: 0,
        }
    },
    "& ul, & ol": {
        marginTop: "0",
        marginBottom: "10px",
        paddingLeft: "20px",
    },
    "& li": {
        marginBottom: "6px",
    },
    "& a": {
        color: "#00CD1F",
        textDecoration: "underline",
    },
    "& strong": {
        fontWeight: "bold",
        color: "#fff",
    }
}));

export default function ChatbotUI({ onClose }) {
    const navigate = useNavigate();
    // Let's allow closing by clicking the overlay backdrop
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const { messages, isLoading, sendMessage, messagesEndRef } = useChat();
    const [inputValue, setInputValue] = useState("");

    const handleSend = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
            setInputValue("");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSend();
        }
    };

    const { isListening, interimText, toggleListening, isProcessing } = useSpeech({
        onTranscript: (text) => {
            setInputValue((prev) => (prev ? prev + " " + text : text));
        },
        useBackend: true,
        onBackendTranscript: async (audioBlob) => {
            try {
                const data = await transcribeAudio(audioBlob);
                if (data.transcript) {
                    setInputValue((prev) => (prev ? prev + " " + data.transcript : data.transcript));
                }
            } catch (err) {
                console.error("Backend transcription failed:", err);
            }
        },
    });

    return (
        <OverlayContainer onClick={handleBackdropClick}>
            <Box sx={{ width: "100%", maxWidth: "850px", position: "relative" }}>
                {/* Tabs */}
                <Box sx={{ display: "flex", pl: 3 }}>
                    <TabButton active onClick={() => { onClose?.(); navigate('/'); }}>Main Menu</TabButton>
                    <TabButton sx={{ ml: -2 }}>Web Mode</TabButton>
                </Box>

                {/* Main Card */}
                <ChatCard>
                    {/* Greeting or Messages */}
                    {messages.length === 0 ? (
                        <Box sx={{ p: 4, flexGrow: 1 }}>
                            <Typography sx={{ color: "#aaa", fontSize: "14px", fontWeight: 300, mb: 0.5 }}>
                                Hello!
                            </Typography>
                            <Typography sx={{ color: "#00CD1F", fontSize: "24px", fontWeight: 500 }}>
                                Akash Pardeshi
                            </Typography>
                        </Box>
                    ) : (
                        <MessagesContainer sx={{ pt: 12 }}>
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} role={msg.role}>
                                    {msg.role === "user" ? (
                                        msg.content
                                    ) : (
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    )}
                                </MessageBubble>
                            ))}
                            {isLoading && (
                                <Box sx={{ alignSelf: "flex-start", p: 1 }}>
                                    <CircularProgress size={20} sx={{ color: "#00CD1F" }} />
                                </Box>
                            )}
                            <div ref={messagesEndRef} />
                        </MessagesContainer>
                    )}

                    {/* Suggestions and Input Area */}
                    <Box sx={{ p: 4, pt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
                        {messages.length === 0 && (
                            <Box sx={{ display: "flex", gap: 2 }}>
                                <SuggestionButton onClick={() => sendMessage("AI Suggestion")}>AI Suggestion</SuggestionButton>
                                <SuggestionButton onClick={() => sendMessage("AI Suggestion")}>AI Suggestion</SuggestionButton>
                                <SuggestionButton onClick={() => sendMessage("AI Suggestion")}>AI Suggestion</SuggestionButton>
                            </Box>
                        )}

                        <InputContainer>
                            <InputBase
                                placeholder={isListening ? "Listening... speak now" + (interimText ? ` - ${interimText}` : "") : "Just type it, What do you want to know? Or click on mike icon and talk with my AI Assistant"}
                                fullWidth
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading || isProcessing}
                                sx={{
                                    color: "#aaa",
                                    fontSize: "14px",
                                    "& input::placeholder": {
                                        color: isListening ? "#00CD1F" : "#555",
                                        opacity: 1,
                                    },
                                }}
                            />
                            <IconButton onClick={handleSend} disabled={isLoading || isProcessing} sx={{ border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#888", p: "6px", "&:hover": { color: "#00CD1F", borderColor: "#00CD1F" } }}>
                                {isLoading || isProcessing ? <CircularProgress size={20} sx={{ color: "#aaa" }} /> : <ArrowUpwardIcon fontSize="small" />}
                            </IconButton>
                            <IconButton onClick={toggleListening} sx={{ border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: isListening ? "#00CD1F" : "#888", p: "6px", "&:hover": { color: "#00CD1F", borderColor: "#00CD1F" } }}>
                                <MicIcon fontSize="small" />
                            </IconButton>
                        </InputContainer>
                    </Box>

                    {/* Glowing Orb */}
                    <GlowingOrbContainer>
                        <video
                            src="/assets/orb/Welcome-state.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{ width: "160%", height: "160%", objectFit: "cover", mixBlendMode: "screen" }}
                        />
                    </GlowingOrbContainer>

                    {/* Right Handle / Scrollbar decoration */}
                    <Box
                        sx={{
                            position: "absolute",
                            right: "20px",
                            top: "120px",
                            bottom: "120px",
                            width: "4px",
                            borderRadius: "2px",
                            backgroundColor: "rgba(255,255,255,0.05)",
                        }}
                    />
                </ChatCard>
            </Box>
        </OverlayContainer>
    );
}
