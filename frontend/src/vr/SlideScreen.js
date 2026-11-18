// A case study on a big screen: about 2 m wide, 2.3 m away, centred a
// little above eye level so the whole slide fits the comfortable field of
// view without turning the head. Flip with the buttons, a thumbstick, or
// the arrow keys (desktop preview).
import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import { Panel, Label, Button, GREEN } from "./ui";
import { useSlideTexture } from "./slides";

const W = 2.0, H = W * 961 / 1676, DIST = 2.3, Y = 1.62;

export default function SlideScreen({ study, gl, onClose }) {
  const [i, setI] = useState(0);
  const n = study.slides.length;
  const go = (d) => setI((v) => Math.max(0, Math.min(n - 1, v + d)));
  const { tex, ready } = useSlideTexture(study.slides, i, gl);

  // thumbstick left/right flips a slide (once per push); B / Y goes back
  const right = useXRInputSourceState("controller", "right");
  const left = useXRInputSourceState("controller", "left");
  const latch = useRef(0);
  useFrame(() => {
    const x = right?.gamepad?.["xr-standard-thumbstick"]?.xAxis ?? left?.gamepad?.["xr-standard-thumbstick"]?.xAxis ?? 0;
    if (latch.current === 0 && Math.abs(x) > 0.7) { latch.current = Math.sign(x); go(latch.current); }
    else if (Math.abs(x) < 0.3) latch.current = 0;
    if (right?.gamepad?.["b-button"]?.state === "pressed" || left?.gamepad?.["y-button"]?.state === "pressed") onClose();
  });
  useEffect(() => {
    const k = (e) => { if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  return (
    <group position={[0, Y, -DIST]}>
      <Panel w={W + 0.06} h={H + 0.06} r={0.03} opacity={0.95}>
        <mesh position={[0, 0, 0.002]} raycast={() => null}>
          <planeGeometry args={[W, H]} />
          {/* one material: color must go back to white once the slide is in
              (React keeps the same material and won't reset a removed prop) */}
          <meshBasicMaterial key={tex ? "slide" : "empty"} map={tex || null} color={tex ? "#ffffff" : "#0d0f0e"} toneMapped={false}
            transparent={!ready} opacity={ready ? 1 : 0.55} />
        </mesh>
        {!ready && <Label size={0.04} anchorX="center" anchorY="middle" position={[0, 0, 0.01]} opacity={0.8}>Loading…</Label>}
      </Panel>
      {/* controls under the screen, angled up toward the eyes */}
      <group position={[0, -H / 2 - 0.16, 0.25]} rotation={[0.35, 0, 0]}>
        <Panel w={1.4} h={0.17} r={0.03}>
          <Button w={0.24} h={0.09} label="‹  Back" size={0.03} onClick={onClose} position={[-0.53, 0, 0]} />
          <Button w={0.12} h={0.09} label="‹" size={0.05} onClick={() => go(-1)} disabled={i === 0} position={[-0.29, 0, 0]} />
          <Label size={0.032} weight="semibold" anchorX="center" anchorY="middle" textAlign="center" maxWidth={0.4} position={[0, 0.018, 0]}>
            {study.topics[i] || study.title}
          </Label>
          <Label size={0.026} anchorX="center" anchorY="middle" opacity={0.7} position={[0, -0.03, 0]}>{study.title}</Label>
          <Button w={0.12} h={0.09} label="›" size={0.05} onClick={() => go(1)} disabled={i === n - 1} position={[0.29, 0, 0]} />
          <Label size={0.03} anchorX="center" anchorY="middle" color={GREEN} position={[0.53, 0, 0]}>{`${String(i + 1).padStart(2, "0")} / ${n}`}</Label>
        </Panel>
      </group>
    </group>
  );
}
