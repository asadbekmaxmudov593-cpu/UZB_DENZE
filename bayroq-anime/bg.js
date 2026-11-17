// Painted plates (colour + emissive pair), painted once at load: the school courtyard at blue dawn and at sunrise, and a tall sky for the crane.
import { canvas, rng, rgba, mix, airbrush, vgrad, TAU, poly } from './cel.js';

export const MODES = {
  dawn: { sky: [[0, '#0f1640'], [.42, '#343a86'], [.76, '#b8688c'], [1, '#f4a27c']], far: '#6c5a98', near: '#45396f', snow: '#b6aedc',
    ground: '#4a4560', groundL: '#69628a', bld: '#3d3a5e', bldL: '#5a5680', win: '#ffcf7a', winOff: '#2b2946', tree: '#232f3e', treeL: '#344658', stars: .85, glow: '#ff9a6a' },
  sun: { sky: [[0, '#2c5db4'], [.48, '#78ace4'], [.8, '#ffd9a2'], [1, '#ffb070']], far: '#8c8cc2', near: '#6c6aa4', snow: '#fff2dc',
    ground: '#b19884', groundL: '#d6bca2', bld: '#c49e8c', bldL: '#e8c4a6', win: '#fff0c0', winOff: '#7a6a7c', tree: '#355e44', treeL: '#62986a', stars: 0, glow: '#ffe2a0' },
};
const HZ = 640;   // horizon line in the courtyard plate

function sky(g, e, M, w, y0, y1, seed) {
  vgrad(g, 0, y0, w, y1 - y0, M.sky.map(([o, c]) => [o, c]));
  const R = rng(seed);
  if (M.stars) for (let i = 0; i < 260; i++) { const y = y0 + R() * (y1 - y0) * .6, a = M.stars * (1 - (y - y0) / ((y1 - y0) * .6)) * (.3 + R() * .7); g.fillStyle = rgba('#ffffff', a); g.fillRect(R() * w, y, R() < .1 ? 3 : 2, R() < .1 ? 3 : 2); }
  for (let i = 0; i < 9; i++) { const x = R() * w, y = y0 + (y1 - y0) * (.45 + R() * .4); airbrush(g, x, y, 260 + R() * 260, 34 + R() * 30, mix(M.sky[2][1], '#ffffff', .25), .22); }   // airbrushed cloud bands, lit from below
  airbrush(e, w * .27, y1, 700, 260, M.glow, .55); airbrush(g, w * .27, y1, 800, 300, M.glow, .35);
}
function ridge(g, M, w, base, amp, seed, col, snow) {
  const R = rng(seed), pts = [[0, base + 200]];
  let y = base;
  for (let x = 0; x <= w; x += 40) { y = Math.max(base - amp, Math.min(base + 20, y + (R() - .5) * amp * .55)); pts.push([x, y]); }
  pts.push([w, base + 200]);
  g.fillStyle = col; g.fill(poly(pts));
  if (snow) { g.save(); g.clip(poly(pts)); g.fillStyle = snow; for (let i = 1; i < pts.length - 2; i++) { const [x, yy] = pts[i]; if (yy < base - amp * .55) g.fill(poly([[x - 26, yy + 30], [x, yy - 2], [x + 30, yy + 34], [x + 10, yy + 24]])); } g.restore(); }
}
function school(g, e, M, x0, x1, top, base) {
  vgrad(g, x0, top, x1 - x0, base - top, [[0, M.bldL], [1, M.bld]]);
  g.fillStyle = mix(M.bld, '#000000', .35); g.fillRect(x0 - 10, top - 12, x1 - x0 + 20, 14);       // roof edge
  const R = rng(7);
  for (let row = 0; row < 3; row++) for (let x = x0 + 30; x < x1 - 60; x += 74) {
    if (x > 860 && x < 1060) continue;                          // the entrance
    const y = top + 26 + row * 76, lit = R() < (M.stars ? .3 : 0);
    g.fillStyle = lit ? M.win : M.winOff; g.fillRect(x, y, 44, 48);
    if (lit) { e.fillStyle = rgba(M.win, .5); e.fillRect(x, y, 44, 48); }
    else if (!M.stars) { g.fillStyle = rgba('#ffffff', .35); g.fillRect(x + 4, y + 4, 10, 40); }
    g.fillStyle = rgba('#000000', .3); g.fillRect(x, y + 46, 44, 5);
  }
  // entrance portico: columns + sign
  g.fillStyle = mix(M.bldL, '#ffffff', .15); g.fillRect(850, top - 40, 220, base - top + 40);
  g.fillStyle = mix(M.bld, '#000000', .3); for (let k = 0; k < 4; k++) g.fillRect(866 + k * 56, top + 50, 16, base - top - 50);
  g.fillStyle = mix(M.bld, '#000000', .45); g.fillRect(900, top + 100, 120, base - top - 100);
  g.fillStyle = M.stars ? '#2a2850' : '#3a5aa0'; g.fillRect(876, top - 28, 168, 46);
  g.font = '700 30px "Barlow SC"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = M.stars ? '#ffd98a' : '#ffffff'; g.fillText('54-MAKTAB', 960, top - 5);
  if (M.stars) { e.font = '700 30px "Barlow SC"'; e.textAlign = 'center'; e.textBaseline = 'middle'; e.fillStyle = rgba('#ffd98a', .7); e.fillText('54-MAKTAB', 960, top - 5); }
}
function poplar(g, M, x, base, h, w) {
  g.fillStyle = M.tree; g.beginPath(); g.ellipse(x, base - h / 2, w / 2, h / 2, 0, 0, TAU); g.fill();
  g.fillStyle = M.treeL; g.beginPath(); g.ellipse(x - w * .14, base - h * .55, w * .26, h * .4, 0, 0, TAU); g.fill();
}
// the courtyard (1920 × 1080): sky, mountains, school, poplars, paved ground with the flagpole's round base
export function courtyard(mode) {
  const M = MODES[mode], [c, g] = canvas(1920, 1080), [ec, e] = canvas(1920, 1080);
  e.fillStyle = '#000'; e.fillRect(0, 0, 1920, 1080);
  sky(g, e, M, 1920, 0, HZ, 3);
  ridge(g, M, 1920, 540, 120, 11, M.far, M.snow); ridge(g, M, 1920, 600, 70, 17, M.near, null);
  for (const [x, h] of [[90, 330], [160, 280], [1800, 340], [1870, 290], [230, 250], [1730, 260]]) poplar(g, M, x, 700, h, 70);
  school(g, e, M, 300, 1620, 470, 700);
  vgrad(g, 0, 690, 1920, 390, [[0, M.groundL], [1, M.ground]]);
  g.strokeStyle = rgba('#000000', .14); g.lineWidth = 2;
  for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(960 + k * 40, 690); g.lineTo(960 + k * 260, 1080); g.stroke(); }
  for (const y of [720, 760, 820, 900, 1000]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1920, y); g.stroke(); }
  // flower beds
  for (const [x, w] of [[120, 420], [1440, 420]]) { g.fillStyle = mix(M.tree, '#000000', .1); g.fillRect(x, 730, w, 34); g.fillStyle = M.stars ? '#7a4a6a' : '#e85a6a'; for (let i = 0; i < 18; i++) g.fillRect(x + 10 + i * 23, 728, 9, 8); }
  // pole base
  g.fillStyle = mix(M.ground, '#000000', .25); g.beginPath(); g.ellipse(1240, 880, 120, 30, 0, 0, TAU); g.fill();
  g.fillStyle = M.groundL; g.beginPath(); g.ellipse(1240, 872, 110, 26, 0, 0, TAU); g.fill();
  return { c, e: ec, M };
}
// a tall sky for the crane up the pole: zenith at the top, horizon (mountains, school roof) at the bottom
export function tallSky(mode, h = 3400) {
  const M = MODES[mode], [c, g] = canvas(1920, h), [ec, e] = canvas(1920, h);
  e.fillStyle = '#000'; e.fillRect(0, 0, 1920, h);
  sky(g, e, M, 1920, 0, h - 300, 21);
  ridge(g, M, 1920, h - 400, 140, 31, M.far, M.snow); ridge(g, M, 1920, h - 330, 80, 37, M.near, null);
  g.fillStyle = M.bld; g.fillRect(0, h - 250, 1920, 250);
  g.fillStyle = mix(M.bld, '#000000', .35); g.fillRect(0, h - 262, 1920, 14);
  return { c, e: ec, M, h };
}
