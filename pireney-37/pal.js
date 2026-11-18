// Colour models (iro shitei) for Diyorbek and the flag: one daylight base, derived per time of day.
// Pre-dawn blue → dawn → sunrise gold; a backlit set for silhouettes against the sun.
import { hex } from './cel.js';

export const BASE = {
  skin: { f: '#f2c8a4', s: '#d29a7a', h: '#fde4cc', l: '#5a2e22' },
  blush: '#ff9a8a',
  hair: { f: '#2b2a40', s: '#16151f', h: '#5d6390', l: '#0c0b14' },
  lash: '#14101a',
  jacket: { f: '#2a2b33', s: '#15161b', h: '#5a5e70', l: '#07070b' },
  stripe: { f: '#2a2b33', s: '#15161b', l: '#07070b' },
  shirt: { f: '#f3f6fc', s: '#aeb6cc', h: '#ffffff', l: '#39456a' },
  pants: { f: '#26272e', s: '#121318', h: '#4d5162', l: '#06060a' },
  shoe: { f: '#1c1a1f', s: '#0c0b0e', h: '#6a6670', l: '#040405' },
  eye: { f: '#6b4a2e', s: '#3a2414', h: '#c99d6c', l: '#1c1008' },
  white_eye: '#fbf8ff',
  mouth: '#9a3b4a',
  pole: { f: '#c9ced8', s: '#7c8496', h: '#ffffff', l: '#2a3044' },
  gold: { f: '#e2b24e', s: '#9a6c28', h: '#fff0b0', l: '#4d3210' },
  fblue: { f: '#0aa0bd', s: '#06708a', h: '#5fd3e6', l: '#06364a' },
  fwhite: { f: '#f4f6f8', s: '#b8c0cc', h: '#ffffff', l: '#06364a' },
  fgreen: { f: '#22b840', s: '#167a2c', h: '#7be08c', l: '#0b3d18' },
  fred: { f: '#d0142a', s: '#8e0a1c', h: '#ff6a76', l: '#4a0610' },
  phone: { f: '#2a2a34', s: '#16161d', h: '#5c5c70', l: '#08080c' },
  magenta: { f: '#ff4fa8', s: '#b8327a', l: '#5c1238' },
  lens: { f: '#86e6ff', s: '#3a9fd0', h: '#ffffff', l: '#1d3a58' },
  chrome: { f: '#dfe7f3', s: '#646f90', h: '#ffffff', l: '#2b3350' },
  strap: { f: '#5a4c66', s: '#3a3044', l: '#16101c' },
};
const mul = (c, m) => { const v = hex(c); return '#' + v.map((x, i) => Math.max(0, Math.min(255, Math.round(x * m[i]))).toString(16).padStart(2, '0')).join(''); };
export const LIGHTS = {
  day: { lit: [1, 1, 1], shade: [1, 1, 1], line: [1, 1, 1] },
  blue: { lit: [.8, .84, 1.0], shade: [.6, .6, .9], line: [.85, .8, 1.1] },          // pre-dawn
  dawn: { lit: [1.03, .9, .86], shade: [.8, .64, .82], line: [1, .8, .85] },
  sun: { lit: [1.08, .98, .84], shade: [.84, .7, .78], line: [1, .86, .82] },          // first sun, warm gold
  gold: { lit: [1.1, .98, .8], shade: [.82, .66, .66], line: [1, .84, .8] },          // golden hour (Granada)
  hall: { lit: [1.02, .94, .86], shade: [.74, .62, .7], line: [.95, .82, .85] },       // candle-and-window interior
  sunset: { lit: [1.08, .86, .78], shade: [.78, .56, .7], line: [1, .78, .8] },
  backlit: { lit: [.42, .3, .5], shade: [.26, .18, .36], line: [.4, .25, .5] },
};
export function palette(name) {
  const L = LIGHTS[name], out = {};
  for (const [k, v] of Object.entries(BASE)) {
    if (typeof v === 'string') { out[k] = mul(v, L.lit); continue; }
    out[k] = {};
    for (const [kk, c] of Object.entries(v)) out[k][kk] = mul(c, kk === 's' ? L.shade : kk === 'l' ? L.line : L.lit);
  }
  return out;
}
export const PAL = { day: palette('day'), blue: palette('blue'), dawn: palette('dawn'), sun: palette('sun'), backlit: palette('backlit'), gold: palette('gold'), hall: palette('hall'), sunset: palette('sunset') };
// skin is specified per set by hand (multiplying turns faces grey or pink)
Object.assign(PAL.blue.skin, { f: '#e2c0a6', s: '#a88aa8', h: '#f6e0d0' });
Object.assign(PAL.dawn.skin, { f: '#f4c6a2', s: '#c98c84', h: '#ffe2c8' });
Object.assign(PAL.sun.skin, { f: '#f8cc9c', s: '#d2907a', h: '#fff0d0' });

// a fabric colour model from one hex, under a given light: fill, hard shadow, highlight, line (a dark version of the fill)
export function fab(hex, light = 'day') {
  const L = LIGHTS[light], sh = mul(hex, [.62, .6, .7]), hi = '#' + hexMix(hex, '#ffffff', .32), ln = mul(hex, [.3, .28, .34]);
  return { f: mul(hex, L.lit), s: mul(sh, L.shade), h: mul(hi, L.lit), l: mul(ln, L.line) };
}
function hexMix(a, b, t) { const A = hex(a), B = hex(b); return A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
// the father and the son, and a whole cast, under one light
export function cast(light) {
  const P = PAL[light] || PAL.day;
  return {
    son: { ...P, jacket: fab('#2f5fa8', light), shirt: fab('#f3f6fc', light), pants: fab('#2c3140', light) },
    dad: { ...P, jacket: fab('#6a6f7c', light), shirt: fab('#cfe0f2', light), pants: fab('#3e424c', light), hair: fab('#3a2a22', light) },
    P,
  };
}
Object.assign(PAL.gold.skin, { f: '#f8c898', s: '#d28c72', h: '#fff0d4' });
Object.assign(PAL.hall.skin, { f: '#f0c4a0', s: '#c08878', h: '#ffe6cc' });
Object.assign(PAL.sunset.skin, { f: '#f6c49e', s: '#c88482', h: '#ffe4cc' });
