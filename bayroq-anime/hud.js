// Subtitles on the tape (composited inside the CRT pass): cream-yellow semi-condensed type with a thick dark outline, ~96 px above the bottom.
import { W, H } from './cel.js';
import { subSpans } from './story.js';
const SPANS = subSpans();
export function hud(c, t) {
  c.clearRect(0, 0, W, H);
  const v = SPANS.find(s => t >= s.a && t < s.b); if (!v) return;
  c.save(); let size = 54; c.font = `600 ${size}px "Barlow SC"`;
  while (c.measureText(v.text).width > W - 160 && size > 40) { size -= 2; c.font = `600 ${size}px "Barlow SC"`; }
  c.textBaseline = 'middle'; c.textAlign = 'center'; c.lineJoin = 'round';
  const y = H - 96;
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
  c.strokeStyle = '#120a1e'; c.lineWidth = 9; c.strokeText(v.text, W / 2, y);
  c.shadowColor = 'transparent'; c.fillStyle = '#fff0a0'; c.fillText(v.text, W / 2, y);
  c.restore();
}
export function hudTexts(t) {
  const v = SPANS.find(s => t >= s.a && t < s.b); if (!v) return [];
  return [{ id: v.id, text: v.text, x0: 80, y0: H - 130, x1: W - 80, y1: H - 62 }];
}
