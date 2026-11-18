// Diyorbek, full figure (13, slim): black suit trousers and jacket, white shirt, black shoes. Head-local units (cranium radius 80),
// feet at y ≈ 1060. Poses: 'stand', 'walk' (cycle phase ph 0..1, 4 drawings), 'pull' (hand over hand on a rope, ph), 'wave' (ph), 'carry' (folded flag at the chest).
import { cel, poly, path, line, TAU } from './cel.js';
import { head80 } from './head80.js';

const LW = 1.6;
function limb(g, A, B, w0, w1, st) {          // tapered limb as a cel shape
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return cel(g, poly([[A[0] + nx * w0, A[1] + ny * w0], [B[0] + nx * w1, B[1] + ny * w1], [B[0] - nx * w1, B[1] - ny * w1], [A[0] - nx * w0, A[1] - ny * w0]]), st);
}
const at = (P, a, L) => [P[0] + Math.cos(a) * L, P[1] + Math.sin(a) * L];
function hand(g, P, W, a, open = false) {
  const H = new Path2D(); H.ellipse(W[0] + Math.cos(a) * 16, W[1] + Math.sin(a) * 16, 17, 21, a - Math.PI / 2, 0, TAU);
  cel(g, H, { f: P.skin.f, s: P.skin.s, so: [3, 3], l: P.skin.l, lw: LW * .8 });
  if (open) for (let k = -1.5; k <= 1.5; k++) {   // spread fingers for the wave
    const b = at(W, a + k * .07, 26), tip = at(b, a + k * .28, 22);
    line(g, [b, tip], P.skin.l, 7.5); line(g, [b, tip], P.skin.f, 5);
  }
}
function arm(g, P, S, aU, aF, open = false) {   // shoulder S, upper-arm and forearm angles (radians, screen)
  const E = at(S, aU, 200), W = at(E, aF, 180);
  limb(g, S, E, 30, 25, { f: P.jacket.f, s: P.jacket.s, so: [-8, -4], l: P.jacket.l, lw: LW });
  limb(g, E, W, 25, 21, { f: P.jacket.f, s: P.jacket.s, so: [-8, -4], l: P.jacket.l, lw: LW });
  const C = new Path2D(); C.ellipse(E[0], E[1], 25, 25, 0, 0, TAU); g.fillStyle = P.jacket.f; g.fill(C);
  limb(g, at(W, aF, -4), at(W, aF, 10), 19, 19, { f: P.shirt.f, s: P.shirt.s, l: P.shirt.l, lw: LW * .8 });   // white cuff
  hand(g, P, at(W, aF, 8), aF, open);
}
export function figure(g, P, o = {}) {
  const pose = o.pose || 'stand', ph = o.ph || 0, view = o.view || 'q';
  const sw = pose === 'walk' ? Math.sin(ph * TAU) : 0, bob = pose === 'walk' ? -Math.abs(Math.cos(ph * TAU)) * 10 : 0;
  g.save(); g.translate(0, bob);
  // legs (black trousers) + shoes
  for (const [side, s] of [[-1, sw], [1, -sw]]) {
    const H = [side * 52 - 8, 470], a = Math.PI / 2 + s * .32, K = at(H, a, 290), F = at(K, Math.PI / 2 + s * .12 - (s > 0 ? .1 : 0), 290);
    limb(g, H, K, 52, 40, { f: P.pants.f, s: P.pants.s, so: [-10, -6], h: P.pants.h, l: P.pants.l, lw: LW });
    limb(g, K, F, 40, 33, { f: P.pants.f, s: P.pants.s, so: [-10, -6], l: P.pants.l, lw: LW });
    const Sh = new Path2D(); Sh.ellipse(F[0] + 16, F[1] + 18, 46, 22, 0, 0, TAU);
    cel(g, Sh, { f: P.shoe.f, s: P.shoe.s, so: [-4, -4], h: P.shoe.h, hi: [[[F[0] - 8, F[1] + 4], [F[0] + 30, F[1] + 2], [F[0] + 10, F[1] + 10]]], l: P.shoe.l, lw: LW });
  }
  // lower jacket (the head's bust draws the shoulders down to y 340)
  cel(g, poly([[-150, 320], [146, 320], [134, 500], [-140, 500]]), { f: P.jacket.f, s: P.jacket.s, so: [-20, -6], l: P.jacket.l, lw: LW * 1.1 });
  line(g, [[4, 320], [6, 500]], P.jacket.l, LW);
  // the far arm goes behind the body
  const L0 = [-120, 190], R0 = [114, 190];
  if (pose === 'pull') { const k = Math.sin(ph * TAU); arm(g, P, L0, -1.9 + k * .25, -1.65 + k * .3); }
  head80(g, P, { view, expr: o.expr || 'smile', ponytail: false, headset: false, blush: .06, look: o.look, mouth: o.mouth, open: o.open, wind: .1, ph: ph });
  // near arm(s)
  if (pose === 'walk') { arm(g, P, L0, Math.PI / 2 + sw * .35 + .1, Math.PI / 2 + sw * .45 + .1); arm(g, P, R0, Math.PI / 2 - sw * .35 - .1, Math.PI / 2 - sw * .3 - .2); }
  else if (pose === 'carry') {
    arm(g, P, L0, 1.75, -.15); arm(g, P, R0, 1.45, 3.3);
    cel(g, poly([[-70, 390], [80, 380], [86, 452], [-64, 462]]), { f: P.fblue.f, s: P.fblue.s, so: [-4, -4], l: P.fblue.l, lw: LW });   // the folded flag
    cel(g, poly([[-66, 420], [82, 412], [84, 428], [-64, 436]]), { f: P.fwhite.f, l: P.fwhite.l, lw: LW * .6 });
    cel(g, poly([[-64, 440], [84, 432], [86, 452], [-64, 462]]), { f: P.fgreen.f, l: P.fgreen.l, lw: LW * .6 });
  }
  else if (pose === 'pull') { const k = Math.sin(ph * TAU); arm(g, P, R0, -1.35 - k * .25, -1.5 - k * .3); }
  else if (pose === 'wave') { arm(g, P, L0, 1.7, 1.6); arm(g, P, R0, -.55, -1.45 + Math.sin(ph * TAU) * .35, true); }
  else { arm(g, P, L0, 1.7, 1.62); arm(g, P, R0, 1.45, 1.52); }
  g.restore();
}
