// The flag of Uzbekistan as a cel: 500 × 250 construction (blue 0–80, red 80–85, white 85–165, red 165–170, green 170–250;
// crescent = circle r30 at (70,40) minus circle r30 at (80,40); 12 stars r6 in rows of 3/4/5, right-aligned), mapped onto a waving cloth.
// Hard-edged fold shading from the slope of the wave (cel, never a gradient); a coloured outline. Plus the pole, rope and finial.
import { cel, poly, path, line, TAU, mix } from './cel.js';

const STARS = [[136, 16], [160, 16], [184, 16], [112, 40], [136, 40], [160, 40], [184, 40], [88, 64], [112, 64], [136, 64], [160, 64], [184, 64]];
// cloth: hoist top at (x, y); length w (screen), height h; wind 0 (limp, hanging) .. 1 (flying); ph = wave phase (cycles)
export function clothMap(x, y, w, h, wind, ph, amp = 1) {
  const a0 = (1 - wind) * 1.28 + wind * .06;                  // direction of the fly edge: hanging down → straight out
  const waves = 1.2 + wind * .6, A = (6 + 26 * wind) * amp * (h / 250);
  return (u, v) => {                                          // u 0..1 along the flag, v 0..1 down the hoist
    const droop = (1 - wind) * .25 * u * u + wind * .05 * u * u;
    const a = a0 + droop, ca = Math.cos(a), sa = Math.sin(a);
    const wav = Math.sin(u * waves * TAU - ph * TAU + v * .6) * A * Math.pow(u, .85);
    const along = u * w * (1 - .06 * wind * Math.abs(Math.sin(u * waves * TAU - ph * TAU))), across = v * h;
    return [x + ca * along - sa * across - sa * wav, y + sa * along + ca * across + ca * wav];
  };
}
function band(M, v0, v1, N) { const top = [], bot = []; for (let i = 0; i <= N; i++) { const u = i / N; top.push(M(u, v0)); bot.push(M(u, v1)); } return poly(top.concat(bot.reverse())); }
function foldShade(M, v0, v1, N, wind, ph) {                  // columns where the cloth turns away from the light → hard shadow / highlight bands
  const sh = [], hi = [], waves = 1.2 + wind * .6;
  for (let i = 0; i < N; i++) {
    const u = (i + .5) / N, s = Math.cos(u * waves * TAU - ph * TAU);
    const q = poly([M(i / N, v0), M((i + 1) / N, v0), M((i + 1) / N, v1), M(i / N, v1)]);
    if (s > .42) sh.push(q); else if (s < -.7) hi.push(q);
  }
  return { sh, hi };
}
export function flag(g, e, P, o) {
  const { x, y, w, h } = o, wind = o.wind ?? 1, ph = o.ph || 0, N = 36;
  const M = clothMap(x, y, w, h, wind, ph, o.amp ?? 1);
  const parts = [[0, 80.6 / 250, P.fblue], [80 / 250, 85 / 250, P.fred], [84.6 / 250, 165.4 / 250, P.fwhite], [165 / 250, 170 / 250, P.fred], [169.4 / 250, 1, P.fgreen]];
  const lw = o.lw ?? 2;
  for (const [v0, v1, C] of parts) {
    const F = foldShade(M, v0, v1, N, wind, ph);
    cel(g, band(M, v0, v1, N), { f: C.f, s: C.s, sh: F.sh, h: C.h, hi: F.hi });
  }
  // crescent and stars, mapped through the cloth
  const toM = (lx, ly) => M(lx / 500, ly / 250);
  const cres = [];
  for (let k = 0; k <= 24; k++) { const a = -1.4 + k * 2.8 / 24 + Math.PI; cres.push(toM(70 + Math.cos(-a + Math.PI) * -30, 40 + Math.sin(a) * 30)); }
  const inner = [];
  for (let k = 24; k >= 0; k--) { const a = -1.4 + k * 2.8 / 24 + Math.PI; inner.push(toM(80 + Math.cos(-a + Math.PI) * -30 * .98, 40 + Math.sin(a) * 29.5)); }
  const moon = crescentPath(toM);
  g.fillStyle = P.fwhite.f; g.fill(moon);
  for (const [sx, sy] of STARS) {
    const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 6 * .382 : 6; pts.push(toM(sx + Math.cos(a) * r, sy + Math.sin(a) * r)); }
    g.fill(poly(pts));
  }
  // outline (coloured line, iro-sen)
  const top = [], bot = []; for (let i = 0; i <= N; i++) { top.push(M(i / N, 0)); bot.push(M(i / N, 1)); }
  g.strokeStyle = P.fblue.l; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(poly(top.concat(bot.reverse())));
  if (e && o.glow) {                                          // the sun through the cloth: the white stripe glows on the emissive canvas
    e.fillStyle = `rgba(255,236,190,${o.glow})`; e.fill(band(M, .34, .66, N));
  }
  return M;
}
function crescentPath(toM) {
  const p = [], d = 10, r = 30, hh = Math.sqrt(r * r - (d / 2) ** 2), a = Math.atan2(hh, d / 2), b = Math.atan2(hh, -d / 2);
  for (let k = 0; k <= 28; k++) { const t = -a - k * (2 * Math.PI - 2 * a) / 28; p.push(toM(70 + Math.cos(t) * r, 40 + Math.sin(t) * r)); }
  for (let k = 0; k <= 28; k++) { const t = b + k * (2 * Math.PI - 2 * b) / 28; p.push(toM(80 + Math.cos(t) * r, 40 + Math.sin(t) * r)); }
  return poly(p);
}
export function pole(g, P, x, yTop, yBot, wpx = 14) {
  cel(g, poly([[x - wpx / 2, yTop], [x + wpx / 2, yTop], [x + wpx / 2 + 2, yBot], [x - wpx / 2 - 2, yBot]]), { f: P.pole.f, s: P.pole.s, sh: [[[x + wpx * .1, yTop], [x + wpx / 2, yTop], [x + wpx / 2 + 2, yBot], [x + wpx * .1, yBot]]], h: P.pole.h, hi: [[[x - wpx * .35, yTop], [x - wpx * .15, yTop], [x - wpx * .15, yBot], [x - wpx * .35, yBot]]], l: P.pole.l, lw: 1.6 });
  const B = new Path2D(); B.ellipse(x, yTop - wpx * .9, wpx * 1.05, wpx * 1.05, 0, 0, TAU);
  cel(g, B, { f: P.gold.f, s: P.gold.s, so: [4, 3], h: P.gold.h, ho: [-3, -3], l: P.gold.l, lw: 1.6 });
}
export function rope(g, P, x, y0, y1, sag = 0) { line(g, [[x, y0], [x + sag, (y0 + y1) / 2], [x, y1]], mix(P.pole.l, '#ffffff', .25), 2.2); }
