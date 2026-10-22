// The lab as a window: once the main UI is up, the room behind the HUDs
// becomes 3D and its perspective follows the mouse, as if the screen were a
// pane of glass and you were looking into the room. The HUDs stay still.
//
// How: the room behind the last frame (end-148.webp) is a one-point-perspective
// render. Its back wall spans x 526–1394, y 291–705 of the 1920×1080 image.
// We rebuild the room as a box whose walls, floor and ceiling project onto
// exactly those lines, and colour every surface by projecting back through
// the render's own camera. At rest (eye centred) the result is the render,
// pixel for pixel, so the hand-off from the frame canvas is invisible; move
// the mouse and the eye moves, with an off-axis "window" projection.
//
// The eye can also travel in depth (see labRoom.js): toward the glass for the
// category pages ("step into the lab"), and in from far behind it when the
// visitor skips the cinematic. The glass stays put, so the room opens up
// around the viewer: the same illusion as the window experiment.
//
// One canvas and one WebGL context live for the whole visit and move between
// pages, so the room never reloads or jumps on navigation.
//
// Loaded lazily (three.js is large), desktop only, off for reduced motion.

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { lab, subscribeLab } from "./labRoom";

const SRC = "/assets/images/Sequence-v3/end-148.webp";
// back wall of the clean plate for frame 148: the frame-162 measurements
// (x 480–1440, y 265–722) scaled by 0.905 about the centre
const IMG = { w: 1920, h: 1080, back: { x0: 525.6, x1: 1394.4, y0: 291.1, y1: 704.7 } };
// how far the eye travels, as a share of the visible glass (the effect's strength)
const RANGE = { x: 0.3, y: 0.22 };
const FOLLOW = 5;          // how quickly the view catches up with the mouse (higher = snappier)
// resting eye distance from the glass, as a share of the plate's own (1 = the plate)
// and of the room's depth for the dive
const DEPTH = { inner: 0.42 };         // inner: eye pushed in by 42% of the room's depth
const FAR = 2.3;                       // skip: the eye starts this many plate-distances back
const DUR = { dive: 1500, far: 1900 }; // ms

// floating dust in the lamp light (as in the window experiment, ~35% fewer
// specks): most hang in the room behind the HUDs, a few very small ones
// drift in front of them on a layer above the HUDs (LabFrontDust), so the
// HUDs float inside the dust. Both move with the same 3D view.
const DUST = {
  // (brighter than the experiment's: the room is dimmed behind the HUDs)
  back: { n: 230, size: 0.016, opacity: 0.8 },
  front: { n: 45, size: 0.009, opacity: 0.55 },
  hudDepth: 0.35,       // the HUDs read about this far into the room (share of its depth)
  rise: 0.012,          // world units per second
};

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

let room = null;     // the one room for the whole visit

function createRoom() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    return null;          // no WebGL: the flat backgrounds stay, nothing breaks
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  // room geometry, from the render's measurements
  const PH = 2, PW = PH * IMG.w / IMG.h;
  const E = 0.9 * PW;                                   // the render's eye distance from the glass
  const k = (IMG.back.x1 - IMG.back.x0) / IMG.w;
  const D = E * (1 / k - 1);                            // depth so the side walls meet the glass edges
  const S = (E + D) / E;
  const X = PW / 2;
  const YT = (0.5 - IMG.back.y0 / IMG.h) * PH * S;      // ceiling
  const YB = (0.5 - IMG.back.y1 / IMG.h) * PH * S;      // floor
  const FRONT = E * 0.6;                                // floor and ceiling run on under the glass edge
  const zFor = (depth) => (depth === "inner" ? E - D * DEPTH.inner : E);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // the render's own camera: at the eye, frustum through the image rectangle
  const photoCam = new THREE.PerspectiveCamera();
  photoCam.position.set(0, 0, E);
  photoCam.updateMatrixWorld();
  const n0 = 0.05;
  photoCam.projectionMatrix.makePerspective(-PW / 2 * n0 / E, PW / 2 * n0 / E, PH / 2 * n0 / E, -PH / 2 * n0 / E, n0, 100);
  const photoVP = new THREE.Matrix4().multiplyMatrices(photoCam.projectionMatrix, photoCam.matrixWorldInverse);

  const r = { canvas, ready: false, dirty: true, attached: false, active: false, readyCbs: [] };
  const tex = new THREE.TextureLoader().load(SRC, () => {
    r.ready = true; r.dirty = true;
    r.readyCbs.splice(0).forEach((fn) => fn());
  });
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, vp: { value: photoVP } },
    vertexShader: `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform sampler2D map; uniform mat4 vp; varying vec3 vW;
      void main() {
        vec4 p = vp * vec4(vW, 1.0);
        vec2 uv = p.xy / max(p.w, 1e-4) * 0.5 + 0.5;
        // past the render's edges: keep the edge colour and let it fall into shadow
        vec2 o = max(vec2(0.0), max(-uv, uv - 1.0));
        vec3 c = texture2D(map, clamp(uv, 0.001, 0.999)).rgb;
        c *= 1.0 - smoothstep(0.0, 0.12, length(o));
        if (p.w <= 0.0) c = vec3(0.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide,
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(2 * X, YT - YB, D + FRONT, 32, 32, 32), mat);
  box.position.set(0, (YT + YB) / 2, (FRONT - D) / 2);
  scene.add(box);

  // dust: behind the HUDs in the room scene, in front of them in a second
  // scene drawn on a transparent canvas above the HUDs
  const hudZ = -D * DUST.hudDepth;
  const makeDust = ({ n, size, opacity }, z0, z1, additive = true) => {
    const pos = new Float32Array(n * 3), lo = new Float32Array(n), hi = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const z = z0 + Math.random() * (z1 - z0);
      // the part of the room visible at this depth (it narrows toward the eye)
      const k2 = Math.min(1, (E - z) / E);
      const hx = z < 0 ? X : X * k2, top = z < 0 ? YT : PH / 2 * k2, bot = z < 0 ? YB : -PH / 2 * k2;
      pos[i * 3] = (Math.random() - 0.5) * 2 * hx * 0.95;
      pos[i * 3 + 1] = bot + Math.random() * (top - bot);
      pos[i * 3 + 2] = z;
      lo[i] = bot; hi[i] = top;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xcfe4e4, size, transparent: true, opacity, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    pts.userData = { lo, hi };
    return pts;
  };
  const dustBack = makeDust(DUST.back, -D * 0.97, hudZ);
  scene.add(dustBack);
  const frontScene = new THREE.Scene();
  const dustFront = makeDust(DUST.front, hudZ + 0.05, E * 0.4, false);
  frontScene.add(dustFront);
  const riseDust = (pts, dt) => {
    const a = pts.geometry.attributes.position, { lo, hi } = pts.userData;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + dt * DUST.rise;
      if (y > hi[i]) y = lo[i];
      a.setY(i, y);
    }
    a.needsUpdate = true;
  };
  let front = null;   // { renderer, canvas } once a page shows the front layer

  // the viewer's eye and the glass (the part of the render the window shows)
  const cam = new THREE.PerspectiveCamera();
  let SW = PW, SH = PH;
  const eye = { x: 0, y: 0, z: zFor(lab.depth) }, target = { x: 0, y: 0 };
  let tween = null;   // { from, to, t0, dur, ease }
  const fit = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (front) front.renderer.setSize(w, h, false);
    // "cover", exactly like the frame canvas, so the two line up
    const a = w / h, pa = PW / PH;
    if (a > pa) { SW = PW; SH = PW / a; } else { SH = PH; SW = PH * a; }
    r.dirty = true;
  };
  const project = () => {
    const n = 0.02, ez = Math.max(0.15, eye.z);
    cam.projectionMatrix.makePerspective((-SW / 2 - eye.x) * n / ez, (SW / 2 - eye.x) * n / ez, (SH / 2 - eye.y) * n / ez, (-SH / 2 - eye.y) * n / ez, n, 60);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.position.set(eye.x, eye.y, eye.z);
    cam.rotation.set(0, 0, 0);
    cam.updateMatrixWorld();
  };
  fit();
  window.addEventListener("resize", fit);

  // the view only moves when the mouse does (and not while travelling)
  window.addEventListener("pointermove", (e) => {
    if (!r.active || tween) return;
    // over a HUD the room glides back to its centred view and rests there,
    // so reading and clicking aren't disturbed; it follows the cursor again
    // once it leaves the HUDs
    if (e.target?.closest?.("[data-lab-hud]")) { target.x = 0; target.y = 0; return; }
    // nearer the glass the same eye shift looks stronger, so it shrinks
    const s = Math.min(1, eye.z / E);
    target.x = (e.clientX / window.innerWidth - 0.5) * 2 * SW * RANGE.x * s;
    target.y = -(e.clientY / window.innerHeight - 0.5) * 2 * SH * RANGE.y * s;
  });
  document.addEventListener("mouseleave", () => { target.x = 0; target.y = 0; });

  // travel between depths
  subscribeLab((e) => {
    if (e.type !== "depth") return;
    const to = zFor(e.depth);
    if (e.instant) { tween = null; eye.z = to; r.dirty = true; return; }
    const from = e.from === "far" ? E * FAR : eye.z;
    target.x = 0; target.y = 0;
    tween = { from, to, t0: performance.now(), dur: e.from === "far" ? DUR.far : DUR.dive, ease: e.from === "far" ? easeOut : easeInOut };
    eye.z = from; r.dirty = true;
  });

  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tween) {
      const t = Math.min(1, (now - tween.t0) / tween.dur);
      eye.z = tween.from + (tween.to - tween.from) * tween.ease(t);
      if (t >= 1) tween = null;
      r.dirty = true;
    }
    if (!r.active || tween) { target.x = 0; target.y = 0; }
    const f = Math.min(1, dt * FOLLOW);
    const dx = target.x - eye.x, dy = target.y - eye.y;
    if (Math.abs(dx) > 1e-5 || Math.abs(dy) > 1e-5) { eye.x += dx * f; eye.y += dy * f; r.dirty = true; }
    if (!r.ready || !r.attached || document.hidden) return;
    // the dust drifts while the room is shown, so it redraws every frame then
    if (r.active) { riseDust(dustBack, dt); riseDust(dustFront, dt); r.dirty = true; }
    if (!r.dirty) return;
    project();
    renderer.render(scene, cam);
    if (front && front.attached) front.renderer.render(frontScene, cam);
    r.dirty = false;
  };
  requestAnimationFrame(tick);

  // the front dust layer: its own transparent canvas, created on first use
  r.attachFront = (el) => {
    if (!front) {
      const canvas2 = document.createElement("canvas");
      Object.assign(canvas2.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
      let r2;
      try {
        r2 = new THREE.WebGLRenderer({ canvas: canvas2, antialias: true, alpha: true });
      } catch (e) { return false; }
      r2.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      r2.setClearColor(0x000000, 0);
      r2.setSize(window.innerWidth, window.innerHeight, false);
      front = { renderer: r2, canvas: canvas2, attached: false };
    }
    el.appendChild(front.canvas);
    front.attached = true; r.dirty = true;
    return true;
  };
  r.detachFront = () => {
    if (!front) return;
    if (front.canvas.parentNode) front.canvas.parentNode.removeChild(front.canvas);
    front.attached = false;
  };
  return r;
}

/** Calls fn once the room is drawn (right away if it already is). */
export function whenLabReady(fn) {
  if (!room) return;
  if (room.ready) fn(); else room.readyCbs.push(fn);
}

export default function LabWindow({ active, zIndex = 1, fadeMs = 350 }) {
  const ref = useRef(null);
  // shown once the room is drawn (straight away when it moved here from another page)
  const [ready, setReady] = useState(() => !!room?.ready);

  useEffect(() => {
    if (!room) room = createRoom();
    if (!room || !ref.current) return undefined;
    const r = room;
    ref.current.appendChild(r.canvas);
    r.attached = true; r.dirty = true;
    let live = true;
    if (r.ready) lab.ready = true;
    else r.readyCbs.push(() => { if (!live) return; lab.ready = true; requestAnimationFrame(() => live && setReady(true)); });
    return () => {
      live = false;
      if (r.canvas.parentNode) r.canvas.parentNode.removeChild(r.canvas);
      r.attached = false; r.active = false;
      lab.ready = false;
    };
  }, []);

  useEffect(() => { if (room) { room.active = active; room.dirty = true; } }, [active]);

  return (
    <div ref={ref} aria-hidden="true" style={{
      position: "absolute", inset: 0, zIndex, pointerEvents: "none", overflow: "hidden",
      // appears only once the UI is up; at rest it matches the frame beneath exactly
      opacity: active && ready ? 1 : 0, transition: `opacity ${fadeMs}ms ease`,
    }} />
  );
}

/** The dust in front of the HUDs: a transparent layer placed above them. */
export function LabFrontDust({ active, zIndex = 6 }) {
  const ref = useRef(null);
  useEffect(() => {
    // the room is created by LabWindow; wait a frame or two if it isn't yet
    let raf, attached = null, tries = 0;
    const attach = () => {
      if (room && ref.current) { if (room.attachFront(ref.current)) attached = room; return; }
      if (++tries < 120) raf = requestAnimationFrame(attach);
    };
    attach();
    return () => { cancelAnimationFrame(raf); attached?.detachFront(); };
  }, []);
  return (
    <div ref={ref} aria-hidden="true" style={{
      position: "absolute", inset: 0, zIndex, pointerEvents: "none", overflow: "hidden",
      opacity: active ? 1 : 0, transition: "opacity 0.6s ease",
    }} />
  );
}
