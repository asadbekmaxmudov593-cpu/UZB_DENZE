// Scenes. Each gets S = { t, lt (time in the scene), u (0..1), g, e, A }. Characters on twos (12 fps), lips and blinks on threes (8 fps).
// Returns optional CRT overrides (tape tracking noise at the jumps).
import { canvas, W, H, LWK, rgba, mix, vgrad, airbrush, rng, TAU, poly, path, hash, cel, line } from './cel.js';
import { PAL, cast, fab } from './pal.js';
import { head80 } from './head80.js';
import { figure } from './figure.js';
import { person } from './people.js';
import { carSide, cabinBack, cabinFront, book } from './car.js';
import { MAPXY, IBERIA } from './places.js';
import { flare, speedLines, lamp } from './fx.js';
import { speaking, linesOf, shot } from './story.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const q12 = t => Math.floor(t * 12) / 12, q8 = t => Math.floor(t * 8) / 8;
const [cc, cg] = canvas(W, H);
function celLayer(S, draw) {
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, W, H); cg.save(); draw(cg); cg.restore();
  S.g.drawImage(cc, 0, 0);
  S.e.save(); S.e.globalCompositeOperation = 'destination-out'; S.e.drawImage(cc, 0, 0); S.e.restore();
}
const blinkAt = (t, k = 0) => ((t + .9 + k) % 3.4) < .125;
const flap = (t, who) => { const L = speaking(t, who); if (!L) return null; return ['talk', 'oh', 'talk', 'set', 'talk', 'smileopen'][Math.floor((q8(t) - L.t) * 8) % 6]; };
const DAD = { mustache: true, eyeK: .66, E: { brow: [3, -2, 1], lid: .22 } };
const at12 = t => (Math.floor(t * 12) % 4) / 4;

// a character standing in the world: feet at (x, y), scale s, facing right (dir 1) or left (−1)
function stand(c, x, y, s, dir, fn) { c.save(); c.translate(x, y); c.scale(s * dir, s); c.translate(0, -1060); fn(c); c.restore(); }
function dadFig(c, Pd, o) { figure(c, Pd, { view: 'q', expr: 'smile', ...o, head: { ...DAD, ...(o.head || {}) } }); }
function sonFig(c, Ps, o) { figure(c, Ps, { view: 'q', expr: 'smile', ...o }); }

// ———————————— the road ————————————
function roadScene(S, R, mode) {
  const { g, e, t } = S;
  g.drawImage(R.far, 0, 0); e.drawImage(R.farE, 0, 0);
  const mx = -((t * 160) % 3840), nx = -((t * 1100) % 3840);
  g.drawImage(R.mid, mx, 560); g.drawImage(R.mid, mx + 3840, 560);
  g.drawImage(R.near, nx, 840); g.drawImage(R.near, nx + 3840, 840);
  const bob = Math.round(Math.sin(q12(t) * 17) * 2);
  carSide(g, e, 900, 1012 + bob, .82, t, mode);
}
export function road(S) { roadScene(S, S.A.road.day, 'day'); }
export function road2(S) {
  roadScene(S, S.A.road.sunset, 'sunset');
  const { g, e, t, lt } = S;
  if (S.t1 - S.t0 > 2.5 && lt > .2) {
    const k = Math.floor((lt - .2) * 12), flick = k < 1 ? 0 : k === 2 ? .3 : k === 4 ? .6 : 1;
    if (flick > 0) {
      g.save(); g.textAlign = 'center'; g.lineJoin = 'round'; g.font = 'italic 900 128px Kanit';
      const gr = g.createLinearGradient(0, 160, 0, 300); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(.46, '#ffd27a'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(.54, '#c0602a'); gr.addColorStop(1, '#ffcf6a');
      g.strokeStyle = '#2a0e08'; g.lineWidth = 16; g.strokeText('PIRENEY YARIMOROLI', W / 2, 290);
      g.strokeStyle = '#ff7a3a'; g.lineWidth = 6; g.strokeText('PIRENEY YARIMOROLI', W / 2, 290);
      g.fillStyle = gr; g.fillText('PIRENEY YARIMOROLI', W / 2, 290);
      g.font = '700 46px "Barlow SC"'; g.letterSpacing = '10px'; g.fillStyle = '#fff4e0'; g.strokeStyle = '#2a0e08'; g.lineWidth = 8;
      g.strokeText('8-MAVZU · ISPANIYA VA PORTUGALIYA', W / 2, 380); g.fillText('8-MAVZU · ISPANIYA VA PORTUGALIYA', W / 2, 380); g.letterSpacing = '0px';
      g.restore();
      e.save(); e.textAlign = 'center'; e.font = 'italic 900 128px Kanit'; e.strokeStyle = rgba('#ffb060', .6 * flick); e.lineWidth = 12; e.strokeText('PIRENEY YARIMOROLI', W / 2, 290); e.restore();
    }
  }
}
// ———————————— the cabin ————————————
function cabinScene(S, mode, far) {
  const { g, e, t, lt } = S, C = cast(mode), Ps = C.son, Pd = C.dad;
  cabinBack(g, far, t, mode);
  const bob = Math.round(Math.sin(q12(t) * 13) * 1.5);
  const sonM = flap(t, 'B'), dadM = flap(t, 'O');
  const dadLooks = !!speaking(t, 'O') || !!speaking(t - .6, 'B');
  celLayer(S, c => {
    // the son (left), turned toward his father, the book in his lap
    c.save(); c.translate(640, 520 + bob); c.scale(1.75, 1.75);
    head80(c, Ps, { view: 'q', expr: sonM ? 'smile' : (S.name === 'cabin2' ? 'smileopen' : 'neutral'), mouth: sonM || (S.name === 'cabin2' ? 'smile' : 'closed'), open: blinkAt(t) ? 0 : 1, look: [.5, .1], ponytail: false, headset: false, blush: .06, wind: .05, ph: at12(t) });
    c.restore();
    // the father (right), driving; he turns to his son when they talk
    c.save(); c.translate(1300, 500 + bob); c.scale(dadLooks ? -1.8 : 1.8, 1.8);
    head80(c, Pd, { view: dadLooks ? 'q' : 'front', expr: 'smile', mouth: dadM || 'smile', open: blinkAt(t, 1.3) ? 0 : .9, lid: .15, look: dadLooks ? [.4, .05] : [0, 0], ponytail: false, headset: false, blush: .03, wind: .05, ...DAD });
    c.restore();
  });
  if (S.name === 'cabin') {
    const glow = seg(t, S.t1 - 1.6, S.t1);
    book(g, e, 640, 860 + bob, 1.05, glow * .7);
  } else book(g, e, 640, 870 + bob, 1.05, 0);
  for (const hx of [470, 810]) { g.fillStyle = Ps.skin.f; g.beginPath(); g.ellipse(hx, 930 + bob, 34, 26, 0, 0, TAU); g.fill(); g.strokeStyle = Ps.skin.l; g.lineWidth = 2; g.stroke(); }
  cabinFront(g, e, t, mode, Math.sin(t * .7) * .04);
  for (const hx of [1130, 1530]) { g.fillStyle = Pd.skin.f; g.beginPath(); g.ellipse(hx, 960 + Math.sin(t * .7) * 8 * (hx > 1300 ? 1 : -1), 38, 30, 0, 0, TAU); g.fill(); g.strokeStyle = Pd.skin.l; g.lineWidth = 2; g.stroke(); }
}
export function cabin(S) { cabinScene(S, 'day', S.A.road.day.far); }
export function cabin2(S) { cabinScene(S, 'sunset', S.A.road.sunset.far); }
// ———————————— the jump into the book (and back) ————————————
export function jump(S) {
  const { g, e, t, lt, u } = S;
  vgrad(g, 0, 0, W, H, [[0, '#1a1430'], [1, '#3a2a40']]);
  speedLines(g, Math.floor(t * 12), { type: 'radial', cx: 960, cy: 560, col: '#ffe8a0', a: .5 + u * .4, n: 90 + Math.floor(u * 60), r0: 120 });
  const s = 2.2 + u * 2.6; book(g, e, 960, 460, s, .35 + u * .5);
  flare(e, 960, 560, .35 + u * .6, '#ffe8b0', { ghosts: false, streak: 1100 });
  if (u > .82) { g.fillStyle = rgba('#fff8e8', (u - .82) / .18); g.fillRect(0, 0, W, H); }
  return { track: u > .55 ? (u - .55) * 1.6 : 0 };
}
export function jump2(S) {
  const { g, e, t, u } = S;
  g.fillStyle = '#fff8e8'; g.fillRect(0, 0, W, H);
  speedLines(g, Math.floor(t * 12), { type: 'radial', cx: 960, cy: 540, col: '#ffb070', a: .8 * (1 - u), n: 140, r0: 60 });
  if (u > .5) { vgrad(g, 0, 0, W, H, [[0, rgba('#3a2440', (u - .5) * 2)], [1, rgba('#6a3a40', (u - .5) * 2)]]); }
  return { track: u < .4 ? .9 - u : 0 };
}
// ———————————— Granada ————————————
export function granada(S) {
  const { g, e, A, t, lt, u } = S, light = 'gold', C = cast(light);
  const pan = -440 * eio(u);
  g.drawImage(A.granada.c, pan, 0); e.drawImage(A.granada.e, pan, 0);
  const pointing = lt > .6, surprised = false;
  celLayer(S, c => {
    // townsfolk walking along the path (right → left), in front of the hill
    [[0, '#d8c8a0', '#f4f0e6', 0], [1, '#5a7aa0', '#e8e0c8', 1.7], [2, '#7a4a2a', '#2a8a5a', 3.1]].forEach(([k, robe, tur, off]) => {
      const x = 2000 - ((lt * 70 + k * 520) % 2300) + pan * .2;
      stand(c, x, 975 + k * 18, .3, -1, cc => person(cc, C.P, light, { robe, head: { turban: tur, beard: k !== 1, hairCol: '#2a2020' }, pose: 'walk', ph: at12(t + off), belt: '#c8a050' }));
    });
    stand(c, 300, 1050, .42, 1, cc => sonFig(cc, C.son, { pose: 'stand', expr: surprised ? 'surprised' : 'smileopen', look: [.4, -.4] }));
    stand(c, 470, 1050, .5, 1, cc => dadFig(cc, C.dad, { pose: pointing ? 'wave' : 'stand', ph: .25, look: [.4, -.3] }));
  });
  airbrush(e, 1700 + pan, 520, 500, 220, '#ffd070', .2);
}
// ———————————— the map ————————————
const KING = {
  Portugaliya: { col: '#2a8a6a', pts: [[-8.75, 42.1], [-8.2, 42.1], [-6.2, 41.6], [-6.9, 41.0], [-6.9, 40.0], [-7.0, 39.6], [-7.3, 39.4], [-7.0, 38.9], [-7.3, 38.4], [-7.0, 38.0], [-7.4, 37.2], [-7.95, 37.0], [-8.99, 37.02], [-8.87, 37.95], [-9.15, 38.7], [-9.5, 38.78], [-9.38, 39.36], [-8.9, 40.3], [-8.67, 41.15], [-8.83, 41.7]], label: [-8.2, 39.6] },
  Navarra: { col: '#7a4aa8', pts: [[-2.0, 43.3], [-1.8, 43.37], [-1.0, 43.0], [-.75, 42.85], [-1.0, 42.3], [-1.5, 42.0], [-2.1, 42.2], [-2.3, 42.6]], label: [-1.55, 42.65] },
  Aragon: { col: '#e8a830', pts: [[-.75, 42.85], [0, 42.7], [1.4, 42.55], [2.5, 42.4], [3.3, 42.3], [3.2, 41.9], [2.2, 41.4], [1.25, 41.1], [.85, 40.7], [-.05, 39.98], [-.35, 39.45], [.2, 38.75], [-.5, 38.35], [-1.1, 38.0], [-1.3, 38.6], [-1.2, 39.4], [-1.6, 40.2], [-1.9, 41.0], [-1.6, 41.6], [-1.5, 42.0], [-1.0, 42.3]], label: [.5, 41.3] },
  Granada: { col: '#2aa04a', pts: [[-5.35, 36.13], [-4.4, 36.7], [-3.4, 36.7], [-2.45, 36.83], [-2.2, 36.73], [-1.6, 37.3], [-2.2, 37.7], [-3.0, 37.6], [-3.9, 37.4], [-4.6, 37.2], [-5.2, 36.9]], label: [-3.4, 37.15] },
};
function mapScene(S, stage) {
  const { g, e, A, t, lt } = S;
  const z = 1 + lt * .005; for (const x of [g, e]) { x.translate(W / 2, H / 2); x.scale(z, z); x.translate(-W / 2, -H / 2); }
  g.drawImage(A.map.c, 0, 0);
  const land = poly(IBERIA.map(MAPXY)), ls = linesOf(S.name);
  const lab = (txt, ll, size = 34, col = '#2a1a0a', a = 1) => { if (a <= 0) return; const [x, y] = MAPXY(ll); g.save(); g.font = `700 ${size}px "Barlow SC"`; g.textAlign = 'center'; g.lineJoin = 'round'; g.globalAlpha = a; g.strokeStyle = 'rgba(255,248,230,.9)'; g.lineWidth = 7; g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y); g.restore(); };
  const fillK = (name, col, a = .78) => { g.save(); g.clip(land); g.globalAlpha = a; g.fillStyle = col; g.fill(poly(KING[name].pts.map(MAPXY))); g.restore(); };
  if (stage === 1) {
    // 711–714: the conquest sweeps up from the south; then the kingdoms appear
    const k1 = seg(t, ls[0].t, ls[0].t + 3.2), k2 = seg(t, ls[1].t, ls[1].t + 2.4);
    if (k1 > 0) { const [, yS] = MAPXY([0, 36]), [, yN] = MAPXY([0, 42.9]), front = yS - (yS - yN) * k1 * (1 - k2);
      g.save(); g.clip(land); g.fillStyle = rgba('#2aa04a', .7); g.fillRect(0, front, W, H); g.restore();
      lab('711–714 · Arab xalifaligi', [-4.2, 38.6], 38, '#0a3a1a', k1 * (1 - k2)); }
    if (k2 > 0) {
      g.save(); g.globalAlpha = k2; g.clip(land); g.fillStyle = rgba('#c8402a', .75); g.fill(land); g.restore();       // Castile: the rest
      for (const n of ['Portugaliya', 'Navarra', 'Aragon', 'Granada']) fillK(n, KING[n].col, .8 * k2);
      lab('Kastiliya', [-4.0, 40.6], 46, '#3a0a0a', k2);
      for (const n of ['Portugaliya', 'Navarra', 'Aragon', 'Granada']) lab(n, KING[n].label, 34, '#1a1008', k2);
    }
  } else {
    // 1469 union, then 1492 Granada and 1512 Navarra join Spain
    const k1 = seg(t, ls[0].t + .6, ls[0].t + 1.6), k2 = seg(t, ls[0].t + 3.0, ls[0].t + 4.0), SP = '#d8662a';
    g.save(); g.clip(land); g.fillStyle = rgba(SP, .78); g.fill(land); g.restore();
    fillK('Portugaliya', KING.Portugaliya.col, .8);
    fillK('Granada', mix(KING.Granada.col, SP, k1), .8); fillK('Navarra', mix(KING.Navarra.col, SP, k2), .8);
    lab('ISPANIYA', [-3.2, 40.4], 60, '#3a0a0a'); lab('1469', [-3.2, 39.7], 36, '#3a0a0a');
    lab('Portugaliya', KING.Portugaliya.label, 34, '#1a1008');
    lab(k1 > .5 ? 'Granada · 1492' : 'Granada', KING.Granada.label, 34, '#1a1008');
    lab(k2 > .5 ? 'Navarra · 1512' : 'Navarra', KING.Navarra.label, 34, '#1a1008');
    if (k1 > 0 && k1 < 1) { const [x, y] = MAPXY(KING.Granada.label); airbrush(e, x, y, 220, 120, '#ffe0a0', .5 * Math.sin(k1 * Math.PI)); }
    if (k2 > 0 && k2 < 1) { const [x, y] = MAPXY(KING.Navarra.label); airbrush(e, x, y, 200, 110, '#ffe0a0', .5 * Math.sin(k2 * Math.PI)); }
  }
  g.save(); g.font = 'italic 800 54px Kanit'; g.fillStyle = '#3a2410'; g.fillText('PIRENEY YARIMOROLI', 150, 150); g.restore();
}
export function map(S) { mapScene(S, 1); }
export function map2(S) { mapScene(S, 2); }
// ———————————— Castile: Alfonso X's court ————————————
function sphere(g, e, x, y, r, t) {
  g.fillStyle = '#6a4a2a'; g.fillRect(x - 8, y + r * .9, 16, 200); g.fillRect(x - 60, y + r * .9 + 196, 120, 20);
  g.strokeStyle = '#d8a83a'; g.lineCap = 'round';
  for (const [rot, rx, w] of [[0, 1, 9], [t * .5, .35, 7], [1.2, .9, 6], [-.4 + t * .2, .6, 6]]) { g.lineWidth = w; g.beginPath(); g.ellipse(x, y, r * Math.abs(Math.cos(rot)) * rx + 6, r, .35, 0, TAU); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.ellipse(x, y, r, r * .28, -.4, 0, TAU); g.stroke();
  g.fillStyle = '#4a7ad0'; g.beginPath(); g.arc(x, y, r * .22, 0, TAU); g.fill();
  airbrush(e, x - r * .4, y - r * .5, r * .6, r * .4, '#ffe0a0', .25);
}
export function castile(S) {
  const { g, e, A, t, lt, u } = S, light = 'hall', C = cast(light);
  const pan = -260 * eio(u);
  g.drawImage(A.hall.c, pan, 0); e.drawImage(A.hall.e, pan, 0);
  sphere(g, e, 1150 + pan, 560, 120, t);
  celLayer(S, c => {
    c.translate(pan, 0);
    cel(c, [[1700, 760, 1], [1690, 430], [1800, 380], [1910, 430], [1900, 760, 1]], { f: '#8a2a2a', s: '#5a1a1a', so: [-14, -6], h: '#c84a3a', l: '#2a0a0a', lw: 2 });   // throne back
    stand(c, 1800, 760, .5, -1, cc => person(cc, C.P, light, { pose: 'sit', robe: '#efe6d2', mantle: '#a8202a', ermine: true, head: { crown: true, beard: true, hairCol: '#5a3a2a' }, expr: 'neutral' }));
    [[860, '#6a4a2a', '#5a3a2a'], [1380, '#2a5a3a', null], [1520, '#2a3a6a', '#3a2a5a']].forEach(([x, robe, hoodC], k) =>
      stand(c, x, 1000, .4, k ? -1 : 1, cc => person(cc, C.P, light, { robe, pose: 'hold', head: { hood: hoodC, beard: true, hairCol: k === 1 ? '#c8c8c8' : '#3a2a20' }, belt: '#2a1a10' })));
    stand(c, 230, 1060, .52, 1, cc => sonFig(cc, C.son, { pose: 'stand', expr: 'smileopen', look: [.5, -.2] }));
    stand(c, 420, 1060, .58, 1, cc => dadFig(cc, C.dad, { pose: 'stand', look: [.5, -.2] }));
  });
  for (let k = 0; k < 3; k++) lamp(g, e, 400 + k * 640 + pan, 300, 10, '#ffcf80', .6);
}
// ———————————— Ferdinand and Isabella ————————————
export function ferdinand(S) {
  const { g, e, A, t, lt, u } = S, light = 'day', C = cast(light);
  const z = 1 + u * .06; for (const x of [g, e]) { x.translate(960, 600); x.scale(z, z); x.translate(-960, -600); }
  g.drawImage(A.square.c, 0, 0); e.drawImage(A.square.e, 0, 0);
  const pointing = lt < 2.4;
  celLayer(S, c => {
    c.translate(960, 600); c.scale(z, z); c.translate(-960, -600);
    stand(c, 880, 860, .52, 1, cc => person(cc, C.P, light, { robe: '#a8242a', mantle: '#c89a3a', ermine: true, belt: '#3a2a1a', head: { crown: true }, expr: 'smile', pose: 'stand' }));
    stand(c, 1060, 860, .5, -1, cc => person(cc, C.P, light, { robe: '#2a5a8a', mantle: '#6a2a4a', female: true, head: { veil: '#f4f0e8', crown2: true }, expr: 'smile', pose: 'stand', trim: '#d8b04a' }));
    // the crowd: heads and shoulders, some arms waving
    const R = rng(9);
    for (let k = 0; k < 26; k++) {
      const x = 40 + k * 74 + R() * 20, y = 1000 + R() * 40, col = ['#7a3a2a', '#3a5a7a', '#5a6a3a', '#7a6a4a', '#4a3a5a'][k % 5], hcol = ['#3a2a20', '#1a1414', '#6a4a2a'][k % 3];
      c.fillStyle = col; c.beginPath(); c.ellipse(x, y + 60, 46, 60, 0, 0, TAU); c.fill();
      c.fillStyle = C.P.skin.s; c.beginPath(); c.arc(x, y - 6, 24, 0, TAU); c.fill(); c.fillStyle = hcol; c.beginPath(); c.arc(x, y - 14, 24, Math.PI * 1.05, Math.PI * 1.95); c.fill();
      if (k % 3 === 0) { const a = -1.9 + Math.sin(q12(t) * 9 + k) * .3; line(c, [[x + 20, y + 20], [x + 20 + Math.cos(a) * 70, y + 20 + Math.sin(a) * 70]], col, 14); }
    }
    stand(c, 1660, 1070, .48, -1, cc => sonFig(cc, C.son, { pose: pointing ? 'wave' : 'stand', ph: at12(t), expr: 'smileopen', look: [.3, -.3] }));
    stand(c, 1830, 1070, .54, -1, cc => dadFig(cc, C.dad, { pose: 'stand', look: [.3, -.3] }));
  });
}
// ———————————— Lisbon: the caravels leave ————————————
function caravel(g, x, y, s, t, seed) {
  g.save(); g.translate(x, y + Math.sin(t * 1.4 + seed) * 4); g.rotate(Math.sin(t * 1.1 + seed) * .02); g.scale(s, s);
  cel(g, [[-220, -40, 1], [220, -60, 1], [180, 40], [-170, 40]], { f: '#7a4a2a', s: '#4a2a18', sh: [[[-220, 0], [220, -10], [180, 40], [-170, 40]]], h: '#a87048', l: '#2a160a', lw: 2.4 });
  g.fillStyle = '#5a3418'; g.fillRect(-200, -70, 70, 32); g.fillRect(140, -90, 70, 34);
  for (const [mx, h] of [[-90, 330], [40, 380], [150, 250]]) { g.fillStyle = '#4a2a14'; g.fillRect(mx - 5, -40 - h, 10, h); }
  for (const [mx, h, w] of [[-90, 300, 120], [40, 340, 150]]) {
    const top = -40 - h + 20, sw = Math.sin(t * 2 + seed + mx) * 6;
    cel(g, [[mx - w / 2, top, 1], [mx + w / 2, top, 1], [mx + w / 2 + sw, top + h * .6, 1], [mx - w / 2 + sw, top + h * .6, 1]], { f: '#f4ecd8', s: '#c8bca0', sh: [[[mx, top], [mx + w / 2, top], [mx + w / 2 + sw, top + h * .6], [mx + sw, top + h * .6]]], l: '#5a4a3a', lw: 2 });
    g.fillStyle = '#c81a2a'; g.fillRect(mx - 9 + sw * .5, top + 30, 18, h * .45); g.fillRect(mx - w * .3 + sw * .5, top + h * .22, w * .6, 18);
  }
  cel(g, [[150, -260], [260, -60, 1], [150, -60, 1]], { f: '#efe6d0', s: '#c8bca0', so: [-6, 0], l: '#5a4a3a', lw: 2 });
  g.restore();
}
export function lisbon(S) {
  const { g, e, A, t, lt, u } = S, light = 'day', C = cast(light);
  const pan = -300 * eio(u);
  g.drawImage(A.harbor.c, pan, 0); e.drawImage(A.harbor.e, pan, 0);
  caravel(g, 1650 + pan * .9 + lt * 14, 640, .45, t, 3);
  caravel(g, 1100 + pan + lt * 26, 720, .8, t, 1);
  for (let k = 0; k < 5; k++) { const x = ((lt * (60 + k * 8) + k * 400) % 2200) - 100, y = 220 + k * 40 + Math.sin(t * 3 + k) * 10, f = Math.sin(t * 9 + k * 2) * 10; g.strokeStyle = '#3a3a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 18, y - f); g.quadraticCurveTo(x - 8, y - 8, x, y); g.quadraticCurveTo(x + 8, y - 8, x + 18, y - f); g.stroke(); }
  celLayer(S, c => {
    c.translate(pan * .3, 0);
    stand(c, 300, 1050, .5, 1, cc => sonFig(cc, C.son, { pose: 'stand', expr: 'smileopen', look: [.5, -.2] }));
    stand(c, 500, 1050, .56, 1, cc => dadFig(cc, C.dad, { pose: lt > 6 ? 'wave' : 'stand', ph: .25, look: [.5, -.2] }));
    stand(c, 780, 1000, .4, 1, cc => person(cc, C.P, light, { robe: '#3a3a5a', mantle: '#5a1a2a', head: { hat: '#1a1a20', beard: true, hairCol: '#1a1414' }, pose: 'stand', expr: 'neutral' }));
  });
}
// ———————————— Samarkand: Clavijo before Amir Temur ————————————
export function samarkand(S) {
  const { g, e, A, t, lt, u } = S, light = 'hall', C = cast(light);
  const pan = -240 * eio(u);
  g.drawImage(A.samarkand.c, pan, 0); e.drawImage(A.samarkand.e, pan, 0);
  celLayer(S, c => {
    c.translate(pan, 0);
    cel(c, [[1720, 860, 1], [1700, 470], [1820, 400], [1940, 470], [1920, 860, 1]], { f: '#c89a3a', s: '#8a6a2a', so: [-14, -6], h: '#f0d070', l: '#3a2a0a', lw: 2 });   // the throne
    stand(c, 1820, 860, .52, -1, cc => person(cc, C.P, light, { pose: 'sit', robe: '#2a3a9a', mantle: '#c89a3a', head: { turban: '#f4f0e6', crown: 'small', beard: true, hairCol: '#2a1a14' }, expr: 'smile', trim: '#e8c060' }));
    stand(c, 2060, 900, .44, -1, cc => person(cc, C.P, light, { robe: '#5a2a5a', head: { turban: '#e8e0d0', beard: true, hairCol: '#c8c8c8' }, pose: 'stand' }));
    stand(c, 1480, 960, .46, 1, cc => person(cc, C.P, light, { robe: '#2a2a32', mantle: '#6a1a2a', collar: '#f4f0e6', head: { hat: '#1a1a20', beard: true, hairCol: '#3a2a20' }, pose: lt > 1.5 && lt < 9 ? 'bow' : 'present', holding: 'scroll' }));
    stand(c, 1240, 980, .44, 1, cc => person(cc, C.P, light, { robe: '#3a2a20', mantle: '#2a3a5a', head: { hat: '#2a1a14', beard: true, hairCol: '#2a1a14' }, pose: 'stand' }));
    stand(c, 260, 1060, .52, 1, cc => sonFig(cc, C.son, { pose: 'stand', expr: 'smileopen', look: [.5, -.2] }));
    stand(c, 450, 1060, .58, 1, cc => dadFig(cc, C.dad, { pose: 'stand', look: [.5, -.2] }));
  });
}
