// Building blocks for the VR HUD: panels, text and buttons, styled like the
// website's glass HUDs (dark tint, grey-green-grey rim, green accents).
//
// XR comfort rules used throughout (sizes are in metres):
// - unlit materials only: crisp text, no lighting cost, nothing flickers
// - text at least ~0.028 m tall at 1.6-2 m (about 1° of view)
// - every target at least ~0.08 m tall, with hover glow, a click tick and a
//   light haptic pulse, so a ray or a pinch always gets feedback
import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { FONT } from "./data";
import { playHoverTick } from "../sound/uiTick";

export const GREEN = "#00CD1F";
const GREY = new THREE.Color("#8F8F8F"), MID = new THREE.Color("#636363"), G = new THREE.Color(GREEN);

export function roundedShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// the rim: a thin outline whose colour runs grey → green → grey across the
// panel, like the gradient borders on the website
function Rim({ w, h, r, glow = 1, z = 0.001 }) {
  const geo = useMemo(() => {
    const pts = roundedShape(w, h, r).getSpacedPoints(160);
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)));
    const cols = [];
    for (const p of pts) {
      // diagonal position 0..1 (bottom-left to top-right), green in the middle
      const t = Math.max(0, Math.min(1, ((p.x + w / 2) / w) * 0.75 + ((p.y + h / 2) / h) * 0.25));
      const c = t < 0.27 ? GREY.clone().lerp(MID, t / 0.27)
        : t < 0.49 ? MID.clone().lerp(G, (t - 0.27) / 0.22)
        : t < 0.71 ? G.clone().lerp(MID, (t - 0.49) / 0.22)
        : MID.clone().lerp(GREY, (t - 0.71) / 0.29);
      cols.push(c.r * glow, c.g * glow, c.b * glow);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    return g;
  }, [w, h, r, glow]);
  return (
    <lineLoop geometry={geo} position={[0, 0, z]} raycast={() => null}>
      <lineBasicMaterial vertexColors transparent opacity={0.95} />
    </lineLoop>
  );
}

/** A glass panel. Children are placed on its face (z = 0). */
export function Panel({ w, h, r = 0.04, tint = "#0d0f0e", opacity = 0.88, rim = true, glow = 1, children, ...props }) {
  const geo = useMemo(() => new THREE.ShapeGeometry(roundedShape(w, h, r), 8), [w, h, r]);
  return (
    <group {...props}>
      {/* drawn first: glass is see-through, and transparent things are
          otherwise sorted by distance, which can put the glass over its content */}
      <mesh geometry={geo} renderOrder={-10}>
        <meshBasicMaterial color={tint} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {rim && <Rim w={w} h={h} r={r} glow={glow} />}
      <group position={[0, 0, 0.002]}>{children}</group>
    </group>
  );
}

/** Text in the site's font. size is the cap height-ish font size in metres. */
export function Label({ children, size = 0.032, weight = "regular", color = "#fff", opacity = 1, ...props }) {
  return (
    <Text font={FONT[weight] || FONT.regular} fontSize={size} color={color} fillOpacity={opacity}
      anchorX="left" anchorY="top" lineHeight={1.4} raycast={() => null} {...props}>
      {children}
    </Text>
  );
}

function pulse(e) {
  try { e?.pointerState?.inputSource?.gamepad?.hapticActuators?.[0]?.pulse?.(0.35, 28); } catch {}
}

/** A button: hover glow + slight lift, tick sound and haptic on press. */
export function Button({ w, h = 0.09, label, size = 0.032, onClick, active = false, disabled = false, r = 0.018, align = "center", sub, ...props }) {
  const [hover, setHover] = useState(false);
  const on = !disabled && hover;
  const geo = useMemo(() => new THREE.ShapeGeometry(roundedShape(w, h, r), 6), [w, h, r]);
  return (
    <group {...props} scale={on ? 1.035 : 1} position-z={(props.position?.[2] || 0) + (on ? 0.012 : 0)}>
      <mesh geometry={geo} renderOrder={-5}
        onPointerOver={(e) => { e.stopPropagation(); if (!disabled) { setHover(true); playHoverTick(); } }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); if (disabled) return; pulse(e); onClick?.(e); }}>
        <meshBasicMaterial color={active ? GREEN : on ? "#26302a" : "#171a18"} transparent
          opacity={active ? 0.95 : disabled ? 0.45 : 0.92} depthWrite={false} />
      </mesh>
      <Rim w={w} h={h} r={r} glow={active || on ? 1.25 : 0.7} />
      <Label size={size} weight={active ? "bold" : on ? "semibold" : "regular"}
        color={active ? "#080808" : disabled ? "#8a8a8a" : on ? GREEN : "#ffffff"}
        anchorX={align} anchorY={sub ? "bottom" : "middle"} position={[align === "left" ? -w / 2 + 0.035 : 0, sub ? 0.004 : 0, 0.003]}
        maxWidth={w - 0.06} textAlign={align}>
        {label}
      </Label>
      {sub && (
        <Label size={size * 0.72} color={active ? "#0a2a10" : "#ffffff"} opacity={active ? 1 : 0.7}
          anchorX={align} anchorY="top" position={[align === "left" ? -w / 2 + 0.035 : 0, -0.012, 0.003]} maxWidth={w - 0.06} textAlign={align}>
          {sub}
        </Label>
      )}
    </group>
  );
}
