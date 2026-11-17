// The nine shots. Each gets S = { t, lt (time in shot), u (0..1), g (colour canvas), e (emissive canvas), A (plates) }.
// Characters are stepped on twos (12 fps), performance beats on threes (8 fps); camera and light move every frame.
import { canvas, W, H, LWK, rgba, mix, vgrad, airbrush, rng, TAU, poly, hash } from './cel.js';
import { PAL } from './pal.js';
import { head80 } from './head80.js';
import { figure } from './figure.js';
import { flag, pole, rope } from './flag.js';
import { flare, speedLines, lamp } from './fx.js';
import { T, VO, speaking } from './story.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const q12 = t => Math.floor(t * 12) / 12, q8 = t => Math.floor(t * 8) / 8;
const [cc, cg] = canvas(W, H);   // cel layer (light bands touch only the cel)

function celLayer(S, draw, band) {
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, W, H); cg.save(); draw(cg); cg.restore();
  if (band) { cg.save(); cg.globalCompositeOperation = 'source-atop'; band(cg); cg.restore(); }
  S.g.drawImage(cc, 0, 0);
  S.e.save(); S.e.globalCompositeOperation = 'destination-out'; S.e.drawImage(cc, 0, 0); S.e.restore();   // the cel blocks glow behind it
}
function lightBand(c, x, col, a = .22, w = 520) {
  const gr = c.createLinearGradient(x, 0, x + w, 260); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.5, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
}
const mouthAt = t => { const v = speaking(t); if (!v) return null; return ['talk', 'oh', 'talk', 'set', 'talk', 'smileopen'][Math.floor((q8(t) - v.t) * 8) % 6]; };
const blinkAt = t => ((t + .9) % 3.3) < .125;

// 1 — wide: blue dawn, the school, the pole; a small Asadbek walks in carrying the folded flag (small hero, huge painted world)
export function wide(S) {
  const { g, e, A, t } = S, P = PAL.blue;
  g.drawImage(A.court.dawn.c, 0, 0); e.drawImage(A.court.dawn.e, 0, 0);
  pole(g, P, 1240, 130, 875, 12); rope(g, P, 1250, 140, 860, 3);
  const k = eio(seg(q12(t), T.walk[0], T.walk[1])), x = 300 + k * 830, walking = t > T.walk[0] && t < T.walk[1];
  celLayer(S, c => { c.translate(x, 920); c.scale(.2, .2); c.translate(0, -1060);
    figure(c, P, { pose: walking ? 'walk' : 'carry', ph: walking ? (Math.floor(t * 8) % 4) / 4 : 0, view: 'q', expr: 'neutral' });
    if (walking) { c.translate(0, 0); } });
  if (walking) { g.save(); g.translate(x, 920); g.scale(.2, .2); g.translate(0, -1060); g.restore(); }
}
// 2 — extreme close-up: eyes open in three drawings (resolve)
export function eyes(S) {
  const { g, e, t, lt } = S, P = PAL.dawn;
  vgrad(g, 0, 0, W, H, [[0, '#1e2252'], [1, '#7a4a7a']]);
  for (let i = 0; i < 8; i++) airbrush(g, hash(i * 7.3) * W, hash(i * 3.1) * H, 220, 220, ['#ff9a6a', '#6a7aff', '#ffcf7a'][i % 3], .18);
  const k = Math.floor((q8(t) - T.open) * 8);
  const E = k < 0 ? { open: 0, expr: 'closed' } : k === 0 ? { open: .4, lid: .4, expr: 'neutral' } : k === 1 ? { open: .78, lid: .2, expr: 'neutral' } : { open: 1, lid: .1, expr: 'determined', look: [.25, -.05] };
  const s = 4.7 + lt * .08;
  LWK.k = .5;
  celLayer(S, c => { c.translate(960 - 7 * s, 540 - 21 * s); c.scale(s, s);
    head80(c, P, { view: 'q', expr: E.expr, open: E.open, lid: E.lid, look: E.look, ponytail: false, headset: false, blush: .05, wind: .1, detail: true, reflect: '#ffcf7a', rim: { c: '#ff9a6a', d: [1.2, .8] } }); },
    c => lightBand(c, -700 + lt * 900, '#ffcf7a', .2));
  LWK.k = 1;
  if (k >= 2) { const ga = Math.sin(seg(t, T.open + .3, T.open + .8) * Math.PI); if (ga > 0) flare(e, 960 - 7 * s + (-21 - 6) * s, 540 - 21 * s + 15 * s, .16 * ga, '#ffffff', { ghosts: false, streak: 260, spikes: 4, rot: .78 }); }
}
// 3 — medium bust, 3/4, held; lip flaps; a warm light band sweeps across
export function bust(S) {
  const { g, e, A, t, lt } = S, P = PAL.dawn;
  g.save(); g.filter = 'blur(5px)'; g.drawImage(A.court.dawn.c, -300, -260, 2400, 1350); g.restore();
  e.save(); e.filter = 'blur(5px)'; e.drawImage(A.court.dawn.e, -300, -260, 2400, 1350); e.restore();
  const tq = q8(t), m = mouthAt(tq) || 'smile';
  const s = 2.35 + lt * .02, bob = Math.round(Math.sin(q12(t) * 5) * 2);
  celLayer(S, c => { c.translate(1180, 420 + bob); c.scale(s, s);
    head80(c, P, { view: 'q', expr: 'smile', mouth: m, open: blinkAt(t) ? 0 : .9, lid: .12, ponytail: false, headset: false, blush: .06, wind: .15, ph: (Math.floor(t * 12) % 4) / 4, rim: { c: '#ffb070', d: [2, 1.2] } }); },
    c => lightBand(c, -800 + lt * 520, '#ffd28a', .18, 700));
}
// 4 — title: chrome letters glowing through the dawn
export function title(S) {
  const { g, e, t, lt } = S;
  vgrad(g, 0, 0, W, H, [[0, '#070a2e'], [.6, '#262a72'], [1, '#c0688a']]);
  const R = rng(91); for (let i = 0; i < 200; i++) { g.fillStyle = rgba('#ffffff', .2 + R() * .5); g.fillRect(R() * W, R() * H * .7, 2, 2); }
  speedLines(g, Math.floor(t * 12), { type: 'h', n: 26, col: '#8a9aff', a: .3, hmax: 4, seed: 4 });
  vgrad(g, 0, 760, W, 320, [[0, rgba('#ff9a6a', 0)], [1, rgba('#ff9a6a', .4)]]);
  const R2 = rng(12); g.fillStyle = '#0a0a24';
  for (let x = 0; x < W;) { const w = 60 + R2() * 140, h = 50 + R2() * 120; g.fillRect(x, H - h, w, h); x += w; }
  const flick = (() => { const k = Math.floor(lt * 12); return k < 1 ? 0 : k === 2 ? .3 : k === 4 ? .6 : 1; })();
  const chrome = (txt, y, size, stroke2) => {
    g.save(); g.textAlign = 'center'; g.font = `italic 900 ${size}px Kanit`; g.lineJoin = 'round';
    const gr = g.createLinearGradient(0, y - size * .8, 0, y + size * .05);
    gr.addColorStop(0, '#e8f6ff'); gr.addColorStop(.46, '#7fc8ff'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(.54, '#2a3a7a'); gr.addColorStop(.8, '#4ad0ff'); gr.addColorStop(1, '#a8ffcf');
    g.strokeStyle = '#08102e'; g.lineWidth = size * .11; g.strokeText(txt, W / 2, y);
    g.strokeStyle = stroke2; g.lineWidth = size * .045; g.strokeText(txt, W / 2, y);
    g.fillStyle = gr; g.fillText(txt, W / 2, y); g.restore();
    e.save(); e.textAlign = 'center'; e.font = `italic 900 ${size}px Kanit`; e.lineJoin = 'round';
    e.strokeStyle = rgba(stroke2, .9 * flick); e.lineWidth = size * .07; e.strokeText(txt, W / 2, y); e.restore();
  };
  if (flick > 0) {
    chrome('18-NOYABR', 470, 230, '#14b8d8');
    chrome('DAVLAT BAYROGʻI KUNI', 650, 110, '#2ad06a');
    g.save(); g.textAlign = 'center'; g.font = '600 38px "Barlow SC"'; g.fillStyle = rgba('#ffe0ff', .85); g.letterSpacing = '14px'; g.fillText('OʻZBEKISTON  ·  1991', W / 2, 760); g.letterSpacing = '0px'; g.restore();
  }
  const sx = -300 + seg(lt, .2, 1.3) * 2600;
  e.save(); e.globalCompositeOperation = 'lighter';
  const sg = e.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, rgba('#ffffff', 0)); sg.addColorStop(.5, rgba('#ffffff', .7)); sg.addColorStop(1, rgba('#ffffff', 0));
  e.fillStyle = sg; e.fillRect(0, 280, W, 420); e.restore();
  const gl = Math.sin(seg(lt, 1.4, 2.0) * Math.PI); if (gl > 0) flare(e, 1420, 300, .5 * gl, '#ffffff', { ghosts: false, streak: 500, spikes: 4, rot: .78 });
}
// 5 — low angle at the base of the pole: the rope, hand over hand; the flag starts to climb
export function base(S) {
  const { g, e, A, t, lt } = S, P = PAL.dawn;
  vgrad(g, 0, 0, W, H, [[0, '#1a2060'], [.6, '#5a4a9a'], [1, '#e8907a']]);
  const R = rng(5); for (let i = 0; i < 90; i++) { g.fillStyle = rgba('#ffffff', .15 + R() * .4); g.fillRect(R() * W, R() * 500, 2, 2); }
  g.fillStyle = '#3a3460'; g.fillRect(0, 900, W, 180); g.fillStyle = rgba('#000000', .2); g.fillRect(0, 900, W, 6);
  airbrush(e, 300, 1000, 700, 200, '#ff9a6a', .3);
  const px = 1180, k = seg(t, T.pull[0], 22.4), hy = 820 - k * 330;
  pole(g, P, px, -40, 1000, 22); rope(g, P, px + 18, -40, 1000, 0);
  flag(g, e, P, { x: px + 10, y: hy, w: 300, h: 150, wind: .12, ph: q12(t) * .4, lw: 2 });
  const ph = (Math.floor(t * 8) % 4) / 4;
  const fx = 1000, kk = Math.sin(ph * TAU), hx = fx + (114 + 200 * Math.cos(-1.35 - kk * .25) + 180 * Math.cos(-1.5 - kk * .3)) * .62, hy2 = 1260 + (190 + 200 * Math.sin(-1.35 - kk * .25) + 180 * Math.sin(-1.5 - kk * .3) - 1060) * .62;
  celLayer(S, c => { c.translate(fx, 1260); c.scale(.62, .62); c.translate(0, -1060); figure(c, P, { pose: 'pull', ph, view: 'q', expr: 'determined', look: [.4, -.5] }); });
  g.strokeStyle = mix(P.pole.l, '#ffffff', .25); g.lineWidth = 3; g.beginPath(); g.moveTo(px + 18, 120); g.lineTo(hx, hy2 - 10); g.lineTo(px + 14, 1000); g.stroke();
}
// 6 — multiplane crane up the pole with the rising flag; a light band crosses each colour as it is named
export function crane(S) {
  const { g, e, A, t, lt, u } = S, P = PAL.dawn, Sk = A.tall.dawn;
  const camY = (Sk.h - H) * (1 - eio(u * .98)), px = 760;
  g.drawImage(Sk.c, 0, -camY); e.drawImage(Sk.e, 0, -camY);
  pole(g, P, px, -100, H + 100, 26); rope(g, P, px + 22, -100, H + 100, 0);
  const fy = 330 + Math.sin(lt * .9) * 10, ph = q12(t) * .55;
  const M = flag(g, e, P, { x: px + 12, y: fy, w: 640, h: 320, wind: .68, ph, lw: 2.4 });
  // light band over the colour being named
  const v = VO.find(v => v.stripe && t >= v.t - .1 && t < v.t + v.d + .5);
  if (v) {
    const k = seg(t, v.t, v.t + 1.2), y0 = v.stripe[0] / 250, y1 = v.stripe[1] / 250;
    const reg = []; const N = 24; for (let i = 0; i <= N; i++) reg.push(M(i / N, y0)); for (let i = N; i >= 0; i--) reg.push(M(i / N, y1));
    g.save(); g.clip(poly(reg)); const bx = px + 12 - 260 + k * 1000;
    const gr = g.createLinearGradient(bx, 0, bx + 260, 0); gr.addColorStop(0, rgba('#ffffff', 0)); gr.addColorStop(.5, rgba('#ffffff', .45)); gr.addColorStop(1, rgba('#ffffff', 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    e.save(); e.clip(poly(reg)); e.fillStyle = gr; e.fillRect(0, 0, W, H); e.restore();
  }
}
// 7 — bust from below, looking up: the flag is at the top and hangs still (the turn)
export function lookup(S) {
  const { g, e, t, lt, u } = S, P = PAL.dawn;
  vgrad(g, 0, 0, W, H, [[0, '#2a3a8a'], [.7, '#9a7aaa'], [1, '#ffb88a']]);
  airbrush(e, 300, H, 900, 300, '#ffb070', .25 + u * .4); airbrush(g, 300, H, 900, 300, '#ffd0a0', .15 + u * .3);
  pole(g, P, 1460, 60, 1200, 18); flag(g, e, P, { x: 1470, y: 90, w: 260, h: 130, wind: 0, ph: 0, lw: 2 });
  const s = 2.25 + lt * .04;
  celLayer(S, c => { c.translate(760, 560); c.rotate(-.12); c.scale(s, s);
    head80(c, P, { view: 'q', expr: 'neutral', look: [.55, -.95], open: blinkAt(t + .4) ? 0 : 1, lid: 0, mouth: 'closed', ponytail: false, headset: false, blush: .05, wind: 0, rim: { c: '#ffb070', d: [-2, 1.5] } }); });
}
// 8 — the peak: the first ray (impact frame), the colour model turns to sunrise, the flag opens in the wind
export function peak(S) {
  const { g, e, t, lt } = S, P = PAL.sun;
  if (lt < 2 / 24) {                                           // impact frame: inverted silhouette over radial lines
    g.fillStyle = '#fff6e0'; g.fillRect(0, 0, W, H);
    speedLines(g, 1, { type: 'radial', cx: 380, cy: 900, col: '#ff8a3a', a: .9, n: 120, wmul: 1.3 });
    const Pk = { ...P, fblue: { f: '#140a1a', l: '#140a1a' }, fwhite: { f: '#140a1a', l: '#140a1a' }, fgreen: { f: '#140a1a', l: '#140a1a' }, fred: { f: '#140a1a', l: '#140a1a' } };
    pole(g, { ...P, pole: { f: '#140a1a', s: '#140a1a', h: '#140a1a', l: '#140a1a' }, gold: { f: '#140a1a', s: '#140a1a', h: '#140a1a', l: '#140a1a' } }, 700, 100, 1200, 30);
    flag(g, null, Pk, { x: 712, y: 150, w: 1060, h: 530, wind: .8, ph: .2 });
    return;
  }
  vgrad(g, 0, 0, W, H, [[0, '#2a5ab0'], [.55, '#86b6ea'], [.9, '#ffd8a0'], [1, '#ffb070']]);
  airbrush(g, 380, 980, 900, 360, '#ffe2a0', .55);
  for (let i = 0; i < 5; i++) airbrush(g, 200 + i * 380, 760 + (i % 2) * 50, 300, 40, '#fff2dc', .35);
  const ph = q12(t) * 1.25;
  pole(g, P, 700, 100, 1200, 30);
  flag(g, e, P, { x: 712, y: 150, w: 1060, h: 530, wind: 1, ph, lw: 3, glow: .25 });
  flare(e, 380, 940, 1.15, '#ffd28a', { streak: 1300 });
  lamp(g, e, 380, 940, 50, '#fff0c0', .9);
}
// 9 — wide crane up from the courtyard (sunrise) to the flag over the waking city; end title
export function end(S) {
  const { g, e, A, t, lt } = S, P = PAL.sun;
  const k = eio(seg(t, 54.0, 58.6)), off = -500 * k;
  g.save(); g.translate(0, -off);
  vgrad(g, 0, -1300, W, 1300, [[0, '#163a86'], [1, '#2c5db4']]);
  g.drawImage(A.court.sun.c, 0, 0);
  e.save(); e.translate(0, -off); e.drawImage(A.court.sun.e, 0, 0); airbrush(e, 520, 620, 600, 160, '#ffe2a0', .18); e.restore();
  pole(g, P, 1240, -320, 875, 14); rope(g, P, 1252, -300, 860, 4);
  flag(g, null, P, { x: 1250, y: -300, w: 560, h: 280, wind: 1, ph: q12(t) * 1.25, lw: 2.4 });
  const waving = t >= T.wave[0] && t < T.wave[1];
  g.restore();
  celLayer(S, c => { c.translate(0, -off); c.translate(1120, 930); c.scale(.24, .24); c.translate(0, -1060);
    figure(c, P, { pose: waving ? 'wave' : 'stand', ph: (Math.floor(t * 8) % 4) / 4, view: 'q', expr: 'smileopen', look: [.3, -.2] }); });
  if (t >= T.endTitle) {
    const lt2 = t - T.endTitle, flick = (() => { const kk = Math.floor(lt2 * 12); return kk < 1 ? 0 : kk === 2 ? .3 : kk === 4 ? .6 : 1; })();
    if (flick > 0) {
      g.save(); g.textAlign = 'center'; g.font = 'italic 900 150px Kanit'; g.lineJoin = 'round';
      const gr = g.createLinearGradient(0, 560, 0, 710); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(.46, '#ffd27a'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(.54, '#c0602a'); gr.addColorStop(1, '#ffcf6a');
      g.strokeStyle = '#2a0e08'; g.lineWidth = 18; g.strokeText('BAYRAMINGIZ MUBORAK!', W / 2, 700);
      g.strokeStyle = '#ff7a3a'; g.lineWidth = 7; g.strokeText('BAYRAMINGIZ MUBORAK!', W / 2, 700);
      g.fillStyle = gr; g.fillText('BAYRAMINGIZ MUBORAK!', W / 2, 700); g.restore();
      e.save(); e.textAlign = 'center'; e.font = 'italic 900 150px Kanit'; e.strokeStyle = rgba('#ffb060', .6 * flick); e.lineWidth = 12; e.strokeText('BAYRAMINGIZ MUBORAK!', W / 2, 700); e.restore();
    }
  }
}
