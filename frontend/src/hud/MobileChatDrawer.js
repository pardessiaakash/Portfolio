// Mobile chat: the green edge tab from the Figma mobile design, a short
// "Talk to Nova" hint, and a full-screen chat drawer.
//
// - The tab sits on the right edge at ~78% height (Figma New_Mobile_Version),
//   clear of the bottom social bar and the browser toolbar.
// - The hint fades in once, then dismisses itself after a few seconds (or
//   when tapped / closed) and stays dismissed for the visit.
// - The drawer has its own close button; Esc and tapping outside also close
//   it. While it is open the tab is hidden, so nothing covers the input.

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatbotPanel from "../ChatbotPanel";
import { pressable } from "../a11y";

const PRIMARY = "#00CD1F";
const HINT_KEY = "novaHintSeen";
const HINT_MS = 6000;

const hintSeen = () => {
  try { return sessionStorage.getItem(HINT_KEY) === "1"; } catch { return false; }
};

export default function MobileChatDrawer({ chips, requestedInput, open: openProp, onOpenChange }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v) => { onOpenChange ? onOpenChange(v) : setOpenState(v); };
  const [hint, setHint] = useState(() => !hintSeen());
  const closeRef = useRef(null);
  const tabRef = useRef(null);

  const dismissHint = () => {
    setHint(false);
    try { sessionStorage.setItem(HINT_KEY, "1"); } catch { /* private mode */ }
  };

  // the hint goes away on its own, counting from when the page is visible
  // (after the mobile intro, if it is playing)
  const [visible, setVisible] = useState(true);
  // checked after the first paint: the intro and this tab mount together
  useLayoutEffect(() => {
    if (document.querySelector("[data-mobile-intro]")) setVisible(false);
  }, []);
  useEffect(() => {
    if (visible) return undefined;
    const on = () => setVisible(true);
    window.addEventListener("mobileintro:done", on);
    return () => window.removeEventListener("mobileintro:done", on);
  }, [visible]);
  useEffect(() => {
    if (!hint || !visible) return undefined;
    const t = setTimeout(dismissHint, HINT_MS);
    return () => clearTimeout(t);
  }, [hint, visible]);

  // opening: hide the hint, move focus into the drawer; Esc closes
  useEffect(() => {
    if (!open) return undefined;
    dismissHint();
    const t = setTimeout(() => closeRef.current?.focus(), 350);
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => { setOpen(false); setTimeout(() => tabRef.current?.focus(), 50); };

  return (
    <>
      {/* backdrop */}
      <Box onClick={close} aria-hidden sx={{
        position: "fixed", inset: 0, zIndex: 40,
        background: "rgba(0,0,0,0.55)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }} />

      {/* drawer */}
      <Box role="dialog" aria-modal="true" aria-label="Chat with Nova" aria-hidden={!open}
        sx={{
          position: "fixed", inset: 0, zIndex: 50,
          p: "12px",
          pt: "max(12px, env(safe-area-inset-top))",
          pb: "max(12px, env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          transform: open ? "translateX(0)" : "translateX(100%)",
          visibility: open ? "visible" : "hidden",
          transition: open
            ? "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s"
            : "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s 0.4s",
        }}>
        <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
          <ChatbotPanel chips={chips} wrapperSx={{ width: "100%", height: "100%" }} requestedInput={requestedInput} fadeTop />
          {/* close, top-left inside the panel (same glass square as the HUD buttons) */}
          <Box component="button" ref={closeRef} aria-label="Close chat" onClick={close} sx={{
            position: "absolute", top: 12, left: 12, zIndex: 5,
            width: 44, height: 44, p: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "10px",
            border: "1px solid #8F8F8F",
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(13px)", WebkitBackdropFilter: "blur(13px)",
            boxShadow: "-1px 3px 13px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25)",
            color: "#fff", cursor: "pointer",
          }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </Box>
        </Box>
      </Box>

      {/* edge tab: shows "Talk to Nova" for a few seconds, then slims down
          to the green edge tab (hidden while the drawer is open) */}
      <Box ref={tabRef}
        onClick={() => setOpen(true)}
        {...pressable(() => setOpen(true), "Open chat with Nova")}
        aria-expanded={open}
        sx={{
          position: "fixed", right: 0, top: "78%", transform: "translateY(-50%)",
          height: hint ? 44 : 92,
          width: hint ? 156 : 38,
          pl: hint ? "10px" : 0,
          boxSizing: "border-box",
          background: PRIMARY,
          borderRadius: hint ? "22px 0 0 22px" : "16px 0 0 16px",
          display: "flex", flexDirection: hint ? "row" : "column",
          alignItems: "center", justifyContent: hint ? "flex-start" : "center", gap: hint ? "4px" : "6px",
          overflow: "hidden", whiteSpace: "nowrap",
          cursor: "pointer", zIndex: 55,
          boxShadow: "0 0 18px rgba(0,205,31,0.45), inset 1px 0 0 rgba(255,255,255,0.35)",
          opacity: open ? 0 : 1,
          pointerEvents: open ? "none" : "auto",
          transition: "width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1), border-radius 0.45s ease, padding 0.45s ease, opacity 0.25s ease",
          // generous invisible touch area to the left of the slim tab
          "&::before": { content: '""', position: "absolute", inset: "-8px 0 -8px -14px" },
          // slim tab: the chevron nudges left now and then ("pull me open")
          "& .nova-chev": hint ? {} : { animation: "novaNudge 3.2s ease-in-out 1s infinite" },
          "@keyframes novaNudge": {
            "0%, 70%, 100%": { transform: "translateX(0)" },
            "78%": { transform: "translateX(-4px)" },
            "86%": { transform: "translateX(0)" },
            "92%": { transform: "translateX(-2px)" },
          },
          "@media (prefers-reduced-motion: reduce)": { "& .nova-chev": { animation: "none" } },
        }}>
        {/* AI sparkle: says "this is Nova, the assistant" */}
        <Box aria-hidden sx={{
          width: 24, height: 24, flexShrink: 0, borderRadius: "50%",
          background: "#08120a",
          display: "flex", alignItems: "center", justifyContent: "center",
          order: hint ? 1 : 0,
        }}>
          <AutoAwesomeIcon sx={{ fontSize: 14, color: PRIMARY }} />
        </Box>
        <ChevronLeftIcon className="nova-chev" aria-hidden
          sx={{ color: "#08120a", flexShrink: 0, fontSize: 24, order: hint ? 0 : 1, ml: hint ? "-4px" : 0 }} />
        <Box aria-hidden sx={{
          color: "#08120a", fontSize: "13px", fontWeight: 600, order: 2,
          opacity: hint ? 1 : 0, transition: "opacity 0.2s ease",
          display: hint ? "block" : "none",
        }}>Talk to Nova</Box>
      </Box>
    </>
  );
}
