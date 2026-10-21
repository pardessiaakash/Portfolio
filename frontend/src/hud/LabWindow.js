// The lab as a window: once the main UI is up, the room behind the HUDs
// becomes 3D and its perspective follows the mouse, as if the screen were a
// pane of glass and you were looking into the room. The HUDs stay still.
//
// How: the room behind the last frame (end-148.webp) is a one-point-perspective
// render. Its back wall spans x 480–1440, y 265–722 of the 1920×1080 image.
// We rebuild the room as a box whose walls, floor and ceiling project onto
// exactly those lines, and colour every surface by projecting back through
// the render's own camera. At rest (eye centred) the result is the render,
// pixel for pixel, so the hand-off from the frame canvas is invisible; move
// the mouse and the eye moves, with an off-axis "window" projection.
//
// Loaded lazily (three.js is large), desktop only, off for reduced motion.

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const SRC = "/assets/images/Sequence-v3/end-148.webp";
// back wall of the clean plate for frame 148: the frame-162 measurements
// (x 480–1440, y 265–722) scaled by 0.905 about the centre
const IMG = { w: 1920, h: 1080, back: { x0: 525.6, x1: 1394.4, y0: 291.1, y1: 704.7 } };
// how far the eye travels, as a share of the visible glass (the effect's strength)
const RANGE = { x: 0.3, y: 0.22 };
const FOLLOW = 5;          // how quickly the view catches up with the mouse (higher = snappier)

export default function LabWindow({ active }) {
  const ref = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (e) {
      return undefined;     // no WebGL: the flat frame stays, nothing breaks
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // the render's own camera: at the eye, frustum through the image rectangle
    const photoCam = new THREE.PerspectiveCamera();
    photoCam.position.set(0, 0, E);
    photoCam.updateMatrixWorld();
    const n0 = 0.05;
    photoCam.projectionMatrix.makePerspective(-PW / 2 * n0 / E, PW / 2 * n0 / E, PH / 2 * n0 / E, -PH / 2 * n0 / E, n0, 100);
    const photoVP = new THREE.Matrix4().multiplyMatrices(photoCam.projectionMatrix, photoCam.matrixWorldInverse);

    let ready = false, dirty = true;
    const tex = new THREE.TextureLoader().load(SRC, () => { ready = true; dirty = true; });
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
          vec2 uv = p.xy / p.w * 0.5 + 0.5;
          // past the render's edges: keep the edge colour and let it fall into shadow
          vec2 o = max(vec2(0.0), max(-uv, uv - 1.0));
          vec3 c = texture2D(map, clamp(uv, 0.001, 0.999)).rgb;
          c *= 1.0 - smoothstep(0.0, 0.12, length(o));
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.BackSide,
    });
    const room = new THREE.Mesh(new THREE.BoxGeometry(2 * X, YT - YB, D + FRONT, 32, 32, 32), mat);
    room.position.set(0, (YT + YB) / 2, (FRONT - D) / 2);
    scene.add(room);

    // the viewer's eye and the glass (the part of the render the window shows)
    const cam = new THREE.PerspectiveCamera();
    let SW = PW, SH = PH;
    const eye = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      // "cover", exactly like the frame canvas, so the two line up
      const a = w / h, pa = PW / PH;
      if (a > pa) { SW = PW; SH = PW / a; } else { SH = PH; SW = PH * a; }
      dirty = true;
    };
    const project = () => {
      const n = 0.02;
      cam.projectionMatrix.makePerspective((-SW / 2 - eye.x) * n / E, (SW / 2 - eye.x) * n / E, (SH / 2 - eye.y) * n / E, (-SH / 2 - eye.y) * n / E, n, 60);
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      cam.position.set(eye.x, eye.y, E);
      cam.rotation.set(0, 0, 0);
      cam.updateMatrixWorld();
    };
    fit();
    window.addEventListener("resize", fit);

    // the view only moves when the mouse does
    const onMove = (e) => {
      if (!activeRef.current) return;
      target.x = (e.clientX / window.innerWidth - 0.5) * 2 * SW * RANGE.x;
      target.y = -(e.clientY / window.innerHeight - 0.5) * 2 * SH * RANGE.y;
    };
    const onLeave = () => { target.x = 0; target.y = 0; };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("mouseleave", onLeave);

    let raf, last = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!activeRef.current) { target.x = 0; target.y = 0; }
      const f = Math.min(1, dt * FOLLOW);
      const dx = target.x - eye.x, dy = target.y - eye.y;
      if (Math.abs(dx) > 1e-5 || Math.abs(dy) > 1e-5) { eye.x += dx * f; eye.y += dy * f; dirty = true; }
      if (!ready || !dirty || document.hidden) return;
      project();
      renderer.render(scene, cam);
      dirty = false;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      room.geometry.dispose(); mat.dispose(); tex.dispose(); renderer.dispose();
    };
  }, []);

  return (
    <canvas ref={ref} aria-hidden="true" style={{
      position: "absolute", inset: 0, width: "100vw", height: "100vh", display: "block", zIndex: 1,
      pointerEvents: "none",
      // appears only once the UI is up; at rest it matches the frame beneath exactly
      opacity: active ? 1 : 0, transition: "opacity 0.35s ease",
    }} />
  );
}
