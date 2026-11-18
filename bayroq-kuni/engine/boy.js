// boy.js · Asadbek as a screen print: a portrait poster (1000 × 1500) in four inks + paper.
// White shirt = bare paper (the same idea as the flag's white), suit and hair = one black ink, skin + one shade ink, sky.
// The print "wakes up": eyes blink, the mouth talks, the right arm rises and waves. All a pure function of the state passed in.
import { polyPath, rectPath, circlePath, ringPath } from './silk.js';

export const BINK = { sky: '#C2E2EA', skin: '#E2AE86', shade: '#BE8262', black: '#1D1F25', cream: '#F3EDDD' };
export const BOY_ORDER = ['sky', 'skin', 'shade', 'black'];
export const BOY_BAND = [
  { id: 'n1', text: 'ASADBEK', font: '900 170px BigShoulders', ls: 6, x: 74, y: 1336, h: 126 },
  { id: 'n2', text: '54-MAKTAB · 8-E SINF', font: '800 58px BigShoulders', ls: 9, x: 78, y: 1420, h: 44 },
];

const face = (() => {
  const p = new Path2D();
  p.moveTo(382, 505); p.bezierCurveTo(382, 622, 440, 694, 500, 696); p.bezierCurveTo(560, 694, 618, 622, 618, 505);
  p.bezierCurveTo(618, 404, 562, 378, 500, 378); p.bezierCurveTo(438, 378, 382, 404, 382, 505); p.closePath();
  return p;
})();
const ears = (() => { const p = new Path2D(); p.ellipse(382, 535, 22, 36, 0, 0, Math.PI * 2); p.closePath(); p.moveTo(640, 535); p.ellipse(618, 535, 22, 36, 0, 0, Math.PI * 2); p.closePath(); return p; })();
const neck = rectPath(462, 640, 76, 122);
const hair = (() => {
  const p = new Path2D();
  p.moveTo(372, 528); p.bezierCurveTo(360, 380, 430, 326, 505, 328); p.bezierCurveTo(590, 330, 646, 382, 628, 528);
  for (const [x, y] of [[614, 470], [596, 438], [572, 462], [546, 428], [518, 456], [492, 426], [464, 452], [438, 428], [414, 458], [394, 446], [390, 500]]) p.lineTo(x, y);
  p.closePath(); return p;
})();
const suit = polyPath([[96, 1160], [114, 930], [168, 846], [300, 780], [432, 750], [568, 750], [700, 780], [832, 846], [886, 930], [904, 1160]]);
const shirtV = polyPath([[434, 748], [566, 748], [536, 900], [500, 976], [464, 900]]);
function strip(pts, w) {                       // a thin band along a polyline, as separate quads (cut one by one)
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L * w / 2, ny = (bx - ax) / L * w / 2;
    out.push(polyPath([[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]]));
  }
  return out;
}
const LAPEL = [...strip([[434, 752], [452, 842], [414, 866], [486, 996]], 5), ...strip([[566, 752], [548, 842], [586, 866], [514, 996]], 5)];
const BUTTONS = [circlePath(512, 1040, 7), circlePath(512, 1102, 7)];
const DISK = circlePath(500, 560, 318);
const RINGS = [ringPath(500, 560, 262, 274), ringPath(500, 560, 212, 220)];
export const ARTR = rectPath(36, 36, 928, 1114);

// face details (black ink), offset by the head bob
function brows(p, dy) {
  p.addPath(polyPath([[418, 474 + dy], [444, 465 + dy], [472, 471 + dy], [472, 480 + dy], [444, 474 + dy], [420, 483 + dy]]));   // friendly, level brows
  p.addPath(polyPath([[528, 471 + dy], [556, 465 + dy], [582, 474 + dy], [580, 483 + dy], [556, 474 + dy], [528, 480 + dy]]));
}
function eyes(p, dy, blink) {
  if (blink) { p.rect(430, 514 + dy, 33, 6); p.rect(537, 514 + dy, 33, 6); return; }
  for (const x of [446, 554]) { p.moveTo(x + 15, 518 + dy); p.ellipse(x, 518 + dy, 15, 18, 0, 0, Math.PI * 2); p.closePath(); }
}
function eyeGlints(dy) { const p = new Path2D(); for (const x of [451, 559]) { p.moveTo(x + 5, 511 + dy); p.arc(x, 511 + dy, 5, 0, Math.PI * 2); p.closePath(); } return p; }
function mouth(p, dy, m) {
  if (m < .08) {                                // closed: a small smile
    p.moveTo(468, 628 + dy); p.quadraticCurveTo(500, 646 + dy, 532, 628 + dy); p.lineTo(532, 634 + dy); p.quadraticCurveTo(500, 654 + dy, 468, 634 + dy); p.closePath();
  } else { const h = 7 + 18 * m; p.moveTo(522, 634 + dy); p.ellipse(500, 634 + dy, 22, h, 0, 0, Math.PI * 2); p.closePath(); }
}
function teeth(dy, m) { if (m < .08) return null; const h = 7 + 18 * m; return rectPath(486, 634 + dy - h + 2, 28, Math.min(7, h * .45)); }

// the waving arm (the boy's right, on the viewer's left): raise 0..1, swing phase
function arm(raise, swing) {
  const S = [236, 876], Er = [210, 1240], Ew = [200, 1006];
  const E = [Er[0] + (Ew[0] - Er[0]) * raise, Er[1] + (Ew[1] - Er[1]) * raise];
  const a = (-93 + (1 - raise) * 170 + 17 * Math.sin(swing)) * Math.PI / 180;   // forearm angle: hanging → up and rocking
  const Wr = [E[0] + 226 * Math.cos(a), E[1] + 226 * Math.sin(a)], u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  const quad = (A, B, wa, wb) => { const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L;
    return polyPath([[A[0] + nx * wa, A[1] + ny * wa], [B[0] + nx * wb, B[1] + ny * wb], [B[0] - nx * wb, B[1] - ny * wb], [A[0] - nx * wa, A[1] - ny * wa]]); };
  const sleeve = new Path2D(); sleeve.addPath(quad(S, E, 38, 33)); sleeve.addPath(quad(E, Wr, 33, 28));
  sleeve.moveTo(E[0] + 33, E[1]); sleeve.arc(E[0], E[1], 33, 0, Math.PI * 2); sleeve.closePath();
  const K = 1.4, at = (a_, b_) => [Wr[0] + u[0] * a_ * K + n[0] * b_ * K, Wr[1] + u[1] * a_ * K + n[1] * b_ * K];
  const cuff = quad(at(-3, 0), at(12, 0), 30, 30);
  const hand = new Path2D();
  hand.addPath(polyPath([at(14, -24), at(14, 24), at(62, 26), at(70, 0), at(62, -26)]));
  [[-19, -.22, 46], [-6, -.07, 52], [7, .07, 50], [19, .2, 40]].forEach(([o, an, L]) => {      // four fingers, spread
    const c = Math.cos(an), s = Math.sin(an), d = [u[0] * c - u[1] * s, u[1] * c + u[0] * s], b = at(56, o), tip = [b[0] + d[0] * L * K, b[1] + d[1] * L * K];
    hand.addPath(quad(b, tip, 9.5, 9)); hand.moveTo(tip[0] + 9, tip[1]); hand.arc(tip[0], tip[1], 9, 0, Math.PI * 2); hand.closePath();
  });
  const tb = at(26, 22), td = [u[0] * .5 + n[0] * .86, u[1] * .5 + n[1] * .86], tt = [tb[0] + td[0] * 48, tb[1] + td[1] * 48];
  hand.addPath(quad(tb, tt, 12, 10)); hand.moveTo(tt[0] + 10, tt[1]); hand.arc(tt[0], tt[1], 10, 0, Math.PI * 2); hand.closePath();
  return { sleeve, cuff, hand };
}

// parts per ink. st: { bob, blink, m (mouth 0..1), raise, swing }
export function boyParts(k, st) {
  const dy = st.bob || 0, hd = p => { const q = new Path2D(); q.addPath(p, new DOMMatrix([1, 0, 0, 1, 0, dy])); return q; };
  const A = st.raise > 0.001 ? arm(st.raise, st.swing || 0) : null;
  if (k === 'sky') return [{ path: rectPath(36, 36, 928, 1114), cut: [DISK, shirtV] }, ...RINGS.map(path => ({ path, cut: [shirtV] }))];
  if (k === 'skin') { const p = [{ path: neck }, { path: hd(ears) }, { path: hd(face) }]; if (A) p.push({ path: A.hand, clip: ARTR }); return p; }
  if (k === 'shade') {
    return [{ clip: hd(face), path: polyPath([[566, 370], [650, 370], [650, 710], [500, 710], [548, 650], [572, 566], [576, 470]].map(([x, y]) => [x, y + dy])) },
      { clip: neck, path: (() => { const q = new Path2D(); q.ellipse(500, 668 + dy, 64, 34, 0, 0, Math.PI * 2); return q; })() },
      { path: polyPath([[500, 540 + dy], [513, 592 + dy], [492, 598 + dy]]) },
      { clip: hd(ears), path: (() => { const q = new Path2D(); q.ellipse(382, 538 + dy, 9, 20, 0, 0, Math.PI * 2); q.moveTo(627, 538 + dy); q.ellipse(618, 538 + dy, 9, 20, 0, 0, Math.PI * 2); return q; })() }];
  }
  if (k === 'black') {
    const f = new Path2D(); brows(f, dy); eyes(f, dy, st.blink); mouth(f, dy, st.m || 0);
    const p = [{ path: suit, cut: [shirtV, ...LAPEL, ...BUTTONS] }, { path: hd(hair) }, { path: f, cut: [eyeGlints(dy), ...(teeth(dy, st.m || 0) ? [teeth(dy, st.m)] : [])] },
      { path: rectPath(36, 1172, 928, 292) }];
    if (A) { p.push({ path: A.sleeve, clip: ARTR }); }
    return p;
  }
  return [];
}
export function boyCuff(st) { return st.raise > 0.001 ? arm(st.raise, st.swing || 0).cuff : null; }
