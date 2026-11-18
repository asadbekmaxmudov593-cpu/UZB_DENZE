// The family car: a side view for the road (wheels turning, two heads in the windows), and the cabin seen through the windscreen.
import { cel, poly, path, line, TAU, mix, rgba, airbrush, vgrad } from './cel.js';

export function carSide(g, e, x, y, s, t, mode = 'day') {
  const body = mode === 'day' ? { f: '#e8ecf2', s: '#9aa4b8', h: '#ffffff', l: '#2a3044' } : { f: '#f0c8b0', s: '#9a7a8a', h: '#fff0e0', l: '#3a2a3a' };
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = rgba('#000000', .28); g.beginPath(); g.ellipse(0, 6, 300, 20, 0, 0, TAU); g.fill();
  cel(g, [[-290, -20, 1], [-292, -80], [-250, -100], [-150, -112], [-90, -176], [60, -182], [140, -120], [270, -100], [298, -70], [296, -20, 1]],
    { f: body.f, s: body.s, sh: [[[-300, -50], [300, -50], [300, 0], [-300, 0]]], h: body.h, hi: [[[-240, -96], [120, -110], [130, -104], [-238, -90]]], l: body.l, lw: 2.4 });
  const glass = mode === 'day' ? '#2a4a7a' : '#4a3a6a';
  cel(g, [[-140, -110, 1], [-84, -168], [-10, -170], [-10, -110, 1]], { f: glass, l: body.l, lw: 2 });
  cel(g, [[4, -110, 1], [4, -170], [56, -170], [124, -114, 1]], { f: glass, l: body.l, lw: 2 });
  for (const [hx, hr] of [[-62, 26], [40, 22]]) { g.fillStyle = rgba('#0a0a1a', .6); g.beginPath(); g.ellipse(hx, -138, hr * .9, hr, 0, 0, TAU); g.fill(); }   // the two of them inside
  g.fillStyle = rgba('#ffffff', .25); g.fill(poly([[-120, -112], [-90, -160], [-70, -160], [-100, -112]]));
  line(g, [[-250, -60], [280, -64]], body.s, 2); line(g, [[-4, -110], [-2, -26]], body.s, 2);
  g.fillStyle = mode === 'day' ? '#ffe9a0' : '#ffd070'; g.fillRect(282, -82, 14, 14); if (e) { e.save(); e.translate(x, y); e.scale(s, s); e.fillStyle = 'rgba(255,220,140,.7)'; e.fillRect(282, -82, 14, 14); e.restore(); }
  g.fillStyle = '#d02a2a'; g.fillRect(-296, -80, 10, 16);
  for (const wx of [-180, 190]) {
    const W = new Path2D(); W.arc(wx, -18, 46, 0, TAU); cel(g, W, { f: '#1a1a20', l: '#05050a', lw: 2 });
    const Rm = new Path2D(); Rm.arc(wx, -18, 26, 0, TAU); cel(g, Rm, { f: '#b8c0cc', s: '#6a7280', so: [4, 4], l: '#2a2a34', lw: 1.6 });
    const a = -t * 14; g.strokeStyle = '#4a5260'; g.lineWidth = 4; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(wx, -18); g.lineTo(wx + Math.cos(a + k * TAU / 5) * 22, -18 + Math.sin(a + k * TAU / 5) * 22); g.stroke(); }
  }
  g.restore();
}

// cabin frame drawn over the characters: roof, A-pillars, mirror, dashboard, steering wheel; glass reflections
export function cabinBack(g, far, t, mode) {
  // through the rear window: the road falling away behind (the far plate, sliding)
  g.save(); g.beginPath(); g.roundRect(260, 150, 1400, 520, 60); g.clip();
  g.drawImage(far, -((t * 40) % 400), -40, 2320, 920);
  g.restore();
  g.fillStyle = mode === 'day' ? '#3a3a44' : '#2a2430'; g.fillRect(0, 0, 1920, 150); g.fillRect(0, 150, 260, 930); g.fillRect(1660, 150, 260, 930); g.fillRect(260, 670, 1400, 410);
  for (const hx of [640, 1280]) { cel(g, [[hx - 150, 1080, 1], [hx - 170, 540], [hx - 120, 470], [hx + 120, 470], [hx + 170, 540], [hx + 150, 1080, 1]], { f: '#4a4652', s: '#2a2832', so: [-20, -6], l: '#14121a', lw: 2 }); }
}
export function cabinFront(g, e, t, mode, wheelTurn = 0) {
  // A-pillars and roof edge
  g.fillStyle = '#1c1a22'; g.fill(poly([[0, 0], [190, 0], [70, 1080], [0, 1080]])); g.fill(poly([[1920, 0], [1730, 0], [1850, 1080], [1920, 1080]])); g.fillRect(0, 0, 1920, 46);
  // rear-view mirror
  cel(g, poly([[880, 40], [1040, 40], [1048, 104], [872, 104]]), { f: '#2a2a32', l: '#08080c', lw: 2 }); g.fillStyle = mode === 'day' ? '#7aa0c8' : '#c08a7a'; g.fillRect(886, 50, 148, 44);
  // dashboard
  cel(g, [[0, 1080, 1], [0, 940], [400, 900], [1520, 900], [1920, 940], [1920, 1080, 1]], { f: '#2a2832', s: '#16141c', so: [0, -14], h: '#4a4656', l: '#08080c', lw: 2 });
  // steering wheel on the driver's (right) side
  g.save(); g.translate(1330, 980); g.rotate(wheelTurn);
  const Wh = new Path2D(); Wh.ellipse(0, 0, 230, 120, 0, 0, TAU); Wh.ellipse(0, 0, 200, 98, 0, 0, TAU);
  g.fillStyle = '#121016'; g.fill(Wh, 'evenodd'); g.fillStyle = '#2a2830'; g.fillRect(-30, -20, 60, 140);
  g.restore();
  // glass: two soft diagonal reflections over everything
  g.save(); g.globalCompositeOperation = 'screen';
  for (const [x, w] of [[300, 120], [1150, 220]]) { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(.5, rgba('#ffffff', .1)); gr.addColorStop(1, rgba('#ffffff', 0)); g.fillStyle = gr; g.fill(poly([[x + 260, 0], [x + 260 + w, 0], [x + w - 160, 1080], [x - 160, 1080]])); }
  g.restore();
}
// the textbook in the son's hands: an open page with the 8-mavzu banner and a round portrait
export function book(g, e, x, y, s, glow = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  cel(g, poly([[-210, -10], [0, 10], [0, 190], [-210, 170]]), { f: '#f4ecd8', s: '#c8bca0', so: [0, -10], l: '#4a3a2a', lw: 2 });
  cel(g, poly([[0, 10], [210, -10], [210, 170], [0, 190]]), { f: '#f4ecd8', s: '#c8bca0', so: [0, -10], l: '#4a3a2a', lw: 2 });
  g.fillStyle = '#e8c86a'; g.fill(poly([[-196, 8], [-14, 24], [-14, 90], [-196, 74]]));
  const C = new Path2D(); C.ellipse(-104, 52, 34, 34, 0, 0, TAU); g.fillStyle = '#6a4a3a'; g.fill(C); g.strokeStyle = '#3a8ab0'; g.lineWidth = 4; g.stroke(C);
  g.fillStyle = '#1a1414'; g.beginPath(); g.ellipse(-104, 38, 22, 12, 0, 0, TAU); g.fill();                              // the black cap
  g.fillStyle = '#e8b896'; g.beginPath(); g.ellipse(-104, 56, 13, 16, 0, 0, TAU); g.fill();
  g.fillStyle = '#c86a3a'; g.fill(poly([[-190, 100], [-20, 112], [-20, 132], [-190, 120]]));
  g.font = '700 16px "Barlow SC"'; g.fillStyle = '#ffffff'; g.save(); g.transform(1, .07, 0, 1, 0, 0); g.fillText('8-mavzu', -140, 114); g.restore();
  g.fillStyle = rgba('#2a4a6a', .5); for (let k = 0; k < 6; k++) g.fillRect(20, 20 + k * 22 - k * 1.5, 170, 6);
  g.restore();
  if (glow > 0 && e) { airbrush(e, x, y + 80 * s, 420 * s * (1 + glow), 260 * s * (1 + glow), '#ffe8a0', Math.min(1, glow)); }
}
