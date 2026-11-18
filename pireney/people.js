// Historical people as cels: a long robe (and optional mantle with ermine), sleeves, hands, and an 80s head with headwear.
// Head-local units like figure.js (cranium radius 80, feet at y ≈ 1060; seated figures end at y ≈ 780).
// o = { robe, mantle, ermine, belt, trim, head: { crown | turban | hat | hood | veil, beard, mustache, hairCol }, pose, female, ph, look, mouth }
import { cel, poly, path, line, TAU, mix } from './cel.js';
import { head80, BOY } from './head80.js';
import { fab } from './pal.js';

const LW = 1.6;
function limb(g, A, B, w0, w1, st) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return cel(g, poly([[A[0] + nx * w0, A[1] + ny * w0], [B[0] + nx * w1, B[1] + ny * w1], [B[0] - nx * w1, B[1] - ny * w1], [A[0] - nx * w0, A[1] - ny * w0]]), st);
}
const at = (P, a, L) => [P[0] + Math.cos(a) * L, P[1] + Math.sin(a) * L];
function sleeveArm(g, P, R, S, aU, aF, o) {
  const E = at(S, aU, 190), W = at(E, aF, 170);
  limb(g, S, E, 36, 34, { f: R.f, s: R.s, so: [-8, -4], l: R.l, lw: LW });
  limb(g, E, W, 34, 40, { f: R.f, s: R.s, so: [-8, -4], l: R.l, lw: LW });                 // wide medieval sleeve
  const H = new Path2D(); H.ellipse(W[0] + Math.cos(aF) * 16, W[1] + Math.sin(aF) * 16, 17, 21, aF - Math.PI / 2, 0, TAU);
  cel(g, H, { f: P.skin.f, s: P.skin.s, so: [3, 3], l: P.skin.l, lw: LW * .8 });
  if (o.holding === 'scroll' && aF < 0) { cel(g, poly([at(W, aF, 10), at(W, aF, 70), at(at(W, aF, 70), aF + 1.57, 30), at(at(W, aF, 10), aF + 1.57, 30)]), { f: '#efe2c0', s: '#c8b48a', so: [-3, -3], l: '#6a5030', lw: LW }); }
  return W;
}
function crown(g, P, w = 72, y = -92) {
  const G = P.gold, pts = [[-w, y + 26, 1], [-w, y - 4, 1], [-w * .66, y + 8, 1], [-w * .33, y - 14, 1], [0, y + 6, 1], [w * .33, y - 14, 1], [w * .66, y + 8, 1], [w, y - 4, 1], [w, y + 26, 1]];
  cel(g, pts, { f: G.f, s: G.s, sh: [[[-w, y + 16], [w, y + 16], [w, y + 26], [-w, y + 26]]], h: G.h, hi: [[[-w + 6, y + 4], [-w + 30, y + 2], [-w + 30, y + 10], [-w + 6, y + 12]]], l: G.l, lw: LW });
  for (const [x, c] of [[-w * .5, '#d0283a'], [0, '#2a7ad0'], [w * .5, '#2aa050']]) { const J = new Path2D(); J.ellipse(x, y + 14, 7, 6, 0, 0, TAU); cel(g, J, { f: c, l: G.l, lw: 1 }); }
}
function turban(g, C, big = 1) {
  const T = new Path2D(); T.ellipse(-4, -78, 90 * big, 56 * big, 0, 0, TAU);
  cel(g, T, { f: C.f, s: C.s, so: [-10, -8], h: C.h, l: C.l, lw: LW });
  for (const k of [-1, 0, 1]) line(g, [[-82 * big, -70 + k * 18], [0, -104 + k * 22], [80 * big, -76 + k * 18]], C.s, 2.2);
}
function hat(g, C) { cel(g, [[-86, -70, 1], [-60, -112], [60, -116], [90, -74, 1], [40, -80], [-40, -78]], { f: C.f, s: C.s, so: [-6, -6], h: C.h, l: C.l, lw: LW }); }
function hood(g, C, front) {
  if (!front) cel(g, [[-96, -40], [-80, -110], [0, -132], [80, -112], [98, -30], [96, 120], [-96, 120]], { f: C.f, s: C.s, so: [-10, -6], l: C.l, lw: LW });
  else cel(g, [[-96, -40], [-80, -110], [0, -132], [80, -112], [98, -30], [70, -50], [0, -74], [-70, -50]], { f: C.f, s: C.s, so: [-6, -6], h: C.h, l: C.l, lw: LW });
}
function veil(g, C, front) {
  if (!front) cel(g, [[-92, -60], [-70, -110], [0, -124], [70, -110], [96, -56], [120, 210], [-120, 210]], { f: C.f, s: C.s, so: [-8, -6], l: C.l, lw: LW });
  else cel(g, [[-90, -50], [-64, -104], [0, -118], [64, -104], [90, -48], [60, -70], [0, -84], [-60, -70]], { f: C.f, s: C.s, so: [-5, -5], h: C.h, l: C.l, lw: LW });
}
// light: the scene's light name (for fabric colour models); P: that light's palette (skin, gold…)
export function person(g, P, light, o = {}) {
  const R = fab(o.robe || '#8a2a2a', light), M = o.mantle ? fab(o.mantle, light) : null, H = o.head || {};
  const pose = o.pose || 'stand', ph = o.ph || 0, seated = pose === 'sit', bottom = seated ? 780 : 1050;
  const sw = pose === 'walk' ? Math.sin(ph * TAU) : 0;
  g.save(); if (pose === 'walk') g.translate(0, -Math.abs(Math.cos(ph * TAU)) * 8);
  if (pose === 'bow') { g.translate(0, 470); g.rotate(.32); g.translate(0, -470); }
  // mantle behind
  if (M) cel(g, [[-150, 190], [-196, bottom - 20, 1], [196, bottom - 20, 1], [150, 190]], { f: M.f, s: M.s, so: [-20, -10], h: M.h, l: M.l, lw: LW * 1.1 });
  if (H.veil) veil(g, fab(H.veil, light), false);
  if (H.hood) hood(g, fab(H.hood, light), false);
  // feet
  for (const s of [-1, 1]) { const F = new Path2D(); F.ellipse(s * 50 + (seated ? 0 : s * sw * 30) + 12, bottom + 8, 42, 18, 0, 0, TAU); cel(g, F, { f: '#3a2a22', s: '#22160f', l: '#120a06', lw: LW }); }
  // robe: one long garment from the shoulders to the feet (a lap for seated figures)
  const robe = seated ? [[-128, 330], [-176, 560], [-186, bottom, 1], [186, bottom, 1], [176, 560], [124, 330]] : [[-128, 330], [-150 - sw * 10, bottom, 1], [150 + sw * 10, bottom, 1], [124, 330]];
  cel(g, robe, { f: R.f, s: R.s, so: [-22, -8], h: R.h, l: R.l, lw: LW * 1.1 });
  if (o.trim) cel(g, poly(seated ? [[-186, bottom - 26], [186, bottom - 26], [186, bottom], [-186, bottom]] : [[-150, bottom - 30], [150, bottom - 30], [150, bottom], [-150, bottom]]), { f: fab(o.trim, light).f, l: R.l, lw: LW });
  if (o.belt) cel(g, poly([[-128, 480], [128, 480], [126, 506], [-126, 506]]), { f: fab(o.belt, light).f, s: fab(o.belt, light).s, l: R.l, lw: LW });
  // shoulders: the bust of the head draws the garment top in the jacket colours
  const PP = { ...P, jacket: R, shirt: o.collar ? fab(o.collar, light) : R };
  const L0 = [-118, 196], R0 = [112, 196];
  let aL = [1.75, 1.62], aR = [1.42, 1.5];
  if (pose === 'cheer') aR = [-.7, -1.5 + Math.sin(ph * TAU) * .3];
  if (pose === 'present') { aL = [.9, .1]; aR = [.7, -.1]; }
  if (pose === 'hold') { aL = [1.7, -.2]; aR = [1.45, 3.2]; }
  if (pose === 'walk') { aL = [Math.PI / 2 + sw * .3, Math.PI / 2 + sw * .4]; aR = [Math.PI / 2 - sw * .3, Math.PI / 2 - sw * .3]; }
  if (seated) { aL = [1.9, .1]; aR = [1.2, 1.2]; }
  if (o.female) BOY.on = false;
  head80(g, PP, { view: o.view || 'q', expr: o.expr || 'neutral', ponytail: false, headset: false, blush: o.female ? .14 : .05, look: o.look, mouth: o.mouth,
    wind: .1, ph, beard: H.beard, mustache: H.mustache, beardCol: H.hairCol ? fab(H.hairCol, light) : null, eyeK: o.female ? 1 : .88 });
  BOY.on = true;
  if (H.crown) crown(g, P, H.crown === 'small' ? 58 : 72);
  if (H.turban) turban(g, fab(H.turban, light), H.big || 1);
  if (H.hat) hat(g, fab(H.hat, light));
  if (H.hood) hood(g, fab(H.hood, light), true);
  if (H.veil) { veil(g, fab(H.veil, light), true); if (H.crown2) crown(g, P, 56, -104); }
  if (M && o.ermine) for (const s of [-1, 1]) {                       // ermine lapels on the mantle
    cel(g, poly([[s * 70, 170], [s * 130, 190], [s * 120, bottom - 30], [s * 92, bottom - 30]]), { f: '#f4f2ea', s: '#c8c4b8', l: '#5a5650', lw: LW });
    for (let k = 0; k < 9; k++) { const y = 240 + k * (bottom - 300) / 9; g.fillStyle = '#1a1614'; g.beginPath(); g.ellipse(s * 106, y, 4, 7, 0, 0, TAU); g.fill(); }
  }
  sleeveArm(g, P, R, L0, aL[0], aL[1], o); sleeveArm(g, P, R, R0, aR[0], aR[1], o);
  g.restore();
}
