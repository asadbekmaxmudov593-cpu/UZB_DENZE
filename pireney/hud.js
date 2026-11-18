// Dialogue on the tape: a small coloured name tag (OTA cyan, OʻGʻIL yellow) and the line, cream-yellow with a thick dark outline.
import { W, H } from './cel.js';
import { LINES } from './story.js';
const WHO = { O: { tag: 'OTA', col: '#8ff4ff' }, B: { tag: 'OʻGʻIL', col: '#ffe070' } };
export function hud(c, t) {
  c.clearRect(0, 0, W, H);
  const v = LINES.find(s => t >= s.a && t < s.b); if (!v) return;
  const who = WHO[v.who], y = H - 92;
  c.save(); let size = 52; c.font = `600 ${size}px "Barlow SC"`;
  const tagW = 150;
  while (c.measureText(v.text).width > W - 220 - tagW && size > 38) { size -= 2; c.font = `600 ${size}px "Barlow SC"`; }
  const tw = c.measureText(v.text).width, x = (W - tw - tagW) / 2 + tagW;
  c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.fillStyle = 'rgba(7,12,26,.8)'; c.beginPath(); c.roundRect(x - tagW, y - 25, 132, 50, 8); c.fill(); c.strokeStyle = who.col; c.lineWidth = 2.5; c.stroke();
  c.font = '700 30px "Barlow SC"'; c.fillStyle = who.col; c.textAlign = 'center'; c.fillText(who.tag, x - tagW + 66, y + 1);
  c.font = `600 ${size}px "Barlow SC"`; c.textAlign = 'left';
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
  c.strokeStyle = '#120a1e'; c.lineWidth = 9; c.strokeText(v.text, x, y);
  c.shadowColor = 'transparent'; c.fillStyle = v.who === 'B' ? '#fff0a0' : '#ffffff'; c.fillText(v.text, x, y);
  c.restore();
}
export function hudTexts(t) {
  const v = LINES.find(s => t >= s.a && t < s.b); if (!v) return [];
  return [{ id: v.id, text: v.text, x0: 80, y0: H - 130, x1: W - 80, y1: H - 56 }];
}
