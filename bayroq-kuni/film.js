// film.js · "Bayroq kuni" (Silkscreen Travel Poster, used as an event poster). 1080×1920, 24 fps, 60 s.
// One portrait poster printed on camera, one ink per pull; the proof cards at the foot of the frame (screen space) carry the words.
// 100 BPM, 4/4: beat 0.6 s, bar 2.4 s. Every clack, pull, card and stamp sits on the beat grid below.
import { makeTextures, paperSheet, ink, wipeRegion, wipeFront, squeegee, screenFrame, inkFinish, texFill, clamp, lerp, hash, mulberry, unionPath, rectPath } from './engine/silk.js';
import { SW, SH, BAND, INK, STARS, flagParts, flagPt, moonStars, land, skyline, POLE, HEADER, BANDTXT } from './engine/poster.js';
import { BINK, BOY_ORDER, BOY_BAND, boyParts, boyCuff, ARTR } from './engine/boy.js';

export const BPM = 100, B = .6, BAR = 2.4;
// The flag film runs on its own clock ft = t − INTRO; the intro (Asadbek's portrait printed and waking up) comes first.
export const INTRO = 12.0, FT_END = 64.8, DUR = INTRO + FT_END;
const W = 1080, H = 1920;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const DEG = Math.PI / 180;

// ---------------- timeline ----------------
const PULL = {
  sky:   { down: -1,   t0: .05,  t1: 2.35, lift: 3.0 },
  blue:  { down: 4.8,  t0: 5.4,  t1: 6.6,  lift: 6.9 },
  green: { down: 12.0, t0: 12.6, t1: 13.8, lift: 14.1 },
  red:   { down: 24.0, t0: 24.3, t1: 25.2, lift: 25.5 },
  navy:  { down: 46.8, t0: 47.4, t1: 48.6, lift: 48.75 },
};
const ORDER = ['sky', 'blue', 'green', 'red', 'navy'];
const COUNT0 = 36.6, TICK = .15;                       // twelve stars stamped on sixteenths
const CARDS = [
  { id: 'c0', slide: -7.2, word: 'ASSALOMU ALAYKUM!', mean: 'Mavzu: Davlat bayrog‘i kuni', sw: 'flag', tw: -6.6, tm: -6.3, fin: true },
  { id: 'c1', slide: 7.2,  word: 'MOVIY',    mean: 'mangu osmon va obihayot ramzi',             sw: 'blue',  tw: 7.8,  tm: 8.1 },
  { id: 'c2', slide: 14.4, word: 'YASHIL',   mean: 'yangilanayotgan tabiat ramzi',              sw: 'green', tw: 15.0, tm: 15.3 },
  { id: 'c3', slide: 19.8, word: 'OQ',       mean: 'tinchlik va poklik ramzi',                  sw: 'paper', tw: 20.4, tm: 20.7 },
  { id: 'c4', slide: 25.8, word: 'QIZIL',    mean: 'hayotiy kuch irmoqlari',                    sw: 'red',   tw: 26.1, tm: 26.4 },
  { id: 'c5', slide: 29.4, word: 'YARIM OY', mean: 'yangi tug‘ilgan mustaqil respublika ramzi', sw: 'moon',  tw: 30.0, tm: 30.3 },
  { id: 'c6', slide: 36.0, word: '12 YULDUZ', mean: 'yilning o‘n ikki oyi',                     sw: 'stars', tw: 38.4, tm: 38.7, count: 1 },
];
const FINAL = { id: 'c7', slide: 58.8, word: 'BAYRAMINGIZ MUBORAK!', mean: '18-noyabr — Davlat bayrog‘i kuni', sw: 'flag', tw: 59.4, tm: 59.7, fin: true };
const LOOSE = { t0: 43.2, full: 44.4, snap: 45.6 };
const STACK_OUT = 46.8;
const BAND_T = [48.9, 49.2, 49.5];
const WAVE0 = 54.6, PULLBACK = [54.0, 57.6];
const WIND = 53.4;
const REG = { sky: [0, 0], blue: [1.6, -1.1], green: [-1.3, 1.5], red: [2.1, .7], navy: [-.9, -1.3] };
const LOOSE_V = { blue: [-16, -26], green: [20, 30], red: [-30, 12] };
const SEEDS = { sky: 3, blue: 5, green: 8, red: 11, navy: 13 };
const BOX = [-20, -20, 1040, 1540], SCREEN = [-72, -72, 1144, 1644];

export const SHOTS = [
  { n: 1, t0: 0, t1: 4.8 }, { n: 2, t0: 4.8, t1: 12.0 }, { n: 3, t0: 12.0, t1: 19.2 }, { n: 4, t0: 19.2, t1: 24.0 },
  { n: 5, t0: 24.0, t1: 28.8 }, { n: 6, t0: 28.8, t1: 36.0 }, { n: 7, t0: 36.0, t1: 43.2 }, { n: 8, t0: 43.2, t1: 46.8 },
  { n: 9, t0: 46.8, t1: 54.0 }, { n: 10, t0: 54.0, t1: 60 },
];

// ---------------- state ----------------
let ctx, T, LAND, SKYLINE, SKY, TABLE, HERO0;
export function setup(canvas) {
  ctx = canvas.getContext('2d');
  T = makeTextures(INK.paper, 7);
  LAND = land(3); SKYLINE = skyline();
  SKY = unionPath([rectPath(36, 36, 928, 486), bandSteps2(36, 928, 522, 790, 7)]);
  TABLE = makeTable();
  HERO0 = flagParts(.6, 9);
  return { dur: DUR, ev: events() };
}
function bandSteps2(x, w, y0, y1, n) {           // sky ink thinning into paper toward the horizon (stepped, never a gradient)
  const p = new Path2D(), H = y1 - y0;
  for (let i = 0; i < n; i++) {
    const cell = H / n, th = cell * (1 - (i + .5) / n) * .92 + 1.5, top = y0 + cell * i;
    p.rect(x, top, w, th);
  }
  return p;
}
function makeTable() {
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = mulberry(41);
  const cols = ['#8F806C', '#988873', '#8A7B67', '#93846F'];
  for (let k = 0; k < 4; k++) {
    const y = k * 256; g.fillStyle = cols[k]; g.fillRect(0, y, N, 256);
    for (let i = 0; i < 46; i++) {                                   // grain
      const yy = y + 6 + r() * 244, a = .05 + r() * .09; g.strokeStyle = `rgba(60,42,25,${a})`; g.lineWidth = .6 + r() * 1.4;
      g.beginPath(); for (let x = 0; x <= N; x += 16) { const v = yy + Math.sin(x / 140 + i) * 3 + Math.sin(x / 37 + i * 2) * 1.2; x ? g.lineTo(x, v) : g.moveTo(x, v); } g.stroke();
    }
    g.fillStyle = 'rgba(40,28,18,.55)'; g.fillRect(0, y, N, 3);       // seam
    g.fillStyle = 'rgba(255,240,220,.08)'; g.fillRect(0, y + 3, N, 2);
  }
  for (let i = 0; i < 9; i++) {                                      // muted stains and old ink spots
    const x = r() * N, y = r() * N, rr = 20 + r() * 60; g.fillStyle = `rgba(${40 + r() * 30},${45 + r() * 30},${55 + r() * 30},${.05 + r() * .06})`;
    g.beginPath(); g.ellipse(x, y, rr, rr * (.5 + r() * .5), r() * 3, 0, 7); g.fill();
  }
  return c;
}

// ---------------- events (sound + checks) ----------------
function events() {
  const ev = [], E = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  // intro (flag clock is negative here): Asadbek's portrait is printed, wakes up and says hello
  E(-INTRO, 'clack', { k: 'boy', first: 1 });
  for (const [k, P] of Object.entries(BPULL)) E(P[0] - INTRO, 'pull', { k: 'boy_' + k, dur: +(P[1] - P[0]).toFixed(3) });
  E(BLIFT - INTRO, 'lift', { k: 'boy' });
  BOY_T.forEach((t, i) => E(t - INTRO, 'stamp', { i }));
  E(TABLE_MOVE[0] - INTRO, 'pullback', { dur: TABLE_MOVE[1] - TABLE_MOVE[0] });
  for (const k of ORDER) {
    const P = PULL[k];
    if (P.down >= 0) E(P.down, 'clack', { k });
    E(P.t0, 'pull', { k, dur: +(P.t1 - P.t0).toFixed(3) });
    E(P.lift, 'lift', { k });
  }
  for (const c of [...CARDS, FINAL]) {
    E(c.slide, 'card', { id: c.id });
    if (!c.count) E(c.tw, 'print', { id: c.id, part: 'word' });
    else E(c.tw, 'print', { id: c.id, part: 'word2' });
    E(c.tm, 'print', { id: c.id, part: 'mean' });
  }
  for (let i = 0; i < 12; i++) E(COUNT0 + i * TICK, 'tick', { n: i + 1 });
  E(19.2, 'hush', { t1: 19.8 });                                       // near-silence #1 (before the white)
  E(LOOSE.t0, 'drift', { dur: LOOSE.full - LOOSE.t0 });
  E(LOOSE.full, 'silence', { t1: LOOSE.snap });                         // near-silence #2
  E(LOOSE.snap, 'snap');
  E(STACK_OUT, 'stack_out');
  BAND_T.forEach((t, i) => E(t, 'stamp', { i }));
  E(WIND, 'wind'); E(PULLBACK[0], 'pullback', { dur: PULLBACK[1] - PULLBACK[0] }); E(WAVE0, 'wave');
  ev.sort((a, b) => a.t - b.t);
  return ev.map(e => ({ ...e, t: +(e.t + INTRO).toFixed(3), ...(e.t1 != null ? { t1: +(e.t1 + INTRO).toFixed(3) } : {}) }));
}

// ---------------- camera ----------------
const WIDE = { cx: 500, cy: 760, z: .95, roll: 0 };
const W2 = { cx: 500, cy: 750, z: 1.0, roll: 0 };
const KEYS = [
  [3.35, null], [4.8, WIDE], [11.6, { ...WIDE, z: .985 }],
  [12.3, { ...WIDE, z: .985 }], [14.0, { ...WIDE, z: 1.0 }], [19.1, { ...WIDE, z: 1.02 }],
  [20.1, { cx: 575, cy: 340, z: 2.15, roll: 0 }], [23.4, { cx: 575, cy: 342, z: 2.3, roll: 0 }],
  [24.25, { cx: 300, cy: 345, z: 2.6, roll: 4 }], [25.9, { cx: 800, cy: 332, z: 2.6, roll: 3 }], [28.6, { cx: 760, cy: 330, z: 2.4, roll: 1.2 }],
  [29.5, { cx: 292, cy: 214, z: 3.4, roll: 0 }], [35.7, { cx: 296, cy: 214, z: 3.6, roll: 0 }],
  [36.4, { cx: 318, cy: 212, z: 3.8, roll: -1 }], [38.6, { cx: 428, cy: 212, z: 3.8, roll: -1 }],
  [41.0, { cx: 470, cy: 330, z: 1.9, roll: 0 }], [43.2, { cx: 488, cy: 360, z: 1.7, roll: 0 }],
  [45.6, { cx: 500, cy: 640, z: 1.18, roll: 0 }],
  [46.6, W2], [48.4, W2], [49.6, { cx: 500, cy: 840, z: 1.08, roll: -1 }], [54.0, { cx: 500, cy: 862, z: 1.12, roll: -1.2 }],
  [PULLBACK[1], { cx: 500, cy: 820, z: .29, roll: 0 }], [58.1, { cx: 500, cy: 800, z: .295, roll: 0 }],
  [59.5, { cx: 500, cy: -1240, z: .95, roll: 0 }], [FT_END + .01, { cx: 500, cy: -1236, z: .985, roll: 0 }],
];
function shot1(t) {                                     // close, rolled, frame edge in view: truck with the squeegee
  const p = seg(t, PULL.sky.t0, PULL.sky.t1), yf = wipeFront(BOX, 'down', p, 40);
  return { cx: 870 - 70 * seg(t, 0, 2.4), cy: clamp(yf + 40, 150, 1330), z: 2.3, roll: 3 - 1.2 * seg(t, 0, 2.6) };
}
function lerpCam(a, b, u) {
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), roll: lerp(a.roll, b.roll, u) };
}
function camera(t) {
  let c;
  if (t < KEYS[0][0]) c = shot1(t);
  else {
    let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const [ta, A0] = KEYS[i], [tb, B0] = KEYS[i + 1], A = A0 || shot1(ta);
    c = lerpCam(A, B0, eio(seg(t, ta, tb)));
  }
  // the crane through loose layers is linear (a steady move), the snap jolts it once
  if (t >= LOOSE.snap && t < LOOSE.snap + .5) { const d = t - LOOSE.snap; c.cy += 9 * Math.exp(-d / .09) * Math.cos(d * 2 * Math.PI * 9); }
  // the screen-space centre: 780 while the proof cards sit at the foot, 960 when the bench is clear
  const out = eio(seg(t, STACK_OUT, STACK_OUT + .5)), back = eio(seg(t, FINAL.slide - .6, FINAL.slide));
  c.vy = lerp(lerp(780, 960, out), 780, back);
  return c;
}

// ---------------- the sheet ----------------
function flagNow(t) {
  if (t < WAVE0) return HERO0;
  const A = 9 + 13 * ss(seg(t, WAVE0, WAVE0 + 1.4)), ph = .6 + 4.8 * (t - WAVE0);
  return flagParts(ph, A);
}
function parts(k, F) {
  if (k === 'sky') return [{ path: SKY, cut: [F.outline, LAND.snow] }];
  if (k === 'blue') return [{ path: F.blue, cut: [F.knock] }, { path: LAND.mount, cut: [LAND.snow, F.outline] }];
  if (k === 'green') return [{ path: F.green }, { path: LAND.hills, cut: [LAND.river, LAND.ditches, F.outline] }];
  if (k === 'red') return F.red.map(path => ({ path }));
  return [...SKYLINE, POLE, { path: rectPath(BAND.x, BAND.y, BAND.w, BAND.h) }, { paint: headerPaint }];
}
function headerPaint(c, col) {
  c.font = HEADER.font; c.letterSpacing = HEADER.ls + 'px'; c.textAlign = HEADER.align; c.fillStyle = col;
  c.fillText(HEADER.text, HEADER.x, HEADER.y); c.letterSpacing = '0px'; c.textAlign = 'left';
}
const INV = cut => { const p = new Path2D(); p.rect(-1e4, -1e4, 2e4, 2e4); p.addPath(cut); return p; };
function drawLayer(k, F, prog, off, shadow = 0) {
  const clip = prog < 1 ? wipeRegion(BOX, 'down', prog, SEEDS[k], 40) : null;
  for (const pt of parts(k, F)) {
    ctx.save(); ctx.translate(off[0], off[1]);
    if (pt.cut) for (const cu of [].concat(pt.cut)) ctx.clip(INV(cu), 'evenodd');
    if (shadow > 0 && pt.path) { ctx.save(); ctx.translate(6 * shadow, 9 * shadow); ctx.globalAlpha = .2 * shadow; ctx.fillStyle = '#1a140c'; ctx.fill(pt.path); ctx.restore(); }
    ink(ctx, pt.paint ? { paint: pt.paint } : { path: pt.path }, { color: INK[k], clip, sheen: k === 'navy' ? .45 : .8, trap: k === 'sky' ? 0 : .8 });
    ctx.restore();
  }
}
function tape(x, y, a, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-48 + 3, -16 + 4, 96, 32);
  ctx.fillStyle = 'rgba(232,221,192,.93)';
  ctx.beginPath(); ctx.moveTo(-48, -16); for (let i = 0; i <= 6; i++) ctx.lineTo(-48 + (i % 2) * 3, -16 + i * 32 / 6);
  for (let i = 6; i >= 0; i--) ctx.lineTo(48 - (i % 2) * 3, -16 + i * 32 / 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-46, -14, 92, 5);
  ctx.restore();
}
function bandText(i, p, seed) {
  const b = BANDTXT[i];
  if (p <= 0) return;
  ctx.save();
  const clip = p < 1 ? wipeRegion([b.x - 10, b.y - b.h - 16, 900, b.h + 34], 'right', p, seed, 16) : null;
  ink(ctx, { paint: (c, col) => { c.font = b.font; c.letterSpacing = b.ls + 'px'; c.fillStyle = col; c.fillText(b.text, b.x, b.y); c.letterSpacing = '0px'; } },
    { color: INK.cream, clip, reg: [.8, .6] });
  ctx.restore();
}
// st: { prog:{k:0..1}, loose:0..1, F (flag paths), band:[p,p,p], seed }
function drawSheet(st) {
  ctx.fillStyle = 'rgba(25,18,10,.30)'; ctx.fillRect(9, 13, SW, SH);
  paperSheet(ctx, T, 0, 0, SW, SH);
  for (const k of ORDER) {
    const pr = st.prog[k]; if (!(pr > 0)) continue;
    const L = LOOSE_V[k] && st.loose > 0 ? st.loose : 0, v = LOOSE_V[k] || [0, 0];
    const off = [REG[k][0] + v[0] * L + (st.par || 0) * (k === 'blue' ? -6 : k === 'green' ? 8 : k === 'red' ? -11 : 0), REG[k][1] + v[1] * L];
    drawLayer(k, st.F, pr, off, L);
  }
  BANDTXT.forEach((_, i) => bandText(i, st.band[i], 31 + i));
  inkFinish(ctx, T, 0, 0, SW, SH);
  tape(4, 6, -.72, 1); tape(996, 8, .7, 1); tape(4, 1494, .7, 1); tape(996, 1492, -.72, 1);
}
function heroState(t) {
  const prog = {}; for (const k of ORDER) prog[k] = seg(t, PULL[k].t0, PULL[k].t1);
  const loose = t >= LOOSE.t0 && t < LOOSE.snap ? ss(seg(t, LOOSE.t0, LOOSE.full)) : 0;
  const par = t >= LOOSE.t0 && t < LOOSE.snap ? seg(t, LOOSE.t0, LOOSE.snap) * 1.4 : 0;
  return { prog, loose, par, F: flagNow(t), band: BAND_T.map(a => seg(t, a, a + .2)) };
}
function drawScreen(t, F) {
  let k = null, ang = 0;
  for (const kk of ORDER) {
    const P = PULL[kk], tin = P.down < 0 ? -1e9 : P.down - .32;
    if (t >= tin && t < P.lift + .42) {
      k = kk;
      if (P.down >= 0 && t < P.down) { const u = seg(t, P.down - .32, P.down); ang = (1 - u * u) * 88; }
      if (t >= P.lift) ang = eo(seg(t, P.lift, P.lift + .4)) * 88;
      break;
    }
  }
  if (!k) return;
  const P = PULL[k], ps = parts(k, F).filter(q => q.path), stencil = unionPath(ps.map(q => q.path));
  const ca = Math.cos(ang * DEG);
  screenFrame(ctx, SCREEN, {
    k: Math.max(.02, ca), sh: 6 + 34 * Math.sin(ang * DEG), lift: ang / 88, frame: 50, meshStep: 7,
    flood: c => { c.fillStyle = INK[k]; c.fill(stencil); },
  });
  if (ang < 1 && t >= (P.down < 0 ? -1e9 : P.down) && t < P.lift) {
    const p = seg(t, P.t0, P.t1), yf = wipeFront(BOX, 'down', p, 40);
    squeegee(ctx, [BOX[0] - 6, yf + 2], [BOX[0] + BOX[2] + 6, yf + 2], [0, 1], { color: INK[k], roll: yf / 24, handle: 1, scale: 1.5, bead: 30, seed: SEEDS[k] });
  }
}
const COPIES = (() => {
  const r = mulberry(77), out = [];
  for (const j of [-1, 0, 1]) for (const i of [-1, 0, 1]) {
    if (!i && (!j || j === -1)) continue;
    out.push({ x: i * 1150 + (r() - .5) * 60, y: j * 2000 + (r() - .5) * 60, rot: (r() - .5) * 3 * DEG, ph: r() * 6 });
  }
  return out;
})();
function drawCopies(t) {
  const A = 9 + 13 * ss(seg(t, WAVE0, WAVE0 + 1.4)), full = { sky: 1, blue: 1, green: 1, red: 1, navy: 1 };
  for (const c of COPIES) {
    ctx.save(); ctx.translate(c.x + 500, c.y + 750); ctx.rotate(c.rot); ctx.translate(-500, -750);
    drawSheet({ prog: full, loose: 0, F: flagParts(.6 + c.ph + 4.8 * Math.max(0, t - WAVE0), A), band: [1, 1, 1] });
    ctx.restore();
  }
}

// ---------------- proof cards (screen space) ----------------
const CW = 1000, CH = 300, CX = 40, CY = 1592;
const JIT = [[0, 0, .6], [0, 0, -.8], [6, -5, .9], [-4, -3, -.5], [8, -7, 1.1], [-6, -2, -1.0], [3, -8, .6], [0, 0, 0]];
function wrap(c, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const s = cur ? cur + ' ' + w : w; if (c.measureText(s).width > maxW && cur) { lines.push(cur); cur = w; } else cur = s; }
  if (cur) lines.push(cur); return lines;
}
function swatch(c, kind, x, y, s, t) {
  const n = c.count ? 0 : 0;
  if (kind === 'paper') {
    ctx.fillStyle = INK.navy;
    for (let i = 0; i < 4 * 9; i++) { const side = Math.floor(i / 9), k = i % 9, a = k * s / 9 + 4; const L = s / 9 - 10;
      if (side === 0) ctx.fillRect(x + a, y, L, 4); if (side === 1) ctx.fillRect(x + a, y + s - 4, L, 4);
      if (side === 2) ctx.fillRect(x, y + a, 4, L); if (side === 3) ctx.fillRect(x + s - 4, y + a, 4, L); }
    return;
  }
  if (kind === 'flag') {                                    // a small flag, printed in the same inks
    const w = s, h = s / 2, f = (a, b, col) => { ctx.fillStyle = col; ctx.fillRect(x, y + a * h / 250, w, (b - a) * h / 250); };
    f(0, 80.6, INK.blue); f(80, 85, INK.red); f(165, 170, INK.red); f(169.4, 250, INK.green);
    ctx.save(); ctx.translate(x, y); ctx.scale(w / 500, h / 250); ctx.translate(-176 / 1.52, -150 / 1.52); ctx.scale(1 / 1.52, 1 / 1.52);
    ctx.fillStyle = INK.paper; ctx.fill(moonStars(0, 0)); ctx.restore();
    return;
  }
  const col = kind === 'moon' || kind === 'stars' ? INK.blue : INK[kind];
  ctx.fillStyle = col; ctx.fillRect(x, y, s, s);
  if (kind === 'moon' || kind === 'stars') {
    // the canton, scaled into the swatch: crescent (moon card) or the stars stamped one by one (star card)
    ctx.save(); ctx.translate(x, y);
    const k = kind === 'moon' ? s / 70 : s / 120;
    ctx.scale(k / 1.52, k / 1.52);
    if (kind === 'moon') ctx.translate(-(176 + 35 * 1.52), -(150 + 5 * 1.52));
    else ctx.translate(-(176 + 76 * 1.52), -(150 - 20 * 1.52));
    ctx.fillStyle = INK.paper;
    if (kind === 'moon') ctx.fill(moonStars(0, 0, 'moon'));
    else {
      const n = clamp(Math.floor((t - COUNT0) / TICK) + 1, 0, 12);
      const p = new Path2D(); const all = moonStars(0, 0, 'stars');
      // stamp stars in reading order: draw only the first n (each star is its own sub-path; re-build per star)
      for (let i = 0; i < n; i++) { const [sx, sy] = STARS[i]; const q = new Path2D(); const [cx, cy] = flagPt(sx, sy, 0, 0); starPath(q, cx, cy, 6 * 1.52); p.addPath(q); }
      ctx.fill(p);
    }
    ctx.restore();
  }
}
function starPath(p, cx, cy, R) { const r = R * .381966; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R; k ? p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } p.closePath(); }
function printText(draw, box, p, seed) {        // a small pull across a line of type: ragged front + blade sliver
  if (p <= 0) return;
  ctx.save();
  if (p < 1) ctx.clip(wipeRegion(box, 'right', p, seed, 14));
  draw(); ctx.restore();
  if (p > 0 && p < 1) {
    const x = wipeFront(box, 'right', p, 14);
    squeegee(ctx, [x + 4, box[1] - 8], [x + 4, box[1] + box[3] + 8], [1, 0], { color: INK.navy, roll: x / 18, handle: .35, scale: .55, bead: 13, seed });
  }
}
function cardLayout(c) {
  const fin = !!c.fin, sx = 28, sy = fin ? 110 : 30, ss_ = fin ? 230 : 240;
  const tx = fin ? 292 : 300, wordFont = fin ? '900 96px BigShoulders' : '900 124px BigShoulders';
  return { fin, sx, sy, ss: ss_, tx, wordFont, meanFont: '600 44px Outfit' };
}
function cardTexts(c, t, X, Y, rot, out) {
  const L = cardLayout(c);
  ctx.save(); ctx.font = L.meanFont; const lines = wrap(ctx, c.mean, CW - L.tx - 30); ctx.restore();
  if (L.fin) {
    if (t >= c.tw + .3) out.push({ id: c.id + 'w', text: c.word, x0: X + L.tx, y0: Y + 48, x1: X + CW - 20, y1: Y + 220 });
    if (t >= c.tm + .22) out.push({ id: c.id + 'm', text: c.mean, x0: X + L.tx, y0: Y + 232, x1: X + CW - 20, y1: Y + 284 });
  } else {
    if (t >= c.tw + .22) out.push({ id: c.id + 'w', text: c.word, x0: X + L.tx, y0: Y + 26, x1: X + CW - 20, y1: Y + 146 });
    if (t >= c.tm + .22) out.push({ id: c.id + 'm', text: c.mean, x0: X + L.tx, y0: Y + 160, x1: X + CW - 20, y1: Y + 160 + 52 * lines.length });
  }
}
function drawCard(c, t, X, Y, rot) {
  const L = cardLayout(c);
  ctx.save(); ctx.translate(X + CW / 2, Y + CH / 2); ctx.rotate(rot); ctx.translate(-CW / 2, -CH / 2);
  ctx.fillStyle = 'rgba(20,14,8,.32)'; ctx.fillRect(7, 11, CW, CH);
  texFill(ctx, T.paper, 0, 0, CW, CH, .9);
  ctx.fillStyle = 'rgba(120,100,70,.10)'; ctx.fillRect(0, CH - 3, CW, 3);
  if (L.fin) {                                              // the final card: a strip of the flag's colours along its top edge
    swatch(c, 'flag', L.sx, L.sy, L.ss, t);
    ctx.fillStyle = INK.blue; ctx.fillRect(0, 0, CW, 11); ctx.fillStyle = INK.red; ctx.fillRect(0, 11, CW, 3); ctx.fillRect(0, 22, CW, 3); ctx.fillStyle = INK.green; ctx.fillRect(0, 25, CW, 11);
  } else swatch(c, c.sw, L.sx, L.sy, L.ss, t);
  ctx.fillStyle = INK.navy;
  // word
  if (c.count) {
    const n = clamp(Math.floor((t - COUNT0) / TICK) + 1, 0, 12);
    ctx.font = L.wordFont; ctx.letterSpacing = '4px';
    if (n > 0) { ctx.fillStyle = INK.navy; ctx.fillText(String(n), L.tx, 140); }
    const w12 = ctx.measureText('12 ').width;
    printText(() => { ctx.fillStyle = INK.navy; ctx.fillText('YULDUZ', L.tx + w12, 140); }, [L.tx + w12 - 6, 22, 520, 132], seg(t, c.tw, c.tw + .22), 51);
    ctx.letterSpacing = '0px';
  } else if (L.fin) {
    ctx.font = L.wordFont; ctx.letterSpacing = '4px';
    const sp = c.word.indexOf(' '), w1 = c.word.slice(0, sp), w2 = c.word.slice(sp + 1);
    printText(() => { ctx.fillStyle = INK.navy; ctx.fillText(w1, L.tx, 130); ctx.fillText(w2, L.tx, 214); }, [L.tx - 6, 48, 700, 182], seg(t, c.tw, c.tw + .3), 61);
    ctx.letterSpacing = '0px';
  } else {
    ctx.font = L.wordFont; ctx.letterSpacing = '4px';
    printText(() => { ctx.fillStyle = INK.navy; ctx.fillText(c.word, L.tx, 140); }, [L.tx - 6, 22, 660, 132], seg(t, c.tw, c.tw + .22), 41 + c.id.length);
    ctx.letterSpacing = '0px';
  }
  // meaning
  ctx.font = L.meanFont; const lines = wrap(ctx, c.mean, CW - L.tx - 30);
  const y0 = L.fin ? 272 : 204;
  printText(() => { ctx.fillStyle = INK.navy; ctx.font = L.meanFont; lines.forEach((ln, i) => ctx.fillText(ln, L.tx, y0 + i * 52)); },
    [L.tx - 6, y0 - 44, 680, 52 * lines.length + 14], seg(t, c.tm, c.tm + .22), 71);
  inkFinish(ctx, T, 0, 0, CW, CH, .9, .55);
  ctx.restore();
}
function cardPose(c, idx, t) {
  const u = eo(seg(t, c.slide, c.slide + .38)), j = JIT[idx];
  let X = CX + j[0] + (1 - u) * 1160, Y = CY + j[1];
  const rot = (j[2] + (1 - u) * 4) * DEG;
  if (c !== FINAL) Y += eio(seg(t, STACK_OUT, STACK_OUT + .45)) * 420;
  else Y += (1 - u) * 30;
  return [X, Y, rot];
}
function drawCards(t, out) {
  const list = t < STACK_OUT + .5 ? CARDS.filter(c => t >= c.slide) : [];
  list.forEach((c) => { const idx = CARDS.indexOf(c), [X, Y, r] = cardPose(c, idx, t); drawCard(c, t, X, Y, r); });
  if (t >= FINAL.slide) { const [X, Y, r] = cardPose(FINAL, 7, t); drawCard(FINAL, t, X, Y, r); }
}

// ---------------- Asadbek (absolute clock) ----------------
const BOY_Y = -2000;                                                   // his portrait lies on the bench above the flag poster
const BPULL = { sky: [.05, .8], skin: [1.0, 1.55], shade: [1.7, 2.15], black: [2.35, 3.0] };
const BLIFT = 3.2, BOY_T = [3.45, 3.75], WAKE = 3.6, TABLE_MOVE = [10.7, 12.0];
const TALK = [[4.3, 5.5], [5.9, 8.0], [8.3, 10.2], [INTRO + 59.0, INTRO + 60.9]];
const WAVES = [[4.1, 6.9], [INTRO + 58.5, INTRO + 64.2]];
function talk(t) {
  const on = TALK.some(([a, b]) => t >= a && t < b);
  if (!on) return 0;
  const v = clamp(.55 * Math.sin(t * 13) + .45 * Math.sin(t * 21.7 + 1.3));
  return v * (.4 + .6 * (.5 + .5 * Math.sin(t * 2.1)));
}
function boyState(t) {
  const prog = {}; for (const k of BOY_ORDER) prog[k] = seg(t, BPULL[k][0], BPULL[k][1]);
  let raise = 0; for (const [a, b] of WAVES) raise = Math.max(raise, ss(seg(t, a, a + .45)) * (1 - ss(seg(t, b - .5, b))));
  const awake = t >= WAKE, speaking = TALK.some(([a, b]) => t >= a - .2 && t < b + .2);
  return {
    prog, band: BOY_T.map(a => seg(t, a, a + .22)),
    st: { bob: speaking ? 2.5 * Math.sin(t * 2 * Math.PI / 1.15) : 0, blink: awake && ((t + .4) % 3.7) < .12, m: talk(t), raise, swing: t * 2 * Math.PI * 1.7 },
  };
}
function drawBoySheet(t) {
  const S = boyState(t);
  ctx.save(); ctx.translate(0, BOY_Y);
  ctx.fillStyle = 'rgba(25,18,10,.30)'; ctx.fillRect(9, 13, SW, SH);
  paperSheet(ctx, T, 0, 0, SW, SH);
  const REGB = { sky: [0, 0], skin: [1.4, -.8], shade: [-1.1, 1.2], black: [-.8, -1.2] };
  for (const k of BOY_ORDER) {
    const pr = S.prog[k]; if (!(pr > 0)) continue;
    const clip = pr < 1 ? wipeRegion(BOX, 'down', pr, 60 + BOY_ORDER.indexOf(k), 40) : null;
    for (const pt of boyParts(k, S.st)) {
      ctx.save(); ctx.translate(REGB[k][0], REGB[k][1]);
      if (pt.clip) ctx.clip(pt.clip);
      if (pt.cut) for (const cu of [].concat(pt.cut)) ctx.clip(INV(cu), 'evenodd');
      ink(ctx, { path: pt.path }, { color: BINK[k], clip, sheen: k === 'black' ? .45 : .8, trap: k === 'sky' ? 0 : .8 });
      ctx.restore();
    }
    if (k === 'black' && pr >= 1) { const cuff = boyCuff(S.st); if (cuff) { ctx.save(); ctx.clip(ARTR); ctx.clip(cuff); paperSheet(ctx, T, 0, 0, SW, SH); ctx.restore(); } }
  }
  BOY_BAND.forEach((b, i) => {
    const p = S.band[i]; if (p <= 0) return;
    const clip = p < 1 ? wipeRegion([b.x - 10, b.y - b.h - 16, 900, b.h + 34], 'right', p, 81 + i, 16) : null;
    ink(ctx, { paint: (c, col) => { c.font = b.font; c.letterSpacing = b.ls + 'px'; c.fillStyle = col; c.fillText(b.text, b.x, b.y); c.letterSpacing = '0px'; } }, { color: BINK.cream, clip, reg: [.8, .6] });
  });
  inkFinish(ctx, T, 0, 0, SW, SH);
  tape(4, 6, -.72, 1); tape(996, 8, .7, 1); tape(4, 1494, .7, 1); tape(996, 1492, -.72, 1);
  // the screen and squeegee while the portrait is printed
  if (t < BLIFT + .42) {
    const ang = t >= BLIFT ? eo(seg(t, BLIFT, BLIFT + .4)) * 88 : 0;
    let k = 'sky'; for (const kk of BOY_ORDER) if (t >= BPULL[kk][0] - .12) k = kk;
    const stencil = unionPath(boyParts(k, { raise: 0 }).map(q => q.path));
    screenFrame(ctx, SCREEN, { k: Math.max(.02, Math.cos(ang * DEG)), sh: 6 + 34 * Math.sin(ang * DEG), lift: ang / 88, frame: 50, meshStep: 7,
      flood: c => { c.fillStyle = BINK[k]; c.fill(stencil); } });
    if (ang < 1) {
      const p = seg(t, BPULL[k][0], BPULL[k][1]), yf = wipeFront(BOX, 'down', p, 40);
      squeegee(ctx, [BOX[0] - 6, yf + 2], [BOX[0] + BOX[2] + 6, yf + 2], [0, 1], { color: BINK[k], roll: yf / 24, handle: 1, scale: 1.5, bead: 30, seed: 3 + BOY_ORDER.indexOf(k) });
    }
  }
  ctx.restore();
}
const IKEYS = [[0, { cx: 512, cy: BOY_Y + 540, z: 1.9, roll: 2 }], [3.25, { cx: 506, cy: BOY_Y + 548, z: 2.05, roll: 1.5 }],
  [4.4, { cx: 500, cy: BOY_Y + 760, z: .95, roll: 0 }], [TABLE_MOVE[0], { cx: 500, cy: BOY_Y + 768, z: .985, roll: 0 }], [TABLE_MOVE[1], null]];
function introCam(t) {
  let i = 0; while (i < IKEYS.length - 2 && t >= IKEYS[i + 1][0]) i++;
  const [ta, A] = IKEYS[i], [tb, B0] = IKEYS[i + 1], Bc = B0 || shot1(0);
  const c = lerpCam(A, Bc, eio(seg(t, ta, tb))); c.vy = 780; return c;
}

// ---------------- render (absolute clock t; the flag film runs on ft = t − INTRO) ----------------
export function render(t) {
  const ft = t - INTRO;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cam = t < INTRO ? introCam(t) : camera(ft);
  ctx.save();
  ctx.translate(W / 2, cam.vy); ctx.rotate(cam.roll * DEG); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
  const R = Math.hypot(W, H) / cam.z + 50;
  texFill(ctx, TABLE, cam.cx - R, cam.cy - R, 2 * R, 2 * R, 1.6);
  if (ft >= PULLBACK[0]) drawCopies(ft);
  if (cam.cy - (cam.vy + 400) / cam.z < BOY_Y + SH + 20) drawBoySheet(t);
  if (cam.cy + (H - cam.vy + 400) / cam.z > -20) {
    const st = heroState(ft);
    drawSheet(st);
    drawScreen(ft, st.F);
  }
  ctx.restore();
  drawCards(ft);
}

// ---------------- texts (for readcheck) ----------------
export function texts(tAbs) {
  const t = tAbs - INTRO, out = [];
  if (t < STACK_OUT) for (const c of CARDS) {
    if (t < c.slide + .38) continue;
    const later = CARDS.find(d => d.slide > c.slide && t >= d.slide + .3); if (later) continue;   // covered by the next card
    const [X, Y] = cardPose(c, CARDS.indexOf(c), t); cardTexts(c, t, X, Y, 0, out);
  }
  if (t >= FINAL.slide + .38) { const [X, Y] = cardPose(FINAL, 7, t); cardTexts(FINAL, t, X, Y, 0, out); }
  // the info band (world space)
  const cam = tAbs < INTRO ? introCam(tAbs) : camera(t), toS = (x, y) => {
    const dx = (x - cam.cx) * cam.z, dy = (y - cam.cy) * cam.z, r = cam.roll * DEG;
    return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), cam.vy + dx * Math.sin(r) + dy * Math.cos(r)];
  };
  BANDTXT.forEach((b, i) => {
    if (t < BAND_T[i] + .2 || t >= PULLBACK[0]) return;
    ctx.save(); ctx.font = b.font; ctx.letterSpacing = b.ls + 'px'; const w = ctx.measureText(b.text).width; ctx.restore();
    const a = toS(b.x, b.y - b.h), c = toS(b.x + w, b.y + 4);
    out.push({ id: b.id, text: b.text, x0: Math.min(a[0], c[0]), y0: Math.min(a[1], c[1]), x1: Math.max(a[0], c[0]), y1: Math.max(a[1], c[1]) });
  });
  if (t >= PULL.navy.t1 && t < PULLBACK[0]) out.push({ id: 'hdr', text: HEADER.text, x0: 0, y0: 0, x1: 1, y1: 1, pass: true });
  BOY_BAND.forEach((b, i) => {                                            // Asadbek's name band
    if (tAbs < BOY_T[i] + .22 || tAbs >= TABLE_MOVE[0]) return;
    ctx.save(); ctx.font = b.font; ctx.letterSpacing = b.ls + 'px'; const w = ctx.measureText(b.text).width; ctx.restore();
    const a = toS(b.x, BOY_Y + b.y - b.h), c = toS(b.x + w, BOY_Y + b.y + 4);
    out.push({ id: b.id, text: b.text, x0: Math.min(a[0], c[0]), y0: Math.min(a[1], c[1]), x1: Math.max(a[0], c[0]), y1: Math.max(a[1], c[1]) });
  });
  return out;
}
