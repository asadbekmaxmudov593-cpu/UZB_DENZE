// poster.js · the flag poster, as ink parts in print order. Sheet units: 1000 × 1500 (portrait).
// Flag geometry from the 500 × 250 construction: blue 0–80, red 80–85, white 85–165, red 165–170, green 170–250;
// crescent = circle r30 at (70,40) minus circle r30 at (80,40); 12 five-point stars r6 in rows of 3 / 4 / 5, right-aligned.
import { polyPath, rectPath, ridgeLine, bandSteps, mulberry, hash, unionPath } from './silk.js';

export const SW = 1000, SH = 1500;
export const ART = { x: 36, y: 36, w: 928, h: 1114 };          // art area y 36..1150
export const BAND = { x: 36, y: 1172, w: 928, h: 292 };        // dark info band y 1172..1464
export const FLAG = { x: 176, y: 150, s: 1.52 };               // 500 × 250 local → 760 × 380 on the sheet
export const INK = {
  paper: '#F4EEDF', sky: '#C2E2EA', blue: '#0099B5', green: '#1EB53A', red: '#CE1126', navy: '#15304A', cream: '#F3EDDD',
};
export const STARS = [[136, 16], [160, 16], [184, 16], [112, 40], [136, 40], [160, 40], [184, 40], [88, 64], [112, 64], [136, 64], [160, 64], [184, 64]];

// ---------- the flag (waving: a static print wave; the end lets it move) ----------
export function waveDy(xl, ph, A) { const u = xl / 500; return A * Math.sin(u * Math.PI * 2 * 1.2 - ph) * Math.pow(u, .85); }
export const flagPt = (xl, yl, ph, A) => [FLAG.x + xl * FLAG.s, FLAG.y + yl * FLAG.s + waveDy(xl, ph, A)];
function stripe(a, b, ph, A, N = 48) {
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) { const xl = 500 * i / N; top.push(flagPt(xl, a, ph, A)); bot.push(flagPt(xl, b, ph, A)); }
  return polyPath(top.concat(bot.reverse()));
}
function crescent(p, cx1, cy, r, d) {           // circle (cx1, cy, r) minus the same circle moved right by d
  const h = Math.sqrt(r * r - (d / 2) ** 2), a = Math.atan2(h, d / 2), b = Math.atan2(h, -d / 2);
  p.moveTo(cx1 + d / 2, cy - h);
  p.arc(cx1, cy, r, -a, a, true);               // outer edge, round the left side
  p.arc(cx1 + d, cy, r, b, -b, false);          // inner edge, back up
  p.closePath();
}
function star(p, cx, cy, R) {
  const r = R * 0.381966;
  for (let k = 0; k < 10; k++) {
    const an = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R, x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr;
    k ? p.lineTo(x, y) : p.moveTo(x, y);
  }
  p.closePath();
}
export function moonStars(ph, A, which = 'both') {
  const s = FLAG.s, p = new Path2D();
  if (which !== 'stars') { const [cx, cy] = flagPt(70, 40, ph, A); crescent(p, cx, cy, 30 * s, 10 * s); }
  if (which !== 'moon') for (const [x, y] of STARS) { const [cx, cy] = flagPt(x, y, ph, A); star(p, cx, cy, 6 * s); }
  return p;
}
export function flagParts(ph = .6, A = 9) {
  return {
    outline: stripe(0, 250, ph, A),
    blue: stripe(0, 80.6, ph, A),
    red: [stripe(80, 85, ph, A), stripe(165, 170, ph, A)],
    green: stripe(169.4, 250, ph, A),
    knock: moonStars(ph, A),
  };
}

// ---------- the land (static) ----------
export function land(seed = 3) {
  const R = mulberry(seed);
  // far mountains (blue): a ridge, the mass runs down to the bottom of the art; green prints over the valley
  // stepped, leaning peaks (a few named shapes, then a little midpoint jag on top)
  const PEAKS = [[96, 640, .95], [262, 584, 1.05], [452, 548, .9], [640, 600, 1.1], [818, 572, .95], [968, 650, 1.0]];
  const jag = ridgeLine([20, 0], [980, 0], 26, 7, seed + 1);
  let ridge = jag.map(([x, j]) => {
    let y = 780;
    for (const [px, py, k] of PEAKS) y = Math.min(y, py + Math.abs(x - px) * (x < px ? .78 * k : .62 * k));
    return [x, Math.min(780, y + j * (y < 700 ? 1 : .5))];
  });
  ridge.sort((a, b) => a[0] - b[0]);
  const mount = polyPath([[20, 1150], ...ridge, [980, 1150]]);
  // paper snow on every peak above 655
  const snow = new Path2D();
  for (let i = 1; i < ridge.length - 1; i++) {
    const [px, py] = ridge[i];
    if (!(py < ridge[i - 1][1] && py <= ridge[i + 1][1] && py < 640)) continue;
    const line = py + 52; let a = i, b = i;
    while (a > 0 && ridge[a - 1][1] < line) a--;
    while (b < ridge.length - 1 && ridge[b + 1][1] < line) b++;
    if (b - a < 2) continue;
    const pts = ridge.slice(a, b + 1).map(([x, y]) => [x, y - .5]);
    const x0 = pts[0][0], x1 = pts[pts.length - 1][0], n = Math.max(3, Math.round((x1 - x0) / 14));
    for (let k = n; k >= 0; k--) { const x = x0 + (x1 - x0) * k / n; pts.push([x, line + (k % 2 ? 9 : -3) + (R() - .5) * 4]); }
    snow.addPath(polyPath(pts));
    i = b;
  }
  // green hills and valley
  const hillRidge = ridgeLine([20, 838], [980, 806], 70, 6, seed + 7);
  hillRidge.sort((a, b) => a[0] - b[0]);
  const hills = polyPath([[20, 1150], ...hillRidge, [980, 1150]]);
  // the river (cut out of the green: the blue mountain ink shows through) — from the mountains down to the front
  const L = [], Rt = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, y = 790 + u * 370, x = 610 - 150 * Math.sin(u * 2.6 + .3) - 60 * u, w = 7 + 64 * u * u;
    L.push([x - w, y]); Rt.push([x + w, y]);
  }
  const river = polyPath(L.concat(Rt.reverse()));
  // irrigation channels across the fields (also cut out of the green): thicker toward the viewer
  const ditches = new Path2D();
  for (let k = 0; k < 6; k++) {
    const y = 918 + k * k * 6.2 + k * 14, th = 2.2 + k * 1.15, sag = 6 + k * 2;
    const top = [], bot = [];
    for (let i = 0; i <= 24; i++) { const x = 20 + 960 * i / 24, s = sag * Math.sin(i / 24 * Math.PI); top.push([x, y + s]); bot.push([x, y + s + th]); }
    ditches.addPath(polyPath(top.concat(bot.reverse())));
  }
  return { mount, snow, hills, river, ditches };
}

// ---------- the near skyline (navy): poplars, a portal, a ribbed dome, a minaret; ground ----------
function poplar(x, base, h, w) {
  return polyPath([[x, base - h], [x + w * .32, base - h * .78], [x + w * .5, base - h * .5], [x + w * .42, base - h * .22], [x + w * .16, base - 18],
    [x + 4, base - 18], [x + 4, base], [x - 4, base], [x - 4, base - 18], [x - w * .16, base - 18], [x - w * .42, base - h * .22], [x - w * .5, base - h * .5], [x - w * .32, base - h * .78]]);
}
export function skyline() {
  const G = 1104, parts = [];
  parts.push({ path: rectPath(20, G, 960, 46) });                                       // ground
  for (const [x, h, w] of [[70, 300, 54], [122, 236, 44], [256, 170, 36], [884, 284, 50], [934, 214, 40]]) parts.push({ path: poplar(x, G + 2, h, w) });
  // portal (pishtaq) with a pointed arch cut through it, two corner turrets
  const portal = new Path2D();
  portal.rect(326, 902, 196, G - 902 + 2); portal.rect(318, 872, 18, 32); portal.rect(512, 872, 18, 32);
  const arch = new Path2D();
  arch.moveTo(372, G + 2); arch.lineTo(372, 1000); arch.quadraticCurveTo(374, 958, 424, 938); arch.quadraticCurveTo(474, 958, 476, 1000); arch.lineTo(476, G + 2); arch.closePath();
  arch.rect(340, 918, 168, 6);                                                          // a paper band across the portal top
  parts.push({ path: portal, cut: arch });
  // ribbed dome on a drum, with a row of drum windows
  const dome = new Path2D();
  dome.rect(566, 990, 190, G - 990 + 2);
  dome.moveTo(570, 992); dome.bezierCurveTo(552, 930, 610, 900, 661, 890); dome.bezierCurveTo(712, 900, 770, 930, 752, 992); dome.closePath();
  dome.rect(658, 864, 6, 28); dome.moveTo(667, 862); dome.arc(661, 862, 6, 0, Math.PI * 2); dome.closePath();
  const ribs = new Path2D();
  for (const dx of [-54, -27, 0, 27, 54]) {                                              // paper ribs follow the dome's curve
    const x0 = 661 + dx * 1.45, xt = 661 + dx * .35;
    ribs.moveTo(x0 - 2, 986); ribs.quadraticCurveTo(661 + dx * 1.2, 930, xt - 1.4, 904); ribs.lineTo(xt + 1.4, 904); ribs.quadraticCurveTo(661 + dx * 1.2 + 4, 930, x0 + 2, 986); ribs.closePath();
  }
  for (let k = 0; k < 7; k++) { const x = 584 + k * 24; ribs.moveTo(x, 1016); ribs.lineTo(x + 12, 1016); ribs.lineTo(x + 12, 1044); ribs.quadraticCurveTo(x + 6, 1034, x, 1044); ribs.closePath(); }
  parts.push({ path: dome, cut: ribs });
  // minaret, tapering, with a lantern and a cone
  const min = new Path2D();
  min.moveTo(792, G + 2); min.lineTo(796, 900); min.lineTo(820, 900); min.lineTo(824, G + 2); min.closePath();
  min.rect(788, 880, 40, 22); min.moveTo(794, 881); min.lineTo(808, 850); min.lineTo(822, 881); min.closePath();
  const minCut = new Path2D(); for (const y of [940, 1000, 1060]) minCut.rect(790, y, 40, 4);
  parts.push({ path: min, cut: minCut });
  return parts;
}
export const POLE = { path: (() => { const p = rectPath(161, 128, 12, 978); p.moveTo(180, 118); p.arc(167, 118, 13, 0, Math.PI * 2); p.closePath(); return p; })() };

// ---------- texts on the sheet ----------
export const HEADER = { text: 'OʻZBEKISTON RESPUBLIKASI', font: '800 40px BigShoulders', ls: 7, x: 520, y: 98, align: 'center' };
export const BANDTXT = [
  { id: 'b1', text: '18-NOYABR', font: '900 160px BigShoulders', ls: 3, x: 74, y: 1322, h: 120 },
  { id: 'b2', text: 'DAVLAT BAYROGʻI KUNI', font: '800 60px BigShoulders', ls: 8, x: 76, y: 1394, h: 46 },
  { id: 'b3', text: '1991-yilda qabul qilingan', font: '600 34px Outfit', ls: 1, x: 78, y: 1440, h: 26 },
];
