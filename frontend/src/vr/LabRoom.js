// The lab around the visitor. The real room is a Blender model
// (public/assets/vr/lab.glb); until it exists, or if it can't load, a
// simple stand-in with the same layout is built here: an eight-sided room,
// glowing strips along the ceiling and floor edges, ceiling light panels,
// and benches with screens and headsets along the side walls.
//
// Unlit materials only (MeshBasic): the light is "baked" into the colours,
// which keeps the Quest at a steady 72-90 fps.
import React, { Component, Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { LAB_MODEL } from "./data";

const PLAN = [[-2, -3.4], [2, -3.4], [3.4, -2], [3.4, 2], [2, 3.4], [-2, 3.4], [-3.4, 2], [-3.4, -2]];
const H = 3.0;
const STRIP = "#e4ece9";

function edgeTransform([x1, z1], [x2, z2], inset = 0) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(z2 - z1, x2 - x1);
  // inward normal (the plan runs clockwise seen from above)
  const nx = -(z2 - z1) / len, nz = (x2 - x1) / len;
  return { len, rotY: -ang, cx: (x1 + x2) / 2 + nx * inset, cz: (z1 + z2) / 2 + nz * inset };
}

function StandInRoom() {
  const floor = useMemo(() => {
    const s = new THREE.Shape(PLAN.map(([x, z]) => new THREE.Vector2(x, z)));
    return new THREE.ShapeGeometry(s);
  }, []);
  const edges = PLAN.map((p, i) => edgeTransform(p, PLAN[(i + 1) % PLAN.length], 0));
  const strips = PLAN.map((p, i) => edgeTransform(p, PLAN[(i + 1) % PLAN.length], 0.14));
  return (
    <group>
      {/* floor and ceiling */}
      <mesh geometry={floor} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <meshBasicMaterial color="#0d1110" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={floor} rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]} raycast={() => null}>
        <meshBasicMaterial color="#060707" side={THREE.DoubleSide} />
      </mesh>
      {/* walls: darker toward the floor, like the photo */}
      {edges.map((e, i) => (
        <mesh key={i} position={[e.cx, H / 2, e.cz]} rotation={[0, e.rotY, 0]} raycast={() => null}>
          <planeGeometry args={[e.len, H]} />
          <meshBasicMaterial color={i === 0 ? "#090b0a" : "#0b0e0d"} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* light strips along the floor and ceiling edges */}
      {strips.map((e, i) => (
        <group key={i} position={[e.cx, 0, e.cz]} rotation={[0, e.rotY, 0]}>
          <mesh position={[0, 0.3, 0]} raycast={() => null}><boxGeometry args={[e.len * 0.86, 0.035, 0.03]} /><meshBasicMaterial color={STRIP} /></mesh>
          <mesh position={[0, H - 0.3, 0]} raycast={() => null}><boxGeometry args={[e.len * 0.86, 0.035, 0.03]} /><meshBasicMaterial color={STRIP} /></mesh>
        </group>
      ))}
      {/* ceiling light panels: two angled rows */}
      {[-1, 1].map((side) => [0, 1, 2].map((k) => (
        <mesh key={`${side}${k}`} position={[side * (1.0 + k * 0.35), H - 0.01, -1.6 + k * 1.1]} rotation={[Math.PI / 2, 0, side * 0.5]} raycast={() => null}>
          <planeGeometry args={[0.55, 0.9]} />
          <meshBasicMaterial color="#cfd6d3" side={THREE.DoubleSide} />
        </mesh>
      )))}
      {/* benches with screens and headsets on the side walls */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 3.05, 0, 0]}>
          <mesh position={[0, 0.85, 0]} raycast={() => null}><boxGeometry args={[0.6, 0.05, 3.4]} /><meshBasicMaterial color="#151918" /></mesh>
          {[-1.1, -0.2, 0.8].map((z, k) => (
            <mesh key={k} position={[-side * 0.05, 1.25 + (k % 2) * 0.35, z]} rotation={[0, -side * Math.PI / 2, 0]} raycast={() => null}>
              <planeGeometry args={[0.55, 0.36]} />
              <meshBasicMaterial color={k === 1 ? "#24423b" : "#1a2c28"} />
            </mesh>
          ))}
          {[-0.6, 0.3, 1.2].map((z, k) => (
            <mesh key={k} position={[-side * 0.12, 0.93, z]} raycast={() => null}><boxGeometry args={[0.18, 0.1, 0.12]} /><meshBasicMaterial color="#c9cfcc" /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Model() {
  const { scene } = useGLTF(LAB_MODEL);
  useEffect(() => { scene.traverse((o) => { if (o.isMesh) o.raycast = () => null; }); }, [scene]);
  return <primitive object={scene} />;
}

class Fallback extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <StandInRoom /> : this.props.children; }
}

// a soft ring on the floor where the visitor stands: a fixed reference
// under the feet makes standing in VR more comfortable
function FloorRing() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} raycast={() => null}>
      <ringGeometry args={[0.32, 0.34, 64]} />
      <meshBasicMaterial color="#00CD1F" transparent opacity={0.35} />
    </mesh>
  );
}

export default function LabRoom() {
  // only try the Blender model when the file is really there
  const [hasModel, setHasModel] = useState(null);
  useEffect(() => {
    fetch(LAB_MODEL, { method: "HEAD" })
      .then((r) => setHasModel(r.ok && !/html/.test(r.headers.get("content-type") || "")))
      .catch(() => setHasModel(false));
  }, []);
  return (
    <group>
      {hasModel ? (
        <Fallback><Suspense fallback={<StandInRoom />}><Model /></Suspense></Fallback>
      ) : <StandInRoom />}
      <FloorRing />
    </group>
  );
}
