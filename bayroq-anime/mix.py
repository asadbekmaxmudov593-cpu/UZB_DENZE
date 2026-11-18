"""mix.py · score + foley + ambience → out/mix.wav (62 s). Sync points from events.json (node core/render/events.mjs).
Foley (synthesised): CRT power-on thunk and whine, footsteps on paving, the rope squeaking through the pulley, the impact of the first ray,
a wind gust, cloth flutter once the flag opens, morning birds after sunrise. Room: pre-dawn courtyard air. Music ducks a little under key foley."""
import json, os, sys
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('LIB') or '/root/lemo-opuscar'
sys.path.insert(0, os.path.join(ROOT, 'core/audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, thump, whoosh, compress, limit, add
from scipy.signal import resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d

EV = json.load(open(os.path.join(D, 'events.json')))['ev']
DUR = 62.0; N = int(DUR * SR); tt = np.arange(N) / SR
rng = np.random.default_rng(18)
fol = np.zeros((N, 2)); amb = np.zeros((N, 2))
def evs(tp): return [e for e in EV if e['type'] == tp]

def crton():
    d = .9; x = t_(d)
    thunk = np.sin(2 * np.pi * 60 * x) * env_exp(d, .05) + lp(noise(d), 300) * env_exp(d, .03)
    whine = np.sin(2 * np.pi * (15600 + 200 * x) * x) * .08 * np.clip(x / .2, 0, 1) * env_exp(d, .5)
    static = bp(noise(d), 2000, 9000) * env_exp(d, .12) * .4
    return norm(thunk + whine + static)
def step():
    d = .09; x = t_(d); return norm(lp(noise(d), 900) * env_exp(d, .012) + np.sin(2 * np.pi * 110 * x) * env_exp(d, .02) * .5)
def squeak(v=1.0):
    d = .22; x = t_(d); f = 1800 + 600 * np.sin(np.pi * x / d)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + .4 * np.sin(2 * np.pi * 37 * x))
    rub = bp(noise(d), 900, 3500) * .5
    return norm((tone * .5 + rub) * np.sin(np.pi * x / d) ** 2) * v
def gust(d):
    x = t_(d); e = np.clip(x / .5, 0, 1) * np.exp(-np.maximum(0, x - .8) / 1.4)
    return norm((lp(noise(d), 600) + bp(noise(d), 800, 3000) * .35) * e)
def chirp():
    d = .1; x = t_(d); f = np.linspace(3600 + rng.random() * 800, 5200 + rng.random() * 900, len(x))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d) ** 2)

# ambience: still dawn air (low), a faint far city hum; birds after sunrise
air = lp(brown(DUR), 300) * .5 + bp(noise(DUR), 200, 1200) * .05
amb[:, 0] += air * .05; amb[:, 1] += air * .048
for e in EV:
    t, tp = e['t'], e['type']
    if tp == 'crton': add(fol, crton(), t, .35, 0)
    elif tp == 'step': add(fol, step(), t, .2, -.2 + .4 * (tt[min(int(t * SR), N - 1)] / 4))
    elif tp == 'squeak': add(fol, squeak(e.get('v', 1)), t, .1, .3)
    elif tp == 'impact': add(fol, thump(1.0, 55), t, .55, 0); add(fol, whoosh(.6, 1.0), t - .25, .3, 0)
    elif tp == 'gust': add(fol, gust(e['d']), t, .32, .1)
    elif tp == 'flutter':
        d = e['d']; x = t_(d); rate = 6.5 + 2 * np.sin(2 * np.pi * .3 * x)
        fl = bp(noise(d), 250, 2600) * np.maximum(0, np.sin(2 * np.pi * np.cumsum(rate) / SR)) ** 3 * np.clip(x / 1.2, 0, 1)
        add(fol, norm(fl), t, .12, .25)
    elif tp == 'birds':
        for k in range(26):
            at = t + rng.random() * (e['d'] - .5)
            for j in range(rng.integers(1, 4)): add(amb, chirp(), at + j * .13, .03 + .02 * rng.random(), rng.uniform(-.8, .8))

score, sr = sf.read(os.path.join(D, 'music/score.wav'), always_2d=True)
if sr != SR: score = resample_poly(score, SR, sr, axis=0)
mus = np.zeros((N, 2)); n = min(N, len(score)); mus[:n] = score[:n]
fe = uniform_filter1d(maximum_filter1d(np.abs(fol).max(1), int(.05 * SR)), int(.08 * SR))
mus *= (1 - .25 * np.clip(fe / (fe.max() + 1e-9) * 2.5, 0, 1))[:, None]
out = mus * .8 + fol * .6 + amb
out[:, 0] = limit(out[:, 0], .95); out[:, 1] = limit(out[:, 1], .95)
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out/mix.wav'), out.astype(np.float32), SR)
print('mix.wav', round(len(out) / SR, 2), 's')
