// Slide pictures for the big screen. Each 2x slide is ~26 MB of GPU memory,
// so only the current one and its neighbours are kept; older ones are freed.
import { useEffect, useState } from "react";
import * as THREE from "three";

const cache = new Map();            // url -> Promise<Texture>
const KEEP = 5;
const loader = new THREE.TextureLoader();

function load(url, gl) {
  if (cache.has(url)) { const p = cache.get(url); cache.delete(url); cache.set(url, p); return p; }
  const p = new Promise((res, rej) => loader.load(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, gl?.capabilities?.getMaxAnisotropy?.() || 4);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    res(t);
  }, undefined, rej));
  cache.set(url, p);
  while (cache.size > KEEP) {
    const [old, op] = cache.entries().next().value;
    cache.delete(old);
    op.then((t) => t.dispose()).catch(() => {});
  }
  return p;
}

/** The texture for slides[index] and whether it is that slide yet (the
 *  previous one stays up while the next loads); preloads the neighbours. */
export function useSlideTexture(slides, index, gl) {
  const [state, setState] = useState({ tex: null, url: null });
  const url = slides?.[index];
  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    load(url, gl).then((tex) => { if (alive) setState({ tex, url }); }).catch(() => {});
    [index + 1, index - 1].forEach((i) => slides[i] && load(slides[i], gl).catch(() => {}));
    return () => { alive = false; };
  }, [url, slides, index, gl]);
  return { tex: state.tex, ready: state.url === url };
}
