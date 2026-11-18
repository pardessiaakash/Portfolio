// The floating HUD in the lab: the website's home screen rebuilt in 3D.
// Work → categories → projects → slides on a big screen, About Me, and
// Nova's panel to the right. Everything is world-locked (it stays where it
// is when you turn your head) at a comfortable reading distance.
import React, { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Panel, Label, Button, GREEN } from "./ui";
import { STUDIES, CATEGORIES, PROFILE } from "./data";
import SlideScreen from "./SlideScreen";

// layout (metres; the floor is y = 0, the visitor starts at the origin
// looking down -z)
const HUD = { w: 1.32, h: 0.84, dist: 1.75, y: 1.42 };
const NOVA_ANGLE = THREE.MathUtils.degToRad(34);

// eases a group in when it appears (scale + a short slide toward you)
function Appear({ children, k = 0, ...props }) {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt * 3.2);
    const e = 1 - Math.pow(1 - t.current, 3);
    ref.current.scale.setScalar(0.94 + 0.06 * e);
    ref.current.position.z = (props.position?.[2] || 0) - 0.06 * (1 - e);
  });
  return <group key={k} ref={ref} {...props} scale={0.94}>{children}</group>;
}

function Header() {
  return (
    <group position={[-HUD.w / 2 + 0.06, HUD.h / 2 - 0.055, 0]}>
      <Label size={0.03} opacity={0.9}>{PROFILE.role}</Label>
      <Label size={0.066} weight="bold" color={GREEN} position={[0, -0.04, 0]}>{PROFILE.name}</Label>
    </group>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <group position={[HUD.w / 2 - 0.33, HUD.h / 2 - 0.1, 0]}>
      <Button w={0.24} h={0.085} label="Work" active={tab === "work"} onClick={() => setTab("work")} position={[-0.13, 0, 0]} />
      <Button w={0.24} h={0.085} label="About Me" active={tab === "about"} onClick={() => setTab("about")} position={[0.13, 0, 0]} />
    </group>
  );
}

function Work({ category, setCategory, openStudy }) {
  if (!category) {
    const tw = 0.27, gap = 0.035;
    return (
      <group position={[0, -0.03, 0]}>
        {CATEGORIES.map((c, i) => (
          <Button key={c} w={tw} h={0.24} label={c} size={0.036}
            sub={STUDIES[c].length ? `${STUDIES[c].length} case ${STUDIES[c].length > 1 ? "studies" : "study"}` : "Coming soon"}
            onClick={() => setCategory(c)}
            position={[(i - 1.5) * (tw + gap), 0, 0]} />
        ))}
        <Label size={0.03} opacity={0.85} anchorX="center" textAlign="center" maxWidth={1.1} position={[0, -0.2, 0]}>
          Each case study shows the problem, the decisions and the outcome. Start with UI/UX.
        </Label>
      </group>
    );
  }
  const list = STUDIES[category];
  return (
    <group position={[0, -0.03, 0]}>
      <Button w={0.2} h={0.075} size={0.028} label="‹  Work" onClick={() => setCategory(null)} position={[-HUD.w / 2 + 0.16, 0.16, 0]} />
      <Label size={0.04} weight="semibold" position={[-HUD.w / 2 + 0.3, 0.183, 0]}>{category}</Label>
      {list.length ? list.map((s, i) => (
        <Button key={s.title} w={0.37} h={0.17} size={0.036} label={s.title} sub={`${s.line} · ${s.slides.length} slides`}
          onClick={() => openStudy(s)} position={[(i - (list.length - 1) / 2) * 0.4, -0.04, 0]} />
      )) : (
        <Label size={0.032} opacity={0.85} anchorX="center" textAlign="center" maxWidth={0.9} position={[0, -0.01, 0]}>
          {`${category} work is on its way. The UI/UX and Immersive case studies are ready to explore.`}
        </Label>
      )}
    </group>
  );
}

function About() {
  const x0 = -HUD.w / 2 + 0.06;
  return (
    <group position={[0, 0.17, 0]}>
      <Label size={0.03} maxWidth={0.6} position={[x0, 0, 0]}>
        {`${PROFILE.years} years in design, from art direction to UX. I simplify complex products with generative AI.`}
      </Label>
      <Label size={0.026} weight="semibold" color={GREEN} position={[x0, -0.17, 0]}>SKILLS</Label>
      <Label size={0.027} maxWidth={0.6} opacity={0.9} position={[x0, -0.21, 0]}>{PROFILE.skills.join("  ·  ")}</Label>
      <Label size={0.026} weight="semibold" color={GREEN} position={[x0, -0.36, 0]}>CERTIFICATION</Label>
      <Label size={0.027} maxWidth={0.6} opacity={0.9} position={[x0, -0.4, 0]}>{`${PROFILE.cert.title}, IIIT Bangalore`}</Label>
      <Label size={0.026} weight="semibold" color={GREEN} position={[0.06, 0, 0]}>EXPERIENCE</Label>
      {PROFILE.experiences.map((e, i) => (
        <group key={e.company} position={[0.06, -0.045 - i * 0.088, 0]}>
          <Label size={0.028} weight="semibold" maxWidth={0.52}>{e.company}</Label>
          <Label size={0.024} opacity={0.75} maxWidth={0.52} position={[0, -0.037, 0]}>{`${e.role} · ${e.period}`}</Label>
        </group>
      ))}
    </group>
  );
}

function NovaPanel({ aside }) {
  const ring = useRef();
  const group = useRef();
  const angle = useRef(NOVA_ANGLE);
  // steps further aside while a case study is on the big screen, gently
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.6;
    const goal = aside ? NOVA_ANGLE + 0.2 : NOVA_ANGLE;
    angle.current += (goal - angle.current) * Math.min(1, dt * 3);
    const g = group.current;
    if (g) { g.position.set(Math.sin(angle.current) * HUD.dist, HUD.y, -Math.cos(angle.current) * HUD.dist); g.rotation.set(0.05, -angle.current, 0); }
  });
  return (
    <group ref={group}>
      <Panel w={0.5} h={0.62}>
        <group position={[0.17, 0.25, 0.01]}>
          <mesh ref={ring} raycast={() => null}>
            <torusGeometry args={[0.055, 0.006, 8, 48]} />
            <meshBasicMaterial color={GREEN} />
          </mesh>
          <mesh raycast={() => null} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.035, 0.004, 8, 40, Math.PI * 1.4]} />
            <meshBasicMaterial color={GREEN} transparent opacity={0.6} />
          </mesh>
        </group>
        <Label size={0.04} weight="bold" color={GREEN} position={[-0.21, 0.27, 0]}>Nova</Label>
        <Label size={0.026} opacity={0.75} position={[-0.21, 0.215, 0]}>AI assistant</Label>
        <Label size={0.029} maxWidth={0.42} position={[-0.21, 0.12, 0]}>
          {"Hi, I'm Nova, Akash's AI assistant. Ask how he works, why he made key design calls, or what he'd bring to your team."}
        </Label>
        <Label size={0.025} maxWidth={0.42} opacity={0.65} position={[-0.21, -0.12, 0]}>
          {`Voice chat with Nova is coming to VR. Until then, chat with Nova on the website, or write to ${PROFILE.email}.`}
        </Label>
      </Panel>
    </group>
  );
}

export default function Hud({ inXR, onExit }) {
  const [tab, setTab] = useState("work");
  const [category, setCategory] = useState(null);
  const [study, setStudy] = useState(null);
  const { gl } = useThree();
  const view = study ? "slides" : `${tab}-${category || ""}`;
  const tilt = useMemo(() => Math.atan2(1.6 - HUD.y, HUD.dist) * 0.8, []);   // face the eyes

  return (
    <group>
      {study ? (
        <Appear k={"s" + study.title}>
          <SlideScreen study={study} gl={gl} onClose={() => setStudy(null)} />
        </Appear>
      ) : (
        <Appear k={view} position={[0, HUD.y, -HUD.dist]} rotation={[tilt, 0, 0]}>
          <Panel w={HUD.w} h={HUD.h}>
            <Header />
            <Tabs tab={tab} setTab={(t) => { setTab(t); setCategory(null); }} />
            {tab === "work" ? <Work category={category} setCategory={setCategory} openStudy={setStudy} /> : <About />}
          </Panel>
        </Appear>
      )}
      <NovaPanel aside={!!study} />
      {inXR && (
        <Button w={0.24} h={0.08} size={0.028} label="Exit VR" onClick={onExit}
          position={[0, HUD.y - HUD.h / 2 - 0.13, -HUD.dist + 0.05]} rotation={[tilt + 0.25, 0, 0]} />
      )}
    </group>
  );
}

export { HUD };
