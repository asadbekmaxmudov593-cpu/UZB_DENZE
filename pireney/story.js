// Story and timeline. Scene lengths come from the dialogue: every line stays on the tape long enough to read
// (non-space characters ÷ 15 + 1.6 s, at least 2 s); scene ends snap up to the bar (120 BPM, bar = 2 s).
// B = the son (Oʻgʻil), O = the father (Ota).
export const BPM = 120, BEAT = .5, BAR = 2;
const DEF = [
  { name: 'road', fixed: 2.4 },
  { name: 'cabin', pad: .4, lines: [['B', 'Ota, qirol Ferdinand kim boʻlgan?'], ['O', 'Ferdinand — Aragon qiroli. Ispaniyani aynan u birlashtirgan.'], ['O', 'Hammasi Pireney yarimorolida boshlangan…']] },
  { name: 'jump', fixed: 2.0 },
  { name: 'granada', pad: .8, lines: [['B', 'Voy! Biz qayerdamiz?!'], ['O', 'Pireney yarimoroliga tushib qoldik! Bugun bu yerda Ispaniya va Portugaliya joylashgan.'], ['B', 'Ota, anavi qalʼa nima?'], ['O', 'Bu — Al-Hamro saroyi. Granada 1238–1492-yillarda Yevropadagi soʻnggi islom davlati boʻlgan.']] },
  { name: 'map', pad: .6, lines: [['O', '711–714-yillarda yarimorolni arab xalifaligi bosib olgan.'], ['O', 'XII asrda bu yerda Kastiliya, Navarra, Aragon va Portugaliya paydo boʻldi.']] },
  { name: 'castile', pad: .8, lines: [['O', 'Bu — Kastiliya, eng katta qirollik. Kortes — parlament ilk bor 1137-yilda shu yerda yigʻilgan.'], ['O', 'Qirol Alfonso X «Huquqning yetti boʻlimi» qonunlarini yaratgan, rasadxona qurdirgan.']] },
  { name: 'ferdinand', pad: .8, lines: [['B', 'Ana, Ferdinand!'], ['O', 'Ha! 1469-yilda u Kastiliya malikasi Izabellaga uylangan. Shu nikoh Ispaniyani birlashtirgan.']] },
  { name: 'map2', pad: .5, lines: [['O', '1492-yilda Granada, 1512-yilda Navarra ham Ispaniyaga qoʻshib olindi.']] },
  { name: 'lisbon', pad: .8, lines: [['B', 'Portugaliya-chi, ota?'], ['O', '1139-yilda Afonso Enrikesh Portugaliyaning birinchi qiroli boʻlgan.'], ['O', 'Vasko da Gama 1498-yilda Hindistonga, Pedro Kabral 1500-yilda Braziliyaga yetib borgan.']] },
  { name: 'samarkand', pad: .8, lines: [['O', 'Eng qizigʻi: Kastiliya qiroli Genrix III Amir Temurga elchilar yuborgan.'], ['O', '1403-yilda Klavixo Samarqandga kelib, «Esdaliklar» kitobini yozgan.']] },
  { name: 'jump2', fixed: 1.6 },
  { name: 'cabin2', pad: .4, lines: [['B', 'Ha, ota, tushundim!'], ['O', 'Barakalla! Qani, yoʻlimizda davom etamiz.']] },
  { name: 'road2', fixed: 7.2 },
];
const nonsp = s => s.replace(/\s/g, '').length;
export const hold = s => Math.max(2.0, nonsp(s) / 15 + 1.6);
export const SHOTS = [], LINES = [];
let t = 0;
for (const S of DEF) {
  const t0 = t;
  if (S.fixed) t += S.fixed;
  else {
    let x = t0 + S.pad;
    S.lines.forEach(([who, text], i) => {
      const h = hold(text), speech = Math.min(h - .6, nonsp(text) * .07 + .3);
      LINES.push({ id: `${S.name}${i}`, who, text, t: +x.toFixed(3), d: +speech.toFixed(3), a: +(x - .05).toFixed(3), b: +(x + h).toFixed(3), scene: S.name });
      x += h + .15;
    });
    t = Math.ceil((x + .25) / BAR) * BAR;
  }
  SHOTS.push([+t0.toFixed(3), +t.toFixed(3), S.name]);
}
LINES.forEach((L, i) => { if (LINES[i + 1]) L.b = Math.min(L.b, LINES[i + 1].a); });
export const DUR = t;
export const shotAt = x => SHOTS.find(s => x >= s[0] && x < s[1]) || SHOTS[SHOTS.length - 1];
export const shot = name => SHOTS.find(s => s[2] === name);
export const linesOf = name => LINES.filter(L => L.scene === name);
export const speaking = (x, who) => LINES.find(L => L.who === who && x >= L.t && x < L.t + L.d);
