// Bayroq tongi — 80s cel anime. Page contract: DUR, render(t), READY, EV, TEXTS. ?test=model draws the model sheet, ?raw=1 skips the CRT pass.
import { canvas, W, H } from './cel.js';
import { makePost } from './post.js';
import { DUR, shotAt, T, VO } from './story.js';
import { courtyard, tallSky } from './bg.js';
import * as SH from './shots.js';
import { hud, hudTexts } from './hud.js';
import { PAL } from './pal.js';
import { head80 } from './head80.js';
import { figure } from './figure.js';

const qs = new URLSearchParams(location.search);
const [sc, g] = canvas(W, H), [gc, e] = canvas(W, H), [ovc, ov] = canvas(W, H);
const post = makePost(document.getElementById('gl'));
for (const f of ['italic 900 56px Kanit', 'italic 800 56px Kanit', '500 40px "Barlow SC"', '600 40px "Barlow SC"', '700 40px "Barlow SC"']) await document.fonts.load(f, 'AOʻ‘');
const A = { court: { dawn: courtyard('dawn'), sun: courtyard('sun') }, tall: { dawn: tallSky('dawn') } };

function model(t) {
  g.fillStyle = '#cfcad6'; g.fillRect(0, 0, W, H);
  const P = PAL.day, cells = [['q', 'smile'], ['front', 'neutral'], ['side', 'determined'], ['q', 'smileopen']];
  cells.forEach(([view, expr], i) => { g.save(); g.translate(240 + i * 480, 330); g.scale(1.25, 1.25); head80(g, P, { view, expr, ponytail: false, headset: false, blush: .06, wind: .1 }); g.restore(); });
  ['stand', 'walk', 'pull', 'wave'].forEach((pose, i) => { g.save(); g.translate(240 + i * 480, 700); g.scale(.33, .33); g.translate(0, -560); figure(g, P, { pose, ph: .25, view: 'q', expr: 'smile' }); g.restore(); });
}
function render(t) {
  for (const x of [g, e]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  if (qs.get('test') === 'model') model(t);
  else { const [t0, t1, name] = shotAt(t); SH[name]({ t, lt: t - t0, u: (t - t0) / (t1 - t0), g, e, A }); }
  if (qs.get('nosub') || qs.get('test')) ov.clearRect(0, 0, W, H); else hud(ov, t);
  const raw = qs.get('raw') || qs.get('test');
  post.render(sc, gc, Math.round(t * 24), ovc, raw ? { bloom: 0, halo: 0, soft: 0, flick: 0, lift: 0, contrast: 0, fade: 0, sat: 1, tint: [1, 1, 1], scan: 0, grille: 0, bleed: 1, rshift: 0, glow: 0, corner: 0, noiseA: 0, power: 1, track: 0, expo: 1 }
    : { power: Math.min(1, t / .6), track: 0, scan: .07, grille: .015, bleed: 3, rshift: .6, noiseA: .006, soft: .08, glow: .2, corner: .16, bloom: .7, halo: .12, sat: 1.08 });   // a cleaner, sharper tape
}
function events() {
  const ev = [], add = (type, t, o = {}) => ev.push({ type, t: +t.toFixed(3), ...o });
  add('crton', .02);
  for (let x = T.walk[0] + .1; x < T.walk[1]; x += .25) add('step', x);
  for (let x = T.pull[0]; x < T.pull[1] - .2; x += .5) add('squeak', x, { v: x < 22 ? 1 : .55 });
  for (const s of [4, 6, 12, 16, 22, 38, 52]) add('cut', s);
  add('title', T.title); add('impact', T.sun); add('gust', T.sun, { d: 4 }); add('flutter', T.sun, { d: DUR - T.sun });
  add('birds', 45, { d: DUR - 45 }); add('endtitle', T.endTitle);
  for (const v of VO) add('line', v.t, { id: v.id, d: v.d });
  add('card', SH.CARD.t0);
  return ev.sort((a, b) => a.t - b.t);
}
window.EV = events(); window.DUR = DUR; window.render = render;
window.TEXTS = t => [...hudTexts(t), ...SH.cardTexts(t)];
render(+(qs.get('t') ?? 8));
window.READY = true;
