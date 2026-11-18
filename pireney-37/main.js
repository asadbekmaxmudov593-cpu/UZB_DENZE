// Pireney sayohati — 80s cel anime. Page contract: DUR, render(t), READY, EV, TEXTS. ?raw=1 skips the CRT pass.
import { canvas, W, H } from './cel.js';
import { makePost } from './post.js';
import { DUR, SHOTS, shotAt, shot, LINES } from './story.js';
import { road, granada, hall, square, harbor, samarkand, mapPlate } from './places.js';
import * as SH from './shots.js';
import { hud, hudTexts } from './hud.js';

const qs = new URLSearchParams(location.search);
const [sc, g] = canvas(W, H), [gc, e] = canvas(W, H), [ovc, ov] = canvas(W, H);
const post = makePost(document.getElementById('gl'));
for (const f of ['italic 900 56px Kanit', 'italic 800 56px Kanit', '500 40px "Barlow SC"', '600 40px "Barlow SC"', '700 40px "Barlow SC"']) await document.fonts.load(f, 'AOʻ‘');
const A = { road: { day: road('day'), sunset: road('sunset') }, granada: granada(), hall: hall(), square: square(), harbor: harbor(), samarkand: samarkand(), map: mapPlate() };

function render(t) {
  for (const x of [g, e]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const [t0, t1, name] = shotAt(t);
  const over = SH[name]({ t, lt: t - t0, u: (t - t0) / (t1 - t0), t0, t1, name, g, e, A }) || {};
  if (qs.get('nosub')) ov.clearRect(0, 0, W, H); else hud(ov, t);
  const raw = qs.get('raw');
  post.render(sc, gc, Math.round(t * 24), ovc, raw ? { bloom: 0, halo: 0, soft: 0, flick: 0, lift: 0, contrast: 0, fade: 0, sat: 1, tint: [1, 1, 1], scan: 0, grille: 0, bleed: 1, rshift: 0, glow: 0, corner: 0, noiseA: 0, power: 1, track: 0, expo: 1 }
    : { power: Math.min(1, t / .6), track: 0, scan: .07, grille: .015, bleed: 3, rshift: .6, noiseA: .006, soft: .08, glow: .2, corner: .16, bloom: .7, halo: .12, sat: 1.08, ...over });
}
function events() {
  const ev = [], add = (type, t, o = {}) => ev.push({ type, t: +t.toFixed(3), ...o });
  add('crton', .02);
  for (const [t0, t1, name] of SHOTS) add('scene', t0, { name, dur: +(t1 - t0).toFixed(3) });
  for (const L of LINES) add('line', L.t, { who: L.who, d: L.d, voice: L.voice || null });
  return ev.sort((a, b) => a.t - b.t);
}
window.EV = events(); window.DUR = DUR; window.render = render; window.TEXTS = t => hudTexts(t);
render(+(qs.get('t') ?? 8));
window.READY = true;
