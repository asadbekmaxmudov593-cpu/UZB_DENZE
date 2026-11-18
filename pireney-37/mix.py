"""mix.py · score + foley + ambience → out/mix.wav. Scene times from events.json ('scene' events).
Car: engine hum and tyre roar (inside the cabin: low and muffled). Jumps: a whoosh, a tape tear, a deep hit. Granada: market murmur, birds.
Castile: a quiet stone hall. Ferdinand: a cheering crowd. Map: paper. Lisbon: waves, gulls, rigging creaks. Samarkand: court murmur, a fountain."""
import json, os, sys
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('LIB') or '/root/lemo-opuscar'
sys.path.insert(0, os.path.join(ROOT, 'core/audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, thump, whoosh, creak, limit, add
from scipy.signal import resample_poly
EVJ = json.load(open(os.path.join(D, 'events.json'))); EV = EVJ['ev']; DUR = float(EVJ['dur'])
N = int(DUR * SR); tt = np.arange(N) / SR; rng = np.random.default_rng(7)
amb = np.zeros((N, 2)); fol = np.zeros((N, 2))
SC = [(e['t'], e['t'] + e['dur'], e['name']) for e in EV if e['type'] == 'scene']
def bed(a, b, x, gain, fade=.4):
    i0, i1 = int(a * SR), min(N, int(b * SR)); n = i1 - i0; y = x[:n] * gain
    env = np.minimum(1, np.minimum(np.arange(n) / (fade * SR), (n - np.arange(n)) / (fade * SR)))
    amb[i0:i1, 0] += y * env; amb[i0:i1, 1] += np.roll(y, 700) * env
def chirp(f0=3600, f1=5200, d=.1):
    x = t_(d); f = np.linspace(f0, f1, len(x)); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d) ** 2)
def gull(d=.5):
    x = t_(d); f = np.interp(x, [0, .08, .3, d], [1500, 2300, 1900, 1400]); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return norm(bp(tone * (1 + .4 * np.sin(2 * np.pi * 28 * x)), 900, 5000) * np.sin(np.pi * x / d) ** 1.5)
def murmur(d):
    x = noise(d); y = bp(x, 250, 1800) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 1.7 * t_(d))) * (.5 + .5 * np.sin(2 * np.pi * .23 * t_(d))))
    return norm(y)
for a, b, name in SC:
    d = b - a + .5
    if name in ('road', 'road2'):
        eng = lp(noise(d), 160) * .8 + np.sin(2 * np.pi * 48 * t_(d)) * .2 + bp(noise(d), 300, 1400) * .25
        bed(a, b, norm(eng), .16)
    elif name in ('cabin', 'cabin2'):
        bed(a, b, norm(lp(noise(d), 220) + np.sin(2 * np.pi * 42 * t_(d)) * .3), .09)
    elif name in ('jump', 'jump2'):
        add(fol, whoosh(1.4, 1.0), a + .2, .3, 0); add(fol, norm(bp(noise(.5), 800, 6000) * env_exp(.5, .12)), b - .35, .22, .2)
    elif name == 'granada':
        bed(a, b, murmur(d), .05); bed(a, b, norm(lp(noise(d), 500)), .03)
        for k in range(18): at = a + 1 + rng.random() * (b - a - 2); add(amb, chirp(), at, .025, rng.uniform(-.7, .7))
    elif name in ('map', 'map2'):
        add(fol, norm(bp(noise(.6), 900, 5000) * np.sin(np.pi * t_(.6) / .6) ** 2), a + .1, .14, 0)
    elif name == 'castile':
        bed(a, b, norm(lp(brown(d), 300) + bp(noise(d), 200, 900) * .1), .06); bed(a, b, murmur(d), .02)
    elif name == 'ferdinand':
        bed(a, b, murmur(d), .09)
        for k in range(5): add(fol, norm(bp(noise(1.2), 400, 3000) * np.sin(np.pi * t_(1.2) / 1.2)), a + 1 + k * 2.2, .1, rng.uniform(-.5, .5))
    elif name == 'lisbon':
        x = t_(d); w = norm(lp(noise(d), 700) * (.5 + .5 * np.sin(2 * np.pi * .18 * x) ** 2)); bed(a, b, w, .07)
        for k in range(7): add(amb, gull(), a + 1 + rng.random() * (b - a - 2), .04, rng.uniform(-.8, .8))
        for k in range(4): add(fol, creak(.5), a + 2 + k * 4, .08, .3)
    elif name == 'samarkand':
        bed(a, b, murmur(d), .035); bed(a, b, norm(bp(noise(d), 1500, 6000) * (.7 + .3 * np.sin(2 * np.pi * 3 * t_(d)))), .015)
score, sr = sf.read(os.path.join(D, 'music/score.wav'), always_2d=True)
if sr != SR: score = resample_poly(score, SR, sr, axis=0)
mus = np.zeros((N, 2)); n = min(N, len(score)); mus[:n] = score[:n]
out = mus * .75 + fol * .6 + amb
out[:, 0] = limit(out[:, 0], .95); out[:, 1] = limit(out[:, 1], .95)
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out/mix.wav'), out.astype(np.float32), SR)
print('mix.wav', round(len(out) / SR, 2), 's')
