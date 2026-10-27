// Layered depth parallax for the intro: when the visitor rests on a frame,
// the frame splits into three layers (far / mid / near) that move by their own
// depth with the cursor (clouds over the city, towers against the sky, ships
// on their own axis, the pod against the street).
//
// Per frame, one atlas made offline (d_XXX.webp, 960x1890; see scratchpad depth/tools):
//   alpha of mid+near and of near (each object plus a thin ring, crisp or soft
//   like the picture's own edges), each layer's own smooth depth (extended past
//   its edges), and two clean plates (frame without mid+near / without near,
//   filled from the background only) for the strip a moving layer uncovers.
// Each layer is warped by its own smooth depth (no stretching inside a layer;
// small objects are rigid), then composited back to front. A front layer's
// colour at a soft edge is un-mixed from what lies under it, so with no
// offset the result is exactly the original frame and soft rims (cloud
// wisps) travel with their object instead of leaving a ghost behind.
//
// The canvas sits over the 2D frame canvas with the same CSS transform. With
// no offset it renders the frame exactly, so it can take over at any moment;
// it only shows once the current frame's layer files are in.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const DIR = "/assets/images/Sequence-v3/depth";
const LAST = 118;              // depth exists up to here (inside the lab the HUD arrives; flat there)
const AMP = 0.045;             // uv shift per unit depth at full cursor travel (clearly 3D, edges still clean)
const FOCUS = 0.3;             // depth that stays put (the far city and sky barely move; near things move a lot)

const VS = `attribute vec2 p; varying vec2 v;
void main(){ v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
varying vec2 v;
uniform sampler2D uImg, uAtlas;
uniform vec2 uCover, uOff;
// a tile of the 960x1890 atlas (clamped half a texel in, so tiles never bleed)
vec4 tile(vec2 p, float x0, float y0, float w, float h) {
  vec2 e = vec2(0.5 / w, 0.5 / h);
  p = clamp(p, e, 1.0 - e);
  return texture2D(uAtlas, vec2((x0 + p.x * w) / 960.0, (y0 + p.y * h) / 1890.0));
}
float depth(vec2 p, int k) {
  if (k == 0) return tile(p, 0.0, 1080.0, 480.0, 270.0).r;
  if (k == 1) return tile(p, 480.0, 1080.0, 480.0, 270.0).r;
  return tile(p, 0.0, 1350.0, 480.0, 270.0).r;
}
vec2 warp(vec2 uv, int k) {
  vec2 p = uv;
  for (int i = 0; i < 4; i++) p = uv + uOff * (depth(p, k) - ${FOCUS.toFixed(3)});
  return p;
}
vec3 unmix(vec3 img, vec3 under, float a) {
  return clamp((img - under * (1.0 - a)) / max(a, 0.02), 0.0, 1.0);
}
// the three layers' colours at a point (in that point's own frame coords)
void layers(vec2 p, out vec3 L0, out vec3 L1, out vec3 L2, out vec2 a) {
  vec3 img = texture2D(uImg, p).rgb;
  a = vec2(tile(p, 0.0, 0.0, 960.0, 540.0).r, tile(p, 0.0, 540.0, 960.0, 540.0).r);
  vec3 plate0 = tile(p, 0.0, 1620.0, 480.0, 270.0).rgb, plate1 = tile(p, 480.0, 1620.0, 480.0, 270.0).rgb;
  L0 = mix(img, plate0, a.r);                              // far: clean wherever something is in front
  L1 = mix(unmix(img, L0, a.r), plate1, a.g);              // mid: own colour, clean where near is in front
  L2 = unmix(img, mix(L0, L1, a.r), a.g);                  // near: own colour
}
void main(){
  vec2 uv = (v - 0.5) * uCover + 0.5;
  vec3 L0, L1, L2; vec2 a;
  layers(warp(uv, 0), L0, L1, L2, a);
  vec3 c = L0;
  layers(warp(uv, 1), L0, L1, L2, a);
  c = mix(c, L1, a.r);
  layers(warp(uv, 2), L0, L1, L2, a);
  c = mix(c, L2, a.g);
  gl_FragColor = vec4(c, 1.0);
}`;

const pad = (i) => String(i).padStart(3, "0");
const loadImg = (src) => new Promise((ok, no) => {
  const im = new Image(); im.decoding = "async";
  im.onload = () => ok(im); im.onerror = no; im.src = src;
});

const DepthParallax = forwardRef(function DepthParallax({ sourceRef }, ref) {
  const canvasRef = useRef(null);
  const api = useRef(null);

  useEffect(() => {
    // status for diagnosis: open the page with #depth to see it on screen
    const st = (window.__depth = { gl: "?", program: "?", loaded: 0, failed: 0, want: -1, ready: -1, shown: false, err: "" });
    let panel = null, panelTimer = 0;
    if (window.location.hash === "#depth") {
      panel = document.createElement("pre");
      Object.assign(panel.style, { position: "fixed", left: "8px", bottom: "8px", zIndex: 100000, margin: 0, padding: "8px 10px",
        font: "11px/1.4 monospace", color: "#0f0", background: "rgba(0,0,0,0.8)", pointerEvents: "none", whiteSpace: "pre-wrap", maxWidth: "46vw" });
      document.body.appendChild(panel);
      panelTimer = setInterval(() => { panel.textContent = "depth " + JSON.stringify(window.__depth, null, 1); }, 400);
    }
    const stop = () => { clearInterval(panelTimer); panel?.remove(); };
    const canvas = canvasRef.current;
    let gl = null;
    try { gl = canvas && canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false }); } catch (e) { st.err = String(e); }
    st.gl = gl ? String(gl.getParameter(gl.VERSION)) : "none";
    if (!gl) return stop;
    const sh = (t, s) => {
      const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) st.err += (t === gl.VERTEX_SHADER ? "VS: " : "FS: ") + gl.getShaderInfoLog(o);
      return o;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    st.program = gl.getProgramParameter(prog, gl.LINK_STATUS) ? "ok" : "FAILED " + gl.getProgramInfoLog(prog);
    if (st.program !== "ok") return stop;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const tex = (unit, name) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform1i(U(name), unit); return t;
    };
    const T = [tex(0, "uImg"), tex(1, "uAtlas")];
    const upload = (unit, im) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, T[unit]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); };

    const cache = new Map();          // frame -> Promise<atlas image>
    const layers = (i) => {
      if (!cache.has(i)) {
        const p = loadImg(`${DIR}/d_${pad(i)}.webp`);
        p.then(() => { st.loaded++; }, () => { st.failed++; st.err = `load failed: ${DIR}/d_${pad(i)}.webp`; cache.delete(i); });
        cache.set(i, p);
        if (cache.size > 140) cache.delete(cache.keys().next().value);
      }
      return cache.get(i);
    };

    let want = -1, ready = -1, img = null, off = [0, 0], dirty = false, alive = true;
    const state = { shown: false };
    const show = (on) => { st.shown = on; if (state.shown !== on) { state.shown = on; canvas.style.opacity = on ? "1" : "0"; } };

    const draw = () => {
      if (!alive || ready !== want || !img) return;
      const src = sourceRef.current;
      if (src && (canvas.width !== src.width || canvas.height !== src.height)) {
        canvas.width = src.width; canvas.height = src.height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      const a = canvas.width / canvas.height, f = img.naturalWidth / img.naturalHeight;
      gl.uniform2f(U("uCover"), a > f ? 1 : a / f, a > f ? f / a : 1);
      gl.uniform2f(U("uOff"), off[0], off[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      dirty = false;
    };

    api.current = {
      canvas,
      /** The frame now on the 2D canvas (and its decoded image). */
      setFrame(i, image) {
        if (i === want && image === img) return;
        want = i; img = image; show(false); st.want = i;
        if (i < 0 || i > LAST || !image) return;
        const target = i;
        layers(i).then((atlas) => {
          if (!alive || want !== target) return;
          try {
            upload(0, image); upload(1, atlas);
          } catch (e) { st.err = "upload: " + (e && e.message ? e.message : e); return; }
          const e = gl.getError(); if (e) st.err = "gl error " + e;
          ready = target; st.ready = target; dirty = true; draw(); show(true);
        }, () => {});
      },
      /** Cursor/hover offset (-1..1) times how much depth to show (0..1). */
      setOffset(x, y, k) {
        const nx = x * k * AMP, ny = y * k * AMP * 0.6;
        if (Math.abs(nx - off[0]) < 1e-5 && Math.abs(ny - off[1]) < 1e-5 && !dirty) return;
        off = [nx, ny]; draw();
      },
      /** Warm the cache for frames around i (call when the visitor rests). */
      /** Load every frame's layers in the background (two at a time). */
      preloadAll() {
        let next = 0;
        const pump = () => { if (!alive || next > LAST) return; const i = next++; layers(i).then(pump, pump); };
        pump(); pump();
      },
      prefetch(i) { for (const j of [i, i - 1, i + 1, i - 2, i + 2]) if (j >= 0 && j <= LAST) layers(j); },
      get active() { return state.shown; },
    };
    // every frame's layers, in the background once the intro frames are under way
    const pre = setTimeout(() => api.current?.preloadAll(), 2500);
    canvas.addEventListener("webglcontextlost", () => { st.err = "context lost"; show(false); });
    return () => { alive = false; clearTimeout(pre); api.current = null; stop(); };
  }, [sourceRef]);

  useImperativeHandle(ref, () => ({
    setFrame: (...a) => api.current?.setFrame(...a),
    setOffset: (...a) => api.current?.setOffset(...a),
    prefetch: (...a) => api.current?.prefetch(...a),
    preloadAll: () => api.current?.preloadAll(),
    get canvas() { return canvasRef.current; },
    get active() { return !!api.current?.active; },
  }), []);

  return (
    <canvas ref={canvasRef} aria-hidden
      style={{ display: "block", position: "absolute", inset: 0, width: "100vw", height: "100vh",
        pointerEvents: "none", opacity: 0, transformOrigin: "50% 50%", willChange: "transform" }} />
  );
});

export default DepthParallax;
