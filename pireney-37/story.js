// Story and timeline (the 37-second cut). Scene lengths come from the dialogue: every line stays on the tape long enough to read
// (non-space characters ÷ 15 + 1.6 s, at least 2 s); scene ends snap up to the bar (120 BPM, bar = 2 s).
// B = the son (Oʻgʻil), O = the father (Ota).
export const BPM = 120, BEAT = .5, BAR = 2;
// voiced cut: each line carries its voice file and the file's length (voice/dur.txt); B = Adam (pitched up), O = Bahadır
const DEF = [
  { name: 'road', fixed: 1.0 },
  { name: 'cabin', pad: .2, lines: [['B', 'Ota, Ferdinand kim boʻlgan?', 'son1', 1.746], ['O', 'Aragon qiroli. Ispaniyani aynan u birlashtirgan.', 'dad_aragon', 5.147]] },
  { name: 'jump', fixed: 1.0 },
  { name: 'samarkand', pad: .2, lines: [['O', '1403-yilda ispan elchisi Klavixo Amir Temurga kelgan.', 'dad_1403', 5.006]] },
  { name: 'ferdinand', pad: .2, lines: [['O', '1469-yilda u Kastiliya malikasi Izabellaga uylandi.', 'dad_1469', 3.221]] },
  { name: 'granada', pad: .2, lines: [['O', '1492-yilda Granada olinib, Ispaniya birlashdi.', 'dad_1492', 3.307]] },
  { name: 'lisbon', pad: .2, lines: [['O', '1498-yilda Vasko da Gama Hindistonga yetib bordi.', 'dad_1498', 7.935]] },
  { name: 'jump2', fixed: .8 },
  { name: 'cabin2', pad: .2, lines: [['B', 'Ha, ota, tushundim!', 'son2', 1.383]], endAt: 37.0 },   // the journey goes on: the road keeps running behind them
];
const nonsp = s => s.replace(/\s/g, '').length;
export const hold = s => Math.max(2.0, nonsp(s) / 15 + 1.6);
export const SHOTS = [], LINES = [];
let t = 0;
for (const S of DEF) {
  const t0 = t;
  if (S.endAt) t = S.endAt;
  else if (S.fixed) t += S.fixed;
  else {
    let x = t0 + S.pad;
    S.lines.forEach(([who, text, voice, vd], i) => {
      const h = vd ? Math.max(1.8, vd + .6) : hold(text), speech = vd ? vd : Math.min(h - .6, nonsp(text) * .07 + .3);   // with a voice the subtitle follows the speech
      LINES.push({ id: `${S.name}${i}`, who, text, voice, t: +x.toFixed(3), d: +speech.toFixed(3), a: +(x - .05).toFixed(3), b: +(x + h).toFixed(3), scene: S.name });
      x += h + .15;
    });
    t = S.endAt || x - .05;                        // the short cut does not wait for the bar
  }
  SHOTS.push([+t0.toFixed(3), +t.toFixed(3), S.name]);
}
LINES.forEach((L, i) => { if (LINES[i + 1]) L.b = Math.min(L.b, LINES[i + 1].a); });
export const DUR = t;
export const shotAt = x => SHOTS.find(s => x >= s[0] && x < s[1]) || SHOTS[SHOTS.length - 1];
export const shot = name => SHOTS.find(s => s[2] === name);
export const linesOf = name => LINES.filter(L => L.scene === name);
export const speaking = (x, who) => LINES.find(L => L.who === who && x >= L.t && x < L.t + L.d);
