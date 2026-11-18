// The flag of Uzbekistan as painted cloth (background-art quality, not a flat logo).
// Construction 500 × 250: blue 0–80, red 80–85, white 85–165, red 165–170, green 170–250; crescent = circle r30 at (70,40) minus
// circle r30 at (80,40); 12 stars r6 in rows of 3 / 4 / 5, right-aligned. The cloth is a grid of small quads, each painted with its
// stripe colour lit by the slope of the wave (diagonal folds, a secondary ripple, a soft sheen), so it reads as fabric in the wind.
import { poly, mix, TAU, rgba } from './cel.js';

const STARS = [[136, 16], [160, 16], [184, 16], [112, 40], [136, 40], [160, 40], [184, 40], [88, 64], [112, 64], [136, 64], [160, 64], [184, 64]];
const BANDS = [[0, 80.6, 'fblue', 5], [80, 85, 'fred', 1], [84.6, 165.4, 'fwhite', 5], [165, 170, 'fred', 1], [169.4, 250, 'fgreen', 5]];

// cloth surface: hoist top at (x, y), length w, height h; wind 0 (limp, hanging down the pole) .. 1 (flying); ph = wave phase (cycles)
export function clothMap(x, y, w, h, wind, ph, amp = 1) {
  const a0 = (1 - wind) * 1.36 + wind * .05;
  const waves = 1.05 + wind * .75, A = (5 + 30 * wind) * amp * (h / 250);
  const D = (u, v) => {                                     // displacement out of the cloth plane
    const f = TAU * (waves * u - ph) + v * 1.5;
    return (A * Math.sin(f) + A * .32 * Math.sin(2 * f + 1.3 + v * 2.1)) * Math.pow(u, .8) + (1 - wind) * 6 * Math.sin(v * 9 + u * 3) * u;
  };
  const M = (u, v) => {
    const droop = (1 - wind) * .22 * u * u + wind * .05 * u * u, a = a0 + droop, ca = Math.cos(a), sa = Math.sin(a);
    const f = TAU * (waves * u - ph) + v * 1.5;
    const along = u * w * (1 - .05 * wind * Math.abs(Math.sin(f))), across = v * h * (1 - (1 - wind) * .12 * u), d = D(u, v);
    return [x + ca * along - sa * across - sa * d, y + sa * along + ca * across + ca * d];
  };
  M.light = (u, v) => {                                     // −1 (fold turned away) .. +1 (facing the light)
    const e = .01, du = (D(Math.min(1, u + e), v) - D(Math.max(0, u - e), v)) / (2 * e * w), dv = (D(u, Math.min(1, v + e)) - D(u, Math.max(0, v - e))) / (2 * e * h);
    return Math.max(-1, Math.min(1, -du * 3.2 - dv * 1.2));
  };
  return M;
}
function quad(M, u0, u1, v0, v1, grow = .6) {
  const a = M(u0, v0), b = M(u1, v0), c = M(u1, v1), d = M(u0, v1), cx = (a[0] + b[0] + c[0] + d[0]) / 4, cy = (a[1] + b[1] + c[1] + d[1]) / 4;
  const g = p => { const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * grow, p[1] + dy / L * grow]; };
  return poly([g(a), g(b), g(c), g(d)]);
}
const shadeCol = (C, s, warm) => s < 0 ? mix(C.f, mix(C.s, '#101a3a', .25), Math.min(1, -s * .85)) : mix(C.f, warm, s * .38);

export function flag(g, e, P, o) {
  const { x, y, w, h } = o, wind = o.wind ?? 1, ph = o.ph || 0;
  const NU = o.nu ?? 130, M = clothMap(x, y, w, h, wind, ph, o.amp ?? 1), warm = o.warm || '#fff6e4';
  // 1 · cloth: painted quads, each stripe subdivided across so the folds can run diagonally
  for (const [a, b, key, rows] of BANDS) {
    const C = P[key];
    for (let r = 0; r < rows; r++) {
      const v0 = (a + (b - a) * r / rows) / 250, v1 = (a + (b - a) * (r + 1) / rows) / 250;
      for (let i = 0; i < NU; i++) {
        const u0 = i / NU, u1 = (i + 1) / NU, s = M.light((u0 + u1) / 2, (v0 + v1) / 2);
        g.fillStyle = shadeCol(C, s, warm); g.fill(quad(M, u0, u1, v0, v1));
      }
    }
  }
  // 2 · crescent and stars, painted with the light of the cloth under them
  const toM = (lx, ly) => M(lx / 500, ly / 250);
  const W = P.fwhite;
  g.fillStyle = shadeCol(W, M.light(70 / 500, 40 / 250) * .8, warm); g.fill(crescentPath(toM));
  for (const [sx, sy] of STARS) {
    const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 6 * .382 : 6; pts.push(toM(sx + Math.cos(a) * r, sy + Math.sin(a) * r)); }
    g.fillStyle = shadeCol(W, M.light(sx / 500, sy / 250) * .8, warm); g.fill(poly(pts));
  }
  // 3 · hoist hem (a doubled-over sleeve with two grommets) and a faint edge
  g.fillStyle = rgba('#000000', .16); g.fill(quad(M, 0, .022, 0, 1, 0));
  for (const v of [.06, .94]) { const p = M(.01, v); g.fillStyle = '#c8ccd6'; g.beginPath(); g.arc(p[0], p[1], Math.max(1.5, h * .018), 0, TAU); g.fill(); }
  const top = [], bot = []; for (let i = 0; i <= NU; i++) { top.push(M(i / NU, 0)); bot.push(M(i / NU, 1)); }
  g.strokeStyle = rgba('#0a1a2a', .28); g.lineWidth = Math.max(.8, h / 300); g.stroke(poly(top.concat(bot.reverse())));
  if (e && o.glow) {                                         // the sun through the white stripe
    e.fillStyle = `rgba(255,236,190,${o.glow})`;
    for (let i = 0; i < NU; i += 3) e.fill(quad(M, i / NU, Math.min(1, (i + 3) / NU), .34, .66));
  }
  return M;
}
function crescentPath(toM) {
  const p = [], d = 10, r = 30, hh = Math.sqrt(r * r - (d / 2) ** 2), a = Math.atan2(hh, d / 2), b = Math.atan2(hh, -d / 2);
  for (let k = 0; k <= 28; k++) { const t = -a - k * (2 * Math.PI - 2 * a) / 28; p.push(toM(70 + Math.cos(t) * r, 40 + Math.sin(t) * r)); }
  for (let k = 0; k <= 28; k++) { const t = b + k * (2 * Math.PI - 2 * b) / 28; p.push(toM(80 + Math.cos(t) * r, 40 + Math.sin(t) * r)); }
  return poly(p);
}
// a brushed-metal pole: a soft cylinder (painted, light from the left), a gold finial
export function pole(g, P, x, yTop, yBot, wpx = 14) {
  const gr = g.createLinearGradient(x - wpx / 2, 0, x + wpx / 2, 0);
  gr.addColorStop(0, mix(P.pole.s, '#000000', .2)); gr.addColorStop(.22, P.pole.h); gr.addColorStop(.45, P.pole.f); gr.addColorStop(1, P.pole.s);
  g.fillStyle = gr; g.fillRect(x - wpx / 2, yTop, wpx, yBot - yTop);
  const r = wpx * 1.05, cy = yTop - r * .85, bg = g.createRadialGradient(x - r * .35, cy - r * .35, r * .1, x, cy, r);
  bg.addColorStop(0, P.gold.h); bg.addColorStop(.5, P.gold.f); bg.addColorStop(1, P.gold.s);
  g.fillStyle = bg; g.beginPath(); g.arc(x, cy, r, 0, TAU); g.fill();
}
export function rope(g, P, x, y0, y1, sag = 0) {
  g.strokeStyle = rgba(mix(P.pole.l, '#ffffff', .45), .85); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + sag, (y0 + y1) / 2, x, y1); g.stroke();
}
