// /vr: the Design Lab as a WebXR space. On a Meta Quest (or any WebXR
// headset browser) "Enter VR" puts the visitor inside the lab with the HUD
// floating in front of them; on a computer the same scene is a preview you
// can look around with the mouse.
//
// Comfort (XR principles): the visitor never moves unless they move; there
// is no camera motion, no head-locked UI, nothing closer than ~1.5 m, text
// and targets sized for reading at that distance, and a steady floor
// reference. The scene is unlit and light so it holds the headset's frame
// rate.
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { XR, createXRStore, useXR } from "@react-three/xr";
import LabRoom from "./LabRoom";
import Hud from "./Hud";
import { GREEN } from "./ui";

const store = createXRStore({
  foveation: 1,          // sharper centre, cheaper edges (Quest fixed foveation)
  frameRate: "high",
});

// Desktop preview only: drag to turn your head (yaw/pitch), like standing
// in the lab. The camera never moves position, just as in VR.
function DragToLook() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    let yaw = 0, pitch = -0.06, down = null;
    const apply = () => { camera.rotation.set(pitch, yaw, 0, "YXZ"); };
    apply();
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY, yaw, pitch }; };
    const onMove = (e) => {
      if (!down) return;
      yaw = down.yaw + (e.clientX - down.x) * 0.0035;
      pitch = Math.max(-0.7, Math.min(0.6, down.pitch + (e.clientY - down.y) * 0.0035));
      apply();
    };
    const onUp = () => { down = null; };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { el.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [camera, gl]);
  return null;
}

function Scene() {
  const mode = useXR((s) => s.mode);
  const three = useThree();
  if (typeof window !== "undefined" && /[?&]debug/.test(window.location.search)) window.__vr = three;
  const inXR = mode === "immersive-vr";
  return (
    <>
      <color attach="background" args={["#000"]} />
      <fog attach="fog" args={["#000", 5, 11]} />
      <LabRoom />
      <Hud inXR={inXR} onExit={() => store.getState().session?.end()} />
      {/* desktop preview: drag to look around from where the visitor stands */}
      {!inXR && <DragToLook />}
    </>
  );
}

const btn = {
  font: "500 15px Montserrat, sans-serif", color: "#fff", background: "rgba(12,14,13,0.6)",
  border: "1px solid rgba(143,143,143,0.8)", borderRadius: 10, padding: "12px 20px", cursor: "pointer",
  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", textDecoration: "none",
};

export default function VRPage() {
  const [supported, setSupported] = useState(null);
  const [inSession, setInSession] = useState(false);
  useEffect(() => {
    document.title = "Akash P · Design Lab in VR";
    const xr = navigator.xr;
    if (!xr?.isSessionSupported) { setSupported(false); return; }
    xr.isSessionSupported("immersive-vr").then(setSupported).catch(() => setSupported(false));
  }, []);
  useEffect(() => store.subscribe((s) => setInSession(!!s.session)), []);
  const home = useMemo(() => (process.env.PUBLIC_URL || "") + "/", []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <Canvas camera={{ position: [0, 1.6, 0], fov: 70, near: 0.05, far: 40 }}
        gl={{ antialias: true, powerPreference: "high-performance" }} dpr={[1, 1.75]}>
        <XR store={store}>
          <Suspense fallback={null}><Scene /></Suspense>
        </XR>
      </Canvas>
      {!inSession && (
        <>
          <a href={home} style={{ ...btn, position: "fixed", top: 20, left: 20 }}>‹ Back to the site</a>
          <div style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "Montserrat, sans-serif", textAlign: "center", padding: "0 16px" }}>
            {supported ? (
              <button type="button" onClick={() => store.enterVR()}
                style={{ ...btn, background: GREEN, color: "#080808", border: `1px solid ${GREEN}`, fontWeight: 600, fontSize: 17, padding: "14px 28px" }}>
                Enter VR
              </button>
            ) : (
              <div style={{ ...btn, cursor: "default", maxWidth: 520, lineHeight: 1.5 }}>
                {supported === null ? "Checking for a VR headset…" : <>
                  To step inside, open <b style={{ color: GREEN }}>{window.location.host}/vr</b> in your Meta Quest browser and press <b>Enter VR</b>.
                  <br /><span style={{ opacity: 0.7, fontSize: 13 }}>Here you can drag to look around and click the panels.</span>
                </>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
