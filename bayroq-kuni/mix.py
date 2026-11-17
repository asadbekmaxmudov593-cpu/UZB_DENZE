"""mix.py · score + foley + ambience → out/mix.wav (60 s). Sync points from events.json (node core/render/events.mjs).
Foley by material: squeegee = rubber blade over nylon mesh (band-passed noise with a ~250 Hz mesh grain); ink = a wet low squelch;
screen = aluminium frame clack + hinge creak; cards = paper slides and taps; stars = paper ticks; date = paper stamps;
the snap = a wood-and-metal clamp. Ambience: print-shop room tone throughout; wind and flag cloth J-cut in before the pull-back.
Music ducks ~3 dB under the foley."""
import json, os, sys
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('LIB') or '/root/lemo-opuscar'
sys.path.insert(0, os.path.join(ROOT, 'core/audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, clack, creak, thump, whoosh, compress, limit, add
from scipy.ndimage import maximum_filter1d, uniform_filter1d

EV = json.load(open(os.path.join(D, 'events.json')))['ev']
DUR = 60.0
N = int(DUR * SR)
rng = np.random.default_rng(19)
amb = np.zeros((N, 2)); fol = np.zeros((N, 2))
tt = np.arange(N) / SR
def evs(tp): return [e for e in EV if e['type'] == tp]

def scrape(d, bright=1.0, heavy=0.0):
    n = noise(d); x_t = t_(d)
    grain = .65 + .35 * np.abs(np.sin(2 * np.pi * (230 + 50 * bright) * x_t + rng.random() * 6)) ** 2
    x = bp(n, 700 * bright, min(9000, 5200 * bright), 2) * grain + lp(noise(d), 380) * (.5 + heavy) * .6
    e = np.minimum(1, x_t / .03) * np.minimum(1, (d - x_t) / .06) * (1 - .25 * x_t / d)
    return norm(x * e)
def squelch(f=140):
    d = .16; x_t = t_(d)
    return norm(np.sin(2 * np.pi * f * x_t * (1 - .9 * x_t)) * env_exp(d, .05) + lp(noise(d), 900) * env_exp(d, .03) * .5)
def tick(f=3200):
    d = .03; x_t = t_(d)
    return norm(hp(noise(d), 2500) * env_exp(d, .003) + np.sin(2 * np.pi * f * x_t) * env_exp(d, .004) * .4)
def stamp():
    d = .14; x_t = t_(d)
    return norm(lp(noise(d), 1200) * env_exp(d, .012) + np.sin(2 * np.pi * 160 * x_t) * env_exp(d, .03) * .7 + bp(noise(d), 2500, 6000) * env_exp(d, .006) * .4)
def paper_slide(d=.38):
    x_t = t_(d); e = np.sin(np.pi * np.clip(x_t / d, 0, 1)) ** 1.5
    return norm(bp(noise(d), 900, 5000) * e * (.6 + .4 * np.sin(2 * np.pi * 31 * x_t) ** 2))
def tap():
    d = .06; return norm(bp(noise(d), 400, 3000) * env_exp(d, .01))

# ---------------- ambience ----------------
room = lp(brown(DUR), 240) * .5 + bp(noise(DUR), 150, 900) * .07
amb[:, 0] += room * .05; amb[:, 1] += room * .048
w0 = evs('wind')[0]['t']; wave0 = evs('wave')[0]['t']
wind = (lp(noise(DUR), 700) * .7 + bp(noise(DUR), 1200, 4500) * .1) * (.55 + .45 * np.sin(2 * np.pi * .17 * tt + .4) ** 2)
wenv = np.clip((tt - w0) / 1.2, 0, 1) * np.clip((DUR - tt) / .8, 0, 1)
amb[:, 0] += wind * wenv * .06; amb[:, 1] += np.roll(wind, 1200) * wenv * .06
# flag cloth: noise chopped at a flapping rate, after the prints wake up
flap_rate = 7 + 2 * np.sin(2 * np.pi * .3 * tt)
flap = bp(noise(DUR), 300, 2600) * (np.maximum(0, np.sin(2 * np.pi * np.cumsum(flap_rate) / SR)) ** 3)
fenv = np.clip((tt - wave0) / 1.5, 0, 1) * np.clip((DUR - tt) / .8, 0, 1)
amb[:, 0] += flap * fenv * .05; amb[:, 1] += np.roll(flap, 700) * fenv * .045

# ---------------- foley from the event list ----------------
for e in EV:
    t, tp = e['t'], e['type']
    if tp == 'clack':
        add(fol, clack(.9, 1.0), t, .5 if e.get('first') else .7, .05); add(fol, thump(.6, 90), t, .35, 0)
    elif tp == 'pull':
        d = e['dur']; br = 1.25 if d < 1.0 else 1.0
        add(fol, scrape(d, br), t, .42, -.1); add(fol, squelch(150), t, .25, -.1); add(fol, squelch(120), t + d - .05, .2, .1)
    elif tp == 'lift':
        add(fol, creak(.6), t, .22, .2); add(fol, whoosh(.4, .6), t + .05, .12, .1)
    elif tp == 'card':
        add(fol, paper_slide(.38), t, .26, .3); add(fol, tap(), t + .38, .3, .1)
    elif tp == 'print':
        add(fol, scrape(.22, 1.6), t, .16, .15); add(fol, stamp(), t + .2, .12, .1)
    elif tp == 'tick':
        add(fol, tick(3000 + 60 * e['n']), t, .28, -.3 + .05 * e['n'])
    elif tp == 'stamp':
        add(fol, stamp(), t, .5, -.05 + .1 * e['i']); add(fol, scrape(.2, 1.4), t, .14, 0)
    elif tp == 'drift':
        add(fol, whoosh(e['dur'], .5), t, .12, 0); add(fol, creak(.4), t + .5, .14, -.3)
    elif tp == 'silence':
        add(fol, creak(.35), t + .5, .1, .3)                                  # paper creaks in the quiet
    elif tp == 'snap':
        add(fol, clack(.7, 1.0), t, 1.0, 0); add(fol, thump(1.0, 70), t, .8, 0); add(fol, clack(1.3, .7), t + .012, .4, .1)
    elif tp == 'stack_out':
        add(fol, paper_slide(.5), t, .3, -.2)
    elif tp == 'pullback':
        add(fol, whoosh(e['dur'] * .6, .4), t, .14, 0)

# ---------------- the score, ducked under the foley ----------------
score, sr = sf.read(os.path.join(D, 'music/score.wav'), always_2d=True)
assert sr == SR
mus = np.zeros((N, 2)); n = min(N, len(score)); mus[:n] = score[:n]
fe = uniform_filter1d(maximum_filter1d(np.abs(fol).max(1), int(.05 * SR)), int(.08 * SR))
duck = 1 - .3 * np.clip(fe / (fe.max() + 1e-9) * 2.2, 0, 1)
mus *= duck[:, None]

out = mus * .78 + fol * .62 + amb
out[:, 0] = compress(out[:, 0], .5, 2.0); out[:, 1] = compress(out[:, 1], .5, 2.0)
out[:, 0] = limit(out[:, 0], .9); out[:, 1] = limit(out[:, 1], .9)
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out/mix.wav'), out.astype(np.float32), SR)
print('mix.wav', round(len(out) / SR, 2), 's')
