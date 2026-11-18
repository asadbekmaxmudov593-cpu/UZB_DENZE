// Painted plates (colour + emissive), painted once at load. Background art may use gradients and airbrush; cels stay flat.
import { canvas, rng, rgba, mix, airbrush, vgrad, TAU, poly, path } from './cel.js';

function cloud(g, x, y, s, body, lit, R, a = .4) {
  for (let k = 0; k < 18; k++) { const u = (R() - .5) * 2, px = x + u * s * 1.7, r = s * (.32 + .45 * (1 - Math.abs(u)) * R() + .12), py = y - r * (.35 + R() * .5); airbrush(g, px, py, r, r * .9, body, a, .45); }
  for (let k = 0; k < 6; k++) { const px = x + (R() - .5) * s * 2.4, r = s * (.3 + R() * .3); airbrush(g, px, y - r * .1, r * 1.1, r * .28, lit, a * .8, .55); }
}
function ridge(g, w, base, amp, seed, col, snow, step = 40) {
  const R = rng(seed), pts = [[0, base + 400]]; let y = base;
  for (let x = 0; x <= w; x += step) { y = Math.max(base - amp, Math.min(base + 20, y + (R() - .5) * amp * .55)); pts.push([x, y]); }
  pts.push([w, base + 400]); g.fillStyle = col; g.fill(poly(pts));
  g.save(); g.clip(poly(pts));
  for (let i = 1; i < pts.length - 2; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; g.fillStyle = y1 > y0 ? rgba('#ffffff', .1) : rgba('#000000', .13); g.fill(poly([[x0, y0], [x1, y1], [x1 + 30, y1 + 160], [x0 + 30, y0 + 160]])); }
  if (snow) { g.fillStyle = snow; for (let i = 1; i < pts.length - 2; i++) { const [x, yy] = pts[i]; if (yy < base - amp * .55) g.fill(poly([[x - 30, yy + 34], [x, yy - 2], [x + 34, yy + 38], [x + 12, yy + 28]])); } }
  g.restore();
  return pts;
}
function cypress(g, x, base, h, w, col, lit) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x, base - h); g.quadraticCurveTo(x + w * .7, base - h * .45, x + w * .2, base); g.lineTo(x - w * .2, base); g.quadraticCurveTo(x - w * .7, base - h * .45, x, base - h); g.fill();
  g.fillStyle = lit; g.beginPath(); g.moveTo(x - 2, base - h * .9); g.quadraticCurveTo(x - w * .5, base - h * .45, x - w * .15, base - 6); g.lineTo(x - w * .05, base - 6); g.quadraticCurveTo(x - w * .2, base - h * .45, x - 2, base - h * .9); g.fill();
}
const both = (c1, e1) => ({ c: c1, e: e1 });

// —— the country road: far (sky, mountains), mid (fields, poplars; loops), near (road; loops). mode 'day' | 'sunset'
export function road(mode) {
  const day = mode === 'day', [fc, f] = canvas(1920, 760), [mc, m] = canvas(3840, 360), [nc, n] = canvas(3840, 320), [ec, e] = canvas(1920, 760);
  e.fillStyle = '#000'; e.fillRect(0, 0, 1920, 760);
  vgrad(f, 0, 0, 1920, 760, day ? [[0, '#3a7ad0'], [.6, '#9cc8ee'], [1, '#e8f0e0']] : [[0, '#2a2a6a'], [.45, '#a4508a'], [.8, '#ff9a5a'], [1, '#ffd08a']]);
  const R = rng(5);
  if (!day) { airbrush(f, 1340, 640, 520, 260, '#ffe2a0', .7); airbrush(e, 1340, 640, 420, 200, '#ffb060', .7); f.fillStyle = '#fff2c8'; f.beginPath(); f.arc(1340, 610, 46, 0, TAU); f.fill(); e.fillStyle = '#ffd890'; e.beginPath(); e.arc(1340, 610, 50, 0, TAU); e.fill(); }
  for (let i = 0; i < 6; i++) cloud(f, R() * 1920, 140 + R() * 300, 60 + R() * 70, day ? '#ffffff' : '#c27a9a', day ? '#f4f8ff' : '#ffc08a', R, day ? .45 : .4);
  ridge(f, 1920, 600, 180, 3, day ? '#8a9ac8' : '#6a4a8a', day ? '#f4f6ff' : '#ffd0c0');
  ridge(f, 1920, 660, 90, 9, day ? '#6a86a8' : '#4a3a6a', null);
  // mid: cotton/wheat fields with poplar rows (loops every 3840)
  const fieldA = day ? '#8ab05a' : '#7a6a5a', fieldB = day ? '#a8c46a' : '#9a7a5a', pop = day ? '#3c6a3a' : '#2a2a3a', popL = day ? '#6aa060' : '#5a4a5a';
  vgrad(m, 0, 100, 3840, 260, [[0, fieldB], [1, fieldA]]);
  for (let k = 0; k < 9; k++) { m.fillStyle = rgba('#000000', .05 + (k % 2) * .04); m.fillRect(0, 120 + k * 26, 3840, 10); }
  for (let x = 30; x < 3840; x += 70 + (x % 5) * 6) { const h = 150 + ((x * 7) % 60); m.fillStyle = pop; m.beginPath(); m.ellipse(x, 120 - h / 2, 18, h / 2, 0, 0, TAU); m.fill(); m.fillStyle = popL; m.beginPath(); m.ellipse(x - 6, 120 - h * .55, 7, h * .36, 0, 0, TAU); m.fill(); }
  // near: asphalt road with a dashed line and a grass verge
  n.fillStyle = day ? '#6a9a4a' : '#4a4a40'; n.fillRect(0, 0, 3840, 80);
  vgrad(n, 0, 70, 3840, 250, [[0, day ? '#5a5a62' : '#3a3644'], [1, day ? '#3a3a42' : '#24202c']]);
  n.fillStyle = day ? '#e8e8e0' : '#c8b8a0'; for (let x = 0; x < 3840; x += 160) n.fillRect(x, 190, 90, 10);
  n.fillStyle = rgba('#ffffff', .5); n.fillRect(0, 78, 3840, 5);
  return { far: fc, farE: ec, mid: mc, near: nc };
}

// —— Granada at golden hour: Sierra Nevada, the Alhambra on its hill, cypresses; a hillside path in front (2400 wide for a push)
export function granada() {
  const W = 2400, [c, g] = canvas(W, 1080), [ec, e] = canvas(W, 1080), R = rng(17);
  e.fillStyle = '#000'; e.fillRect(0, 0, W, 1080);
  vgrad(g, 0, 0, W, 760, [[0, '#4a6aa8'], [.45, '#d8b07a'], [.75, '#ffd88a'], [1, '#ffe8b0']]);
  airbrush(g, 1700, 520, 700, 300, '#fff0b0', .55); airbrush(e, 1700, 520, 600, 260, '#ffd070', .45);
  for (let i = 0; i < 7; i++) cloud(g, R() * W, 120 + R() * 260, 70 + R() * 80, '#f8e0c0', '#fff4d0', R, .35);
  ridge(g, W, 470, 170, 21, '#9a90b8', '#fff6ea', 50);
  for (let k = 0; k < 4; k++) airbrush(g, R() * W, 520 + R() * 60, 600, 60, '#ffeccc', .35);       // mist
  ridge(g, W, 560, 90, 23, '#7a7a9a', null, 50);
  // the hill
  g.fillStyle = '#3a4a2a'; g.fill(path([[0, 1080], [0, 760], [300, 700], [700, 640], [1200, 610], [1700, 640], [2100, 700], [2400, 740], [2400, 1080]]));
  for (let i = 0; i < 160; i++) { const x = R() * W, y = 640 + R() * 300; g.fillStyle = R() < .5 ? '#4a6a32' : '#2a3a20'; g.beginPath(); g.ellipse(x, y, 30 + R() * 30, 18 + R() * 14, 0, 0, TAU); g.fill(); }
  // the Alhambra: walls with crenellations, square towers, palace blocks (ochre-red), lit by the low sun from the right
  const wallTop = 520, base = 660, wc = '#c8865a', wcL = '#e8b07a', wcD = '#9a5a3a';
  g.fillStyle = wc; g.fillRect(500, wallTop + 40, 1300, base - wallTop - 40);
  for (let x = 500; x < 1800; x += 22) { g.fillRect(x, wallTop + 26, 12, 16); }
  const towers = [[520, 120, 70], [700, 90, 60], [880, 150, 80], [1060, 110, 70], [1250, 200, 90], [1450, 120, 70], [1640, 170, 100], [1760, 110, 60]];
  for (const [x, h, w] of towers) {
    g.fillStyle = wc; g.fillRect(x, wallTop + 40 - h, w, h + 60); g.fillStyle = wcL; g.fillRect(x + w * .55, wallTop + 40 - h, w * .45, h + 60);
    g.fillStyle = wc; for (let k = 0; k < w; k += 16) g.fillRect(x + k, wallTop + 26 - h, 10, 16);
    g.fillStyle = wcD; for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) { const wx = x + w * (.25 + k * .35), wy = wallTop + 60 - h + r * 40; g.fillRect(wx, wy, 8, 16); g.beginPath(); g.arc(wx + 4, wy, 4, Math.PI, 0); g.fill(); }
  }
  g.fillStyle = mix(wc, '#ffffff', .1); g.fillRect(940, wallTop - 10, 300, 60); g.fillStyle = wcD; for (let k = 0; k < 9; k++) g.fillRect(960 + k * 31, wallTop + 6, 12, 22);   // palace with arcade
  g.fillStyle = rgba('#000000', .18); g.fillRect(500, base - 30, 1300, 30);
  airbrush(e, 1700, 560, 300, 160, '#ffcf70', .3);
  for (const [x, h] of [[460, 220], [620, 180], [840, 240], [1180, 200], [1400, 260], [1560, 190], [1830, 230], [1990, 170]]) cypress(g, x, base + 40, h, 46, '#1e2e1a', '#3a5a2a');
  // the hillside path in front
  g.fillStyle = '#b89a6a'; g.fill(path([[0, 1080], [0, 930], [500, 900], [1100, 880], [1700, 900], [2400, 940], [2400, 1080]]));
  g.fillStyle = rgba('#000000', .12); for (let i = 0; i < 70; i++) { g.beginPath(); g.ellipse(R() * W, 920 + R() * 150, 10 + R() * 20, 4 + R() * 5, 0, 0, TAU); g.fill(); }
  return both(c, ec);
}

// —— a Castilian hall: horseshoe arches with red and white voussoirs, columns, a tiled floor, light shafts from high windows
export function hall() {
  const [c, g] = canvas(2200, 1080), [ec, e] = canvas(2200, 1080), R = rng(31);
  e.fillStyle = '#000'; e.fillRect(0, 0, 2200, 1080);
  vgrad(g, 0, 0, 2200, 760, [[0, '#3a2a2a'], [1, '#6a4a3a']]);
  for (let k = 0; k < 5; k++) {
    const cx = 260 + k * 420, top = 160, w = 300, sp = 380;
    g.fillStyle = '#2a1a1a'; g.beginPath(); g.moveTo(cx - w / 2, 760); g.lineTo(cx - w / 2, sp); g.arc(cx, sp, w / 2 * 1.08, Math.PI + .25, -.25); g.lineTo(cx + w / 2, 760); g.closePath(); g.fill();
    for (let j = 0; j < 15; j++) { const a0 = Math.PI + .25 + j * (Math.PI - .5 + .5) / 15, a1 = a0 + (Math.PI) / 15; g.fillStyle = j % 2 ? '#e8d8c0' : '#b03a2a'; g.beginPath(); g.arc(cx, sp, w / 2 * 1.08 + 40, a0, a1); g.arc(cx, sp, w / 2 * 1.08, a1, a0, true); g.closePath(); g.fill(); }
    g.fillStyle = '#c8b090'; g.fillRect(cx - w / 2 - 50, sp, 34, 760 - sp); g.fillRect(cx + w / 2 + 16, sp, 34, 760 - sp);
    airbrush(g, cx, sp + 120, 90, 160, '#ffd8a0', .25); airbrush(e, cx, sp + 60, 70, 110, '#ffd090', .25);
  }
  for (let k = 0; k < 4; k++) { g.save(); g.globalCompositeOperation = 'lighter'; const x = 440 + k * 420, gr = g.createLinearGradient(x, 0, x + 260, 1000); gr.addColorStop(0, rgba('#ffe0a0', .22)); gr.addColorStop(1, rgba('#ffe0a0', 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 90, 0); g.lineTo(x + 420, 1000); g.lineTo(x + 240, 1000); g.fill(); g.restore(); }
  // floor tiles in perspective
  vgrad(g, 0, 760, 2200, 320, [[0, '#7a5a3a'], [1, '#4a3424']]);
  for (let r = 0; r < 6; r++) { const y0 = 760 + Math.pow(r / 6, 1.6) * 320, y1 = 760 + Math.pow((r + 1) / 6, 1.6) * 320; for (let k = -10; k < 22; k++) if ((k + r) % 2 === 0) { const x0 = 1100 + (k * 100 - 1100) * (1 + r * .25), x1 = 1100 + ((k + 1) * 100 - 1100) * (1 + r * .25), x2 = 1100 + ((k + 1) * 100 - 1100) * (1 + (r + 1) * .25), x3 = 1100 + (k * 100 - 1100) * (1 + (r + 1) * .25); g.fillStyle = rgba('#e8c890', .18); g.fill(poly([[x0, y0], [x1, y0], [x2, y1], [x3, y1]])); } }
  // a tapestry and the throne dais
  g.fillStyle = '#7a1a2a'; g.fillRect(1640, 230, 300, 420); g.fillStyle = '#d8a84a'; g.fillRect(1640, 230, 300, 18); g.fillRect(1640, 632, 300, 18);
  g.fillStyle = '#e8c060'; g.fill(poly([[1760, 330], [1820, 330], [1830, 450], [1750, 450]])); g.fillRect(1740, 450, 100, 30);    // a castle emblem
  g.fillStyle = '#5a3a2a'; g.fillRect(1560, 740, 480, 40); g.fillStyle = '#7a4a32'; g.fillRect(1600, 710, 400, 34);
  return both(c, ec);
}

// —— before the palace: a Gothic-Mudéjar façade, hanging banners of Castile and Aragon
export function square() {
  const [c, g] = canvas(1920, 1080), [ec, e] = canvas(1920, 1080), R = rng(41);
  e.fillStyle = '#000'; e.fillRect(0, 0, 1920, 1080);
  vgrad(g, 0, 0, 1920, 830, [[0, '#4a7ac8'], [1, '#cfe2f4']]);
  for (let i = 0; i < 5; i++) cloud(g, R() * 1920, 140 + R() * 200, 70 + R() * 60, '#ffffff', '#fff6e8', R, .4);
  g.fillStyle = '#d8b88a'; g.fillRect(160, 220, 1600, 600); g.fillStyle = '#f0d4a4'; g.fillRect(160, 220, 1600, 26);
  for (let x = 160; x < 1760; x += 40) g.fillRect(x, 196, 24, 28);
  for (let k = 0; k < 7; k++) { const x = 260 + k * 220; g.fillStyle = '#5a3a2a'; g.beginPath(); g.moveTo(x, 520); g.lineTo(x, 400); g.quadraticCurveTo(x + 50, 330, x + 100, 400); g.lineTo(x + 100, 520); g.fill(); g.fillStyle = '#e8cc9a'; g.fillRect(x - 10, 520, 120, 14); }
  g.fillStyle = '#4a2a1a'; g.beginPath(); g.moveTo(860, 820); g.lineTo(860, 600); g.quadraticCurveTo(960, 470, 1060, 600); g.lineTo(1060, 820); g.fill();
  const banner = (x, kind) => {
    g.fillStyle = '#6a4a2a'; g.fillRect(x - 6, 250, 12, 10);
    if (kind === 'castile') { g.fillStyle = '#b81a2a'; g.fillRect(x - 60, 260, 120, 280); g.fillStyle = '#f0c040'; g.fill(poly([[x - 28, 360], [x + 28, 360], [x + 34, 450], [x - 34, 450]])); g.fillRect(x - 36, 440, 72, 20); for (const dx of [-26, 0, 26]) g.fillRect(x + dx - 8, 340, 16, 24); }
    else { g.fillStyle = '#f0c040'; g.fillRect(x - 60, 260, 120, 280); g.fillStyle = '#c81a2a'; for (let k = 0; k < 4; k++) g.fillRect(x - 60 + 15 + k * 28, 260, 14, 280); }
    g.fill(poly([[x - 60, 540], [x, 580], [x + 60, 540]]));
  };
  banner(300, 'castile'); banner(620, 'aragon'); banner(1300, 'castile'); banner(1620, 'aragon');
  vgrad(g, 0, 820, 1920, 260, [[0, '#b89a74'], [1, '#8a6a4a']]);
  return both(c, ec);
}

// —— Lisbon harbour: sky with big cumulus, the far shore with the town, the river mouth; ships are cels (shots.js)
export function harbor() {
  const [c, g] = canvas(2400, 1080), [ec, e] = canvas(2400, 1080), R = rng(51);
  e.fillStyle = '#000'; e.fillRect(0, 0, 2400, 1080);
  vgrad(g, 0, 0, 2400, 620, [[0, '#3a78c8'], [1, '#bfe0f4']]);
  for (let i = 0; i < 8; i++) cloud(g, R() * 2400, 120 + R() * 260, 90 + R() * 90, '#ffffff', '#eef6ff', R, .5);
  ridge(g, 2400, 600, 60, 53, '#7a9a8a', null, 60);
  for (let x = 900; x < 2200; x += 26) { const h = 20 + R() * 30; g.fillStyle = R() < .5 ? '#e8dcc8' : '#d8b8a0'; g.fillRect(x, 600 - h, 22, h); g.fillStyle = '#b05a3a'; g.fill(poly([[x - 2, 600 - h], [x + 11, 590 - h], [x + 24, 600 - h]])); }
  vgrad(g, 0, 610, 2400, 470, [[0, '#7ab0c8'], [1, '#2a6a8a']]);
  for (let k = 0; k < 40; k++) { const y = 630 + Math.pow(k / 40, 1.5) * 420; g.fillStyle = rgba('#ffffff', .1 + (k % 3) * .04); g.fillRect(R() * 2400, y, 60 + R() * 200, 2 + k * .1); }
  // the stone quay in front
  g.fillStyle = '#a89a86'; g.fill(poly([[0, 880], [900, 860], [1000, 1080], [0, 1080]])); g.fillStyle = '#8a7c6a'; for (let x = 0; x < 960; x += 60) g.fillRect(x, 880 - x * .02, 3, 200);
  return both(c, ec);
}

// —— Amir Temur's court in Samarkand: blue-tiled walls, a great arch with turquoise ribbed domes beyond, carpets
export function samarkand() {
  const [c, g] = canvas(2200, 1080), [ec, e] = canvas(2200, 1080), R = rng(61);
  e.fillStyle = '#000'; e.fillRect(0, 0, 2200, 1080);
  g.fillStyle = '#1a3a8a'; g.fillRect(0, 0, 2200, 820);
  for (let y = 0; y < 820; y += 46) for (let x = (y / 46) % 2 ? 23 : 0; x < 2200; x += 46) {           // tile pattern: eight-point stars
    g.fillStyle = (x + y) % 3 ? '#2a5ab0' : '#3a8ad0'; g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-9, -9, 18, 18); g.restore(); g.fillRect(x - 9, y - 9, 18, 18);
    g.fillStyle = '#f0e0a0'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
  }
  // the great arch (pishtaq) with the city beyond
  const ax = 1100, aw = 640, top = 120;
  g.fillStyle = '#e8d8b0'; g.fillRect(ax - aw / 2 - 60, top - 40, aw + 120, 860);
  g.save(); g.beginPath(); g.moveTo(ax - aw / 2, 820); g.lineTo(ax - aw / 2, 380); g.quadraticCurveTo(ax - aw / 2, top, ax, top - 10); g.quadraticCurveTo(ax + aw / 2, top, ax + aw / 2, 380); g.lineTo(ax + aw / 2, 820); g.closePath(); g.clip();
  vgrad(g, 0, 0, 2200, 820, [[0, '#4a8ad8'], [1, '#ffe6b8']]);
  for (const [x, r, h] of [[ax - 160, 110, 420], [ax + 140, 90, 470], [ax - 20, 150, 330]]) {
    g.fillStyle = '#c8b090'; g.fillRect(x - r * .9, h + r * .6, r * 1.8, 420);
    const gr = g.createLinearGradient(x - r, 0, x + r, 0); gr.addColorStop(0, '#1a9aa8'); gr.addColorStop(.35, '#5ae0e0'); gr.addColorStop(1, '#0a6a7a');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - r, h + r * .7); g.bezierCurveTo(x - r * 1.15, h - r * .4, x - r * .3, h - r * .9, x, h - r * 1.2); g.bezierCurveTo(x + r * .3, h - r * .9, x + r * 1.15, h - r * .4, x + r, h + r * .7); g.fill();
    g.strokeStyle = rgba('#0a4a5a', .5); g.lineWidth = 3; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * r * .28, h + r * .7); g.quadraticCurveTo(x + k * r * .32, h - r * .3, x, h - r * 1.18); g.stroke(); }
  }
  g.fillStyle = '#d8c8a0'; g.fillRect(ax - 300, 610, 60, 210); g.fillRect(ax + 240, 640, 50, 180);
  g.restore();
  g.strokeStyle = '#1a5ab0'; g.lineWidth = 26; g.beginPath(); g.moveTo(ax - aw / 2 - 20, 820); g.lineTo(ax - aw / 2 - 20, 380); g.quadraticCurveTo(ax - aw / 2 - 20, top - 20, ax, top - 30); g.quadraticCurveTo(ax + aw / 2 + 20, top - 20, ax + aw / 2 + 20, 380); g.lineTo(ax + aw / 2 + 20, 820); g.stroke();
  airbrush(e, ax, 500, 300, 300, '#ffe0a0', .35);
  // carpet floor
  vgrad(g, 0, 820, 2200, 260, [[0, '#8a2a2a'], [1, '#5a1a1a']]);
  g.strokeStyle = '#e8b04a'; g.lineWidth = 6; g.strokeRect(300, 850, 1600, 220); g.strokeStyle = '#2a4a8a'; g.lineWidth = 4; g.strokeRect(330, 870, 1540, 180);
  return both(c, ec);
}

// —— the map: a parchment with the Iberian Peninsula (coast drawn by hand from lon/lat), the sea washed blue
export const IBERIA = [[-8.9, 43.3], [-8.4, 43.4], [-7.7, 43.75], [-5.7, 43.55], [-3.8, 43.45], [-2.9, 43.35], [-1.8, 43.37], [-1.0, 43.0], [0.0, 42.7], [1.4, 42.55], [2.5, 42.4], [3.3, 42.3],
  [3.2, 41.9], [2.2, 41.4], [1.25, 41.1], [.85, 40.7], [-.05, 39.98], [-.35, 39.45], [.2, 38.75], [-.5, 38.35], [-.7, 37.6], [-1.6, 37.3], [-2.2, 36.73], [-2.45, 36.83], [-3.4, 36.7], [-4.4, 36.7], [-5.35, 36.13], [-5.6, 36.0],
  [-6.3, 36.53], [-6.95, 37.2], [-7.95, 37.0], [-8.99, 37.02], [-8.87, 37.95], [-9.15, 38.7], [-9.5, 38.78], [-9.38, 39.36], [-8.9, 40.3], [-8.67, 41.15], [-8.83, 41.7], [-8.9, 42.1], [-8.75, 42.25], [-9.3, 42.9]];
export const MAPXY = ([lon, lat]) => [990 + (lon + 3.1) * 80, 488 - (lat - 39.9) * 102];
export function mapPlate() {
  const [c, g] = canvas(1920, 1080), [ec, e] = canvas(1920, 1080), R = rng(71);
  e.fillStyle = '#000'; e.fillRect(0, 0, 1920, 1080);
  vgrad(g, 0, 0, 1920, 1080, [[0, '#e8d8b0'], [1, '#cfb88a']]);
  for (let i = 0; i < 60; i++) airbrush(g, R() * 1920, R() * 1080, 60 + R() * 120, 40 + R() * 80, '#a88a5a', .06);
  g.fillStyle = rgba('#5a8ab0', .35); g.fillRect(120, 80, 1680, 920);
  const land = poly(IBERIA.map(MAPXY));
  g.fillStyle = '#efe0b8'; g.fill(land); g.strokeStyle = '#6a4a2a'; g.lineWidth = 4; g.stroke(land);
  g.strokeStyle = rgba('#3a5a8a', .4); g.lineWidth = 2; for (let k = 1; k < 5; k++) { g.save(); g.translate(0, 0); g.beginPath(); IBERIA.map(MAPXY).forEach(([x, y], i) => { const cx = 960, cy = 520, s = 1 + k * .035; i ? g.lineTo(cx + (x - cx) * s, cy + (y - cy) * s) : g.moveTo(cx + (x - cx) * s, cy + (y - cy) * s); }); g.closePath(); g.stroke(); g.restore(); }
  g.strokeStyle = '#6a4a2a'; g.lineWidth = 10; g.strokeRect(100, 60, 1720, 960);
  return both(c, ec);
}
