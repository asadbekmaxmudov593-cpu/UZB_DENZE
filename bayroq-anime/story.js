// Timeline (120 BPM, beat 0.5 s, bar 2 s). Cuts land on bars. VO = Asadbek's lines (subtitles on the tape; lip flaps follow them).
export const BPM = 120, BEAT = .5, BAR = 2;
export const bar = (b, beat = 0) => b * BAR + beat * BEAT;
export const DUR = 62;
export const SHOTS = [
  [0, 4, 'wide'], [4, 6, 'eyes'], [6, 12, 'bust'], [12, 16, 'title'], [16, 22, 'base'],
  [22, 38, 'crane'], [38, 44, 'lookup'], [44, 52, 'peak'], [52, 62, 'end'],
];
export const shotAt = t => SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];
export const T = { walk: [.6, 3.7], open: 4.5, pull: [16.4, 38], limp: 38, silence: [43.5, 44], sun: 44, title: 12.15, endTitle: 57.0, wave: [52.2, 56] };
// captions (on the tape). Asadbek does not speak: his name is a character card in the bust shot (shots.js).
export const VO = [
  { id: 'v3', t: 16.3, d: 3.0, text: '1991-yil 18-noyabrda Davlat bayrogʻi qonuni qabul qilingan.' },
  { id: 'v4', t: 21.35, d: 2.6, text: 'Moviy — mangu osmon va obihayot ramzi.', stripe: [0, 80] },
  { id: 'v5', t: 25.05, d: 2.2, text: 'Oq — tinchlik va poklik ramzi.', stripe: [85, 165] },
  { id: 'v6', t: 28.3, d: 2.6, text: 'Yashil — yangilanayotgan tabiat ramzi.', stripe: [170, 250] },
  { id: 'v7', t: 32.15, d: 2.3, text: 'Qizil chiziqlar — hayotiy kuch.', stripe: [80, 170], red: true },
  { id: 'v8', t: 35.45, d: 2.2, text: 'Yarim oy — mustaqillik ramzi.', stripe: [0, 80], canton: true },
  { id: 'v8b', t: 38.7, d: 2.6, text: '12 yulduz — qadimiy quyosh yil hisobi.' },
  { id: 'v9', t: 53.0, d: 2.2, text: 'Bayrogʻimiz — gʻururimiz!' },
];
// subtitle spans: hold ≥ max(1.8 s, speech + 0.6 s, reading time); a line yields to the next
export function subSpans() {
  // no voice yet: every line also stays long enough to read (non-space characters ÷ 15 + 1.6 s)
  const S = VO.map(v => ({ ...v, a: v.t - .05, b: v.t - .05 + Math.max(v.d + .65, 1.9, v.text.replace(/\s/g, '').length / 15 + 1.6) }));
  S.forEach((s, i) => { if (S[i + 1]) s.b = Math.min(s.b, S[i + 1].a); });
  return S;
}
// is Asadbek speaking at t (for lip flaps)?
export const speaking = () => null;   // he does not speak
