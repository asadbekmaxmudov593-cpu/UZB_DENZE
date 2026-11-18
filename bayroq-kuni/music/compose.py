"""compose.py · original score for "Bayroq kuni": 100 BPM, 4/4 (beat 0.6 s, bar 2.4 s), 32 bars = 76.8 s, D Dorian (a 12 s intro, then the flag film).
Uzbek folk colours, played by hand: doira (frame drum: dum / tak / jingles), a plucked dutor-like ostinato, a nay-like flute,
a bowed drone for the white. No anthem melody: every line here is new.

Shape (from events.json): A bars 0-4 doira + dutor | green 5-7 flute enters | hush at 19.2, drone only for the white (bars 8-9) |
red 10-11 full, flute higher | canton 12-17 lighter, flute calm | drift 18: parts leave, silence 44.4-45.6 |
SNAP 45.6 (loudest downbeat) | 19-22 full, ostinato in sixteenths (faster by subdividing), doira roll under the date |
23-24 cadence, D major chord rings out.
Run from the library root:  LIB=<lib> .venv/bin/python <project>/music/compose.py   → music/score.wav"""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE)
ROOT = os.environ.get('LIB') or '/root/lemo-opuscar'
sys.path.insert(0, ROOT)
import numpy as np, soundfile as sf
from core.audio import sampler as S
from core.audio import pluck as P
from core.audio.sfx import SR, add, lp, hp

B = 0.6; BAR = 2.4
OFF = 12.0                                   # the intro (Asadbek's portrait) comes first; the flag film's bars start here
def bt(bar, beat=0.): return OFF + bar * BAR + beat * B
EV = json.load(open(os.path.join(D, 'events.json')))['ev']
def ev1(tp): return next(e for e in EV if e['type'] == tp)
SNAP = ev1('snap')['t']; SIL0 = ev1('silence')['t']; HUSH0 = ev1('hush')['t']; HUSH1 = ev1('hush')['t1']
TOT = 76.8 + 3.0
N = int(TOT * SR)
S.seed(7); rng = np.random.default_rng(7)
stem = {k: np.zeros((N, 2), np.float32) for k in ['doira', 'dutor', 'low', 'nay', 'drone']}

def hum(t): return t + rng.normal(0, .005)
# ---------- instruments ----------
def dum(at, vel=.7, gain=1.): add(stem['doira'], S.hit('frame_drum', 'large', vel), hum(at), gain * 1.1, -.05)
def tak(at, vel=.5, gain=1.): add(stem['doira'], S.hit('frame_drum', 'small', vel), hum(at), gain * .8, .12)
def slap(at, vel=.5, gain=1.): add(stem['doira'], S.hit('world_perc', 'darbuka_tak', vel), hum(at), gain * .55, .18)
def jingle(at, vel=.4, gain=1.): add(stem['doira'], S.hit('tambourine', None, vel), hum(at), gain * .32, .25)
def roll(a, b, vel=.35, gain=1.):
    t = a; k = 0
    while t < b: tak(t, vel * (.8 + .2 * (k % 2)) * (.7 + .3 * (t - a) / (b - a)), gain * .8); jingle(t, vel * .5, gain * .6); t += B / 4; k += 1
def dut(p, at, dur=.55, vel=.5, gain=1., pan=-.2):
    x = P.pluck('pipa', p, dur + .9, vel=vel); add(stem['dutor'], x, hum(at), gain * .5, pan)
def low(ps, at, dur=2.2, vel=.55, gain=1.):
    for i, p in enumerate(ps): add(stem['low'], P.pluck('nylon_guitar', p, dur, vel=vel * (1 - .1 * i)), hum(at + i * .018), gain * .75, -.1 + .15 * i)
def nay(p, at, dur, vel=.55, gain=1., pan=.15):
    add(stem['nay'], S.note('flute', p, dur, vel, attack=.05, release=.35), at - .03, gain * .8, pan)
def drone(p, at, dur, vel=.32, gain=1.):
    add(stem['drone'], S.note('cellos', p, dur, vel, attack=.6, release=1.2), at, gain * .9, 0)

# ---------- harmony and ostinato ----------
OST = {'D': ['D4', 'A3', 'D4', 'E4', 'F4', 'E4', 'D4', 'A3'], 'C': ['C4', 'G3', 'C4', 'D4', 'E4', 'D4', 'C4', 'G3'],
       'G': ['G3', 'D4', 'G4', 'A4', 'B4', 'A4', 'G4', 'D4'], 'A': ['A3', 'E4', 'A4', 'B4', 'C#5', 'B4', 'A4', 'E4']}
LOWC = {'D': ['D2', 'A2'], 'C': ['C2', 'G2'], 'G': ['G1', 'D2'], 'A': ['A1', 'E2']}
HARM = ['D', 'D', 'D', 'C', 'D',  'D', 'G', 'D',  'D', 'D',  'D', 'C',  'D', 'G', 'D', 'D', 'C', 'D',  'D',  'D', 'D', 'C', 'G', 'D', 'G', 'A', 'D']

for bar, h in enumerate(HARM):
    t0 = bt(bar)
    white = 8 <= bar <= 9
    canton = 12 <= bar <= 17
    drift = bar == 18
    end = bar == 26
    if white or drift or end: continue
    fast = 19 <= bar <= 22                                   # after the snap: sixteenths
    # low strings (dutor's open strings) on 1 (and 3 in full sections)
    low(LOWC[h], t0, 2.2, .62 if not canton else .45)
    if not canton: low(LOWC[h], t0 + 2 * B, 1.0, .4)
    # ostinato
    pat = OST[h]
    if fast:
        for k in range(16): dut(pat[k % 8], t0 + k * B / 4, .3, .42 + .08 * (k % 4 == 0), gain=.9)
    else:
        for k in range(8):
            if canton and k % 2: continue                   # the canton: half the notes, more air
            dut(pat[k], t0 + k * B / 2, .5, .45 + .1 * (k == 0) - (.04 if canton else 0), gain=1.35 if canton else 1.)
    # doira
    if canton:
        dum(t0, .45, .8); tak(t0 + B, .42); tak(t0 + 3 * B, .42); jingle(t0 + 1.5 * B, .3); jingle(t0 + 3.5 * B, .3)
    else:
        dum(t0, .75); slap(t0 + .5 * B, .4); tak(t0 + B, .5); dum(t0 + 2 * B, .6); tak(t0 + 2.75 * B, .45); tak(t0 + 3 * B, .55); slap(t0 + 3.5 * B, .35)
        jingle(t0 + B, .35); jingle(t0 + 3 * B, .35)
        if bar >= 5: jingle(t0 + 1.5 * B, .25); jingle(t0 + 3.5 * B, .25)

# accents on the clacks (every screen comes down on a downbeat)
for e in EV:
    if e['type'] == 'clack' and e['t'] > 0: dum(e['t'], .85, 1.1)

# the white (bars 8-9): the band stops at the hush; one bowed drone, a few high plucks, the nay answers the word
drone('D2', HUSH1 - .4, 4.9, .3); drone('A2', HUSH1 - .2, 4.7, .26)
for at, p in [(bt(8, 2), 'A4'), (bt(9, 0), 'D5'), (bt(9, 2), 'E5'), (bt(9, 3), 'A4')]: dut(p, at, 1.2, .32, .8, .3)
nay('A4', 20.4, 1.6, .42); nay('G4', 22.2, .8, .38); nay('A4', 23.0, .9, .4)

# ---------- the nay melody ----------
def phrase(bar, notes, vel=.55, oct=0):
    for (b, p, d) in notes:
        m = S.midi(p) + 12 * oct
        nay(m, bt(bar, b), d * B * .95, vel + .04 * (d >= 1))
A1 = [(0, 'A4', 1.5), (1.5, 'B4', .5), (2, 'C5', 1), (3, 'B4', .5), (3.5, 'A4', .5), (4, 'G4', 1), (5, 'A4', .5), (5.5, 'G4', .5), (6, 'F4', 1), (7, 'E4', 1)]
A2 = [(0, 'D4', 1), (1, 'F4', .5), (1.5, 'G4', .5), (2, 'A4', 2)]
Bp = [(0, 'D5', 1), (1, 'C5', .5), (1.5, 'D5', .5), (2, 'E5', 1), (3, 'F5', 1), (4, 'E5', .5), (4.5, 'D5', .5), (5, 'C5', 1), (6, 'D5', 2)]
Cp = [(0, 'A4', 2), (2, 'G4', 1), (3, 'F4', 1), (4, 'E4', 2), (6, 'D4', 2)]
Cq = [(0, 'F4', 1), (1, 'G4', 1), (2, 'A4', 2), (4, 'C5', 2), (6, 'A4', 2)]
Dp = [(0, 'D5', 1), (1, 'D5', .5), (1.5, 'E5', .5), (2, 'F5', 1), (3, 'E5', .5), (3.5, 'D5', .5), (4, 'C5', 1), (5, 'D5', 1), (6, 'A4', 2),
      (8, 'D5', 1), (9, 'E5', .5), (9.5, 'F5', .5), (10, 'G5', 1), (11, 'F5', .5), (11.5, 'E5', .5), (12, 'D5', 1.5), (13.5, 'C5', .5), (14, 'D5', 1), (15, 'E5', 1)]
phrase(5, A1); phrase(7, A2)
phrase(10, Bp, .6)
phrase(12, Cp, .54); phrase(16, Cq, .54)
phrase(20, Dp, .62)
Ep = [(0, 'F5', 1), (1, 'E5', .5), (1.5, 'D5', .5), (2, 'E5', 2), (4, 'C#5', 2), (6, 'E5', 2)]
phrase(24, Ep, .6)

# ---------- the drift, the silence, the snap ----------
d0 = bt(18)
drone('D2', d0, SIL0 - d0 + .1, .26); dut('A4', d0, 1.5, .3); dut('D5', d0 + 2 * B, 1.2, .26)
roll(d0 + 2 * B, SIL0 - .05, .28, .7)
# the snap: the loudest downbeat
dum(SNAP, 1.0, 1.5); jingle(SNAP, .8, 1.4); low(['D2', 'A2', 'D3'], SNAP, 2.4, .9, 1.3); drone('D2', SNAP, 2.6, .5, 1.2)
add(stem['doira'], S.hit('sus_cymbal', 'hit', .6), SNAP, .5, 0)
# a doira roll under the date stamps
roll(bt(20, 1), bt(20, 2.6), .45, .9)

# ---------- the cadence and the last chord (D major) ----------
e0 = bt(26)
dum(e0, .9, 1.3); jingle(e0, .6, 1.2)
low(['D2', 'A2', 'D3', 'F#3'], e0, 3.6, .75, 1.2)
for i, p in enumerate(['D4', 'F#4', 'A4', 'D5']): dut(p, e0 + .06 * i, 2.4, .45, .9, -.2 + .12 * i)
drone('D2', e0, 3.4, .42, 1.1); drone('A2', e0, 3.4, .36, 1.0)
nay('F#5', e0, 2.4, .6)
roll(e0 + 1.2, e0 + 2.0, .25, .5)

# ---------- the intro: Asadbek's portrait printed (a rising pluck per ink), then a light groove under his greeting ----------
dum(0.0, .8, 1.2); low(['D2', 'A2'], 0.0, 2.6, .6)
for at, p in [(.05, 'D4'), (1.0, 'F4'), (1.7, 'A4'), (2.35, 'D5')]: dut(p, at, .9, .55, 1.1, .1); tak(at, .4)
dut('A5', 3.6, 1.6, .4, .9, .2); jingle(3.6, .35)                       # he wakes up
for k, h in enumerate(['D', 'D', 'C']):                                     # 4.8, 7.2, 9.6: soft bars under the greeting
    t0 = 4.8 + k * BAR
    low(LOWC[h], t0, 2.2, .52)
    for j in range(0, 8, 2): dut(OST[h][j], t0 + j * B / 2, .5, .44, 1.1)
    dum(t0, .45, .8); tak(t0 + B, .38); tak(t0 + 3 * B, .38); jingle(t0 + 1.5 * B, .26); jingle(t0 + 3.5 * B, .22)
for at, p, d in [(4.8, 'A4', .85), (5.7, 'G4', .3), (6.0, 'A4', .6), (7.2, 'D5', 1.1), (8.4, 'C5', .55), (9.0, 'A4', 1.2)]:   # a short nay greeting
    nay(p, at, d, .5)
roll(10.8, 11.95, .38, .9)                                                  # the table move: a doira roll into the flag
dum(11.95, .6, .9)

# ---------- level, mute the silence, reverb, write ----------
tt = np.arange(N) / SR
mute = np.ones(N)
mute[(tt >= SIL0) & (tt < SNAP - .005)] = 0.0                           # true silence before the snap (foley only)
fade = np.clip((tt - HUSH0) / .25, 0, 1) * np.clip((HUSH1 + 4.8 - tt) / .2, 0, 1)   # the band gets out of the way for the white
band_mute = 1 - ((tt >= HUSH0) & (tt < HUSH1 + 4.8)) * np.clip((tt - HUSH0) / .2, 0, 1)
gains = {'doira': .9, 'dutor': .8, 'low': .7, 'nay': .75, 'drone': .8}
mixd = np.zeros((N, 2), np.float32)
for k, x in stem.items():
    y = x * gains[k]
    if k in ('doira', 'dutor', 'low'): y = y * band_mute[:, None]
    mixd += y
mixd *= mute[:, None]
wet = S.room(mixd, size=.42, mix=.16)
out = wet * mute[:, None]
pk = np.abs(out).max(); out = out / pk * .89
sf.write(os.path.join(HERE, 'score.wav'), out.astype(np.float32), SR)
print('score.wav', round(len(out) / SR, 2), 's, peak normalised')
print('\n'.join(S.credits(['frame_drum', 'tambourine', 'flute', 'cellos', 'world_perc', 'sus_cymbal'])))
