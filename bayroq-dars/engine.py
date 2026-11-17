"""Classroom lesson video engine: room + chalkboard + shaded schoolboy, synced to a voice track.
Usage:
  python engine.py segments voice.mp3            # print speech chunks (to choose scene BOUNDS)
  python engine.py stills lesson.py [t]          # one PNG per scene (default: near scene end)
  python engine.py render lesson.py out.mp4 [voice.mp3]
"""
import sys, os, math, random, subprocess, re, importlib.util
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
W, H, FPS = 1920, 1080, 30
SERIF_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_fc = {}
def F(p, s):
    if (p, s) not in _fc: _fc[(p, s)] = ImageFont.truetype(p, s)
    return _fc[(p, s)]

CHALK = (240, 238, 228); YELLOW = (246, 214, 120); DIM = (190, 200, 190)
ORANGE = (232, 170, 92); BLUE = (120, 190, 214); GREEN = (150, 210, 140); PINK = (230, 150, 170)
BX0, BY0, BX1, BY1 = 650, 90, 1860, 820          # chalkboard inner area (1210 x 730)
BCX = (BX0 + BX1) // 2

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease(x): x = clamp(x); return 1 - (1 - x) ** 3
def smooth(x): x = clamp(x); return x * x * (3 - 2 * x)
def prog(t, s, d=0.6): return ease((t - s) / d)

# ---------------- room + board ----------------
def make_room():
    random.seed(4)
    img = Image.new("RGB", (W, H), (228, 216, 192)); d = ImageDraw.Draw(img)
    for y in range(0, 900):
        k = y / 900; d.line([(0, y), (W, y)], fill=(int(236 - 16 * k), int(224 - 16 * k), int(200 - 14 * k)))
    d.rectangle([70, 110, 560, 600], fill=(250, 248, 238))
    for i in range(6): d.rectangle([70 + i, 110 + i, 560 - i, 600 - i], outline=(196, 170, 130))
    sky = Image.new("RGB", (470, 470)); sd = ImageDraw.Draw(sky)
    for y in range(470): sd.line([(0, y), (470, y)], fill=(int(150 + 60 * y / 470), int(200 + 35 * y / 470), 245))
    img.paste(sky, (80, 120))
    d.rectangle([311, 120, 319, 590], fill=(196, 170, 130)); d.rectangle([80, 351, 550, 359], fill=(196, 170, 130))
    glow = Image.new("L", (W, H), 0); ImageDraw.Draw(glow).ellipse([-200, 0, 900, 1000], fill=60)
    img = Image.composite(Image.new("RGB", (W, H), (255, 246, 220)), img, glow.filter(ImageFilter.GaussianBlur(120)))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 880, W, 960], fill=(176, 138, 98)); d.line([(0, 880), (W, 880)], fill=(140, 104, 70), width=6)
    for y in range(960, H):
        k = (y - 960) / 120; d.line([(0, y), (W, y)], fill=(int(156 - 30 * k), int(110 - 22 * k), int(70 - 14 * k)))
    for x in range(-400, W + 400, 160):
        d.line([(x, 960), (x - 300 + (x - W / 2) * 0.25, H)], fill=(120, 82, 50), width=3)
    sh = Image.new("L", (W, H), 0); ImageDraw.Draw(sh).rectangle([BX0 - 10, BY0 + 6, BX1 + 30, BY1 + 40], fill=110)
    img = Image.composite(Image.new("RGB", (W, H), (120, 100, 75)), img, sh.filter(ImageFilter.GaussianBlur(18)))
    board = Image.new("RGB", (BX1 - BX0, BY1 - BY0), (34, 62, 48)); bw, bh = board.size
    sm = Image.new("L", board.size, 0); dd = ImageDraw.Draw(sm)
    for _ in range(40):
        x, y, r = random.randint(0, bw), random.randint(0, bh), random.randint(60, 260)
        dd.ellipse([x - r, y - r // 2, x + r, y + r // 2], fill=random.randint(6, 18))
    board = Image.composite(Image.new("RGB", board.size, (70, 98, 84)), board, sm.filter(ImageFilter.GaussianBlur(50)))
    img.paste(board, (BX0, BY0)); d = ImageDraw.Draw(img); fw = 22
    for i in range(fw): d.rectangle([BX0 - fw + i, BY0 - fw + i, BX1 + fw - i, BY1 + fw - i], outline=(122 - i, 80 - i // 2, 44 - i // 3))
    d.rectangle([BX0 - 30, BY1 + fw - 4, BX1 + 30, BY1 + fw + 14], fill=(98, 64, 34))
    d.rounded_rectangle([1600, BY1 + fw - 14, 1680, BY1 + fw - 2], 5, fill=(245, 245, 240))
    d.rounded_rectangle([1700, BY1 + fw - 12, 1750, BY1 + fw - 2], 5, fill=YELLOW)
    return img.convert("RGBA")
ROOM = make_room()

# ---------------- chalkboard drawing helpers (a = 0..1 appear amount) ----------------
def text_c(d, y, s, font, fill, a=1.0, cx=BCX):
    if a <= 0: return
    w = d.textlength(s, font=font)
    d.text((cx - w / 2, y + (1 - a) * 30), s, font=font, fill=fill + (int(255 * a),))

def fit(d, s, path, size, maxw=BX1 - BX0 - 80):
    """largest font <= size whose text fits maxw"""
    while size > 20 and d.textlength(s, font=F(path, size)) > maxw: size -= 2
    return F(path, size)

def wrap(d, s, font, maxw):
    lines, cur = [], ""
    for w in s.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def two_color(d, y, s_a, s_b, font, ca, cb, a, b):
    wa, wb = d.textlength(s_a, font=font), d.textlength(s_b, font=font); x = BCX - (wa + wb) / 2
    if a > 0: d.text((x, y + (1 - a) * 30), s_a, font=font, fill=ca + (int(255 * a),))
    if b > 0: d.text((x + wa, y + (1 - b) * 30), s_b, font=font, fill=cb + (int(255 * b),))

def pill(d, y, s, font, col, a, filled=False, cx=BCX):
    if a <= 0: return
    w = d.textlength(s, font=font); x = cx - w / 2; y += (1 - a) * 30
    bb = d.textbbox((x, y), s, font=font); box = [bb[0] - 34, bb[1] - 18, bb[2] + 34, bb[3] + 18]
    if filled:
        d.rounded_rectangle(box, 12, fill=col + (int(235 * a),)); d.text((x, y), s, font=font, fill=(34, 62, 48, int(255 * a)))
    else:
        d.rounded_rectangle(box, 40, outline=col + (int(255 * a),), width=4); d.text((x, y), s, font=font, fill=col + (int(255 * a),))

def underline(d, y, t, start, half=380):
    k = prog(t, start, 0.8)
    if k > 0: d.line([(BCX - half, y), (BCX - half + 2 * half * k, y - 3)], fill=CHALK + (200,), width=5)

def card(d, x, y, w, h, col, title, items, a, its):
    """bordered card with title and check-marked items; its[i] = appear amount of item i"""
    if a <= 0: return
    y += (1 - a) * 40; A = int(255 * a)
    d.rounded_rectangle([x, y, x + w, y + h], 26, fill=col + (int(40 * a),), outline=col + (A,), width=4)
    f = fit(d, title, SANS_B, 36, w - 40); tw = d.textlength(title, font=f)
    d.text((x + (w - tw) / 2, y + 30), title, font=f, fill=col + (A,))
    d.line([(x + 40, y + 98), (x + w - 40, y + 98)], fill=col + (int(160 * a),), width=3)
    fi = F(SANS, 36); yy = y + 135
    for i, txt in enumerate(items):
        ia = clamp(its[i]) * a; lines = wrap(d, txt, fi, w - 120)
        if ia > 0:
            d.text((x + 38, yy + (1 - ia) * 16), "✓", font=F(SANS_B, 38), fill=col + (int(255 * ia),))
            for j, ln in enumerate(lines):
                d.text((x + 90, yy + j * 46 + (1 - ia) * 16), ln, font=fi, fill=CHALK + (int(255 * ia),))
        yy += 46 * len(lines) + 34

def bullets(d, y, items, t, start, step=0.8, col=YELLOW, size=46):
    """vertical list, item i appears at start + i*step"""
    fi = F(SANS, size)
    for i, txt in enumerate(items):
        a = prog(t, start + i * step)
        if a <= 0: continue
        yy = y + i * (size + 34) + (1 - a) * 20
        d.ellipse([BX0 + 90, yy + size * 0.35, BX0 + 90 + size * 0.4, yy + size * 0.75], fill=col + (int(255 * a),))
        d.text((BX0 + 150, yy), txt, font=fi, fill=CHALK + (int(255 * a),))

# ---------------- audio ----------------
def speech_segments(path, noise="-35dB", mind=0.25):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", f"silencedetect=noise={noise}:d={mind}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                               capture_output=True, text=True).stdout)
    ss = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    se = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    segs, cur = [], 0.0
    for a, b in zip(ss, se + [dur] * (len(ss) - len(se))):
        if a > cur + 0.05: segs.append((round(cur, 2), round(a, 2), round(b - a, 2)))
        cur = b
    if cur < dur - 0.1: segs.append((round(cur, 2), round(dur, 2), 0))
    return segs, dur

def mouth_curve(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    hop = 16000 // FPS; n = len(a) // hop
    rms = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    ref = np.percentile(rms[rms > 0.01], 90) if (rms > 0.01).any() else 0.1
    o = np.clip((rms - 0.012) / max(ref - 0.012, 1e-3), 0, 1)
    return np.convolve(o, [0.25, 0.5, 0.25], mode="same")

# ---------------- boy motion ----------------
class Motion:
    def __init__(self, starts, total, mouth=None):
        self.s, self.T, self.m = starts, total, mouth
    def per(self, gt, k): return math.sin(2 * math.pi * k * gt / self.T)     # loops seamlessly
    def talk(self, gt):
        if self.m is not None:
            i = int(round(gt * FPS)); return float(self.m[i]) if 0 <= i < len(self.m) else 0.0
        v = clamp(0.55 * math.sin(gt * 13) + 0.45 * math.sin(gt * 21.7 + 1.3))   # no voice: fake talking
        return v * (0.4 + 0.6 * (0.5 + 0.5 * math.sin(gt * 2.1))) * (0.3 < gt < self.T - 0.8)
    def arms(self, gt):
        s, T = self.s, self.T
        p1 = s[1] if len(s) > 1 else 3.0
        point = smooth((gt - (p1 - 0.05)) / 0.7) * (1 - smooth((gt - (s[-1] - 0.5)) / 0.5))
        wave = smooth((gt - (s[-1] - 0.2)) / 0.5) * (1 - smooth((gt - (T - 1.0)) / 0.8)) \
             + smooth((gt - 0.2) / 0.5) * (1 - smooth((gt - 2.4) / 0.6))
        wave = clamp(wave)
        rest = (80, 88); pnt = (-40 + self.per(gt, 12) * 3, -46 + self.per(gt, 12) * 4)
        wv = (-10, -100 + 28 * math.sin(gt * 9))
        a1 = rest[0] + (pnt[0] - rest[0]) * point; a2 = rest[1] + (pnt[1] - rest[1]) * point
        a1 += (wv[0] - a1) * wave; a2 += (wv[1] - a2) * wave
        return point, wave, (a1, a2)

# ---------------- render ----------------
def load_lesson(path):
    spec = importlib.util.spec_from_file_location("lesson", path); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m); return m

def plan(lesson):
    b = lesson.BOUNDS
    fr = [int(round(x * FPS)) for x in b]
    starts = [f / FPS for f in fr[:-1]]; nfr = [fr[i + 1] - fr[i] for i in range(len(fr) - 1)]
    return starts, nfr, fr[-1] / FPS

_G = {}
def frame(i, k):
    import boy
    L, mo, starts, nfr = _G["L"], _G["mo"], _G["starts"], _G["nfr"]
    fn = L.SCENES[i]; t = k / FPS; dur = nfr[i] / FPS; gt = starts[i] + t
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); fn(ImageDraw.Draw(layer), t)
    fade = min(clamp(t / 0.35), clamp((dur - t) / 0.35))
    if fade < 1: layer.putalpha(layer.getchannel("A").point(lambda v: int(v * fade)))
    img = ROOM.copy(); img.alpha_composite(layer)
    point, wave, ar = mo.arms(gt)
    blink = ((gt + 0.7) % 4.0) < 0.13
    boy.composite(img, gt, point, wave, mo.talk(gt), blink, mo.per(gt, 17) * 2.5, (100 + mo.per(gt, 17) * 2, 93), ar)
    return img.convert("RGB")

def _render_scene(args):
    i, tmpdir = args
    n = _G["nfr"][i]; tmp = f"{tmpdir}/s{i:02d}.part.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                          "-pix_fmt", "yuv420p", "-f", "mp4", tmp], stdin=subprocess.PIPE)
    for k in range(n): p.stdin.write(frame(i, k).tobytes())
    p.stdin.close()
    if p.wait() != 0: raise RuntimeError(f"scene {i} failed")
    os.replace(tmp, f"{tmpdir}/s{i:02d}.mp4")

def setup(lesson_path, voice=None):
    L = load_lesson(lesson_path); starts, nfr, total = plan(L)
    _G.update(L=L, starts=starts, nfr=nfr, mo=Motion(starts, total, mouth_curve(voice) if voice else None))
    return L, starts, nfr, total

def render(lesson_path, out, voice=None):
    L, starts, nfr, total = setup(lesson_path, voice)
    tmpdir = os.path.splitext(out)[0] + "_parts"; os.makedirs(tmpdir, exist_ok=True)
    with Pool(min(len(nfr), os.cpu_count() or 2)) as pool:
        pool.map(_render_scene, [(i, tmpdir) for i in range(len(nfr))])
    lst = f"{tmpdir}/list.txt"
    open(lst, "w").write("".join(f"file 's{i:02d}.mp4'\n" for i in range(len(nfr))))
    silent = f"{tmpdir}/silent.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    tmp_out = out + ".part.mp4"
    if voice:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", voice, "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", "apad", "-t", f"{total:.3f}",
                        "-movflags", "+faststart", tmp_out], check=True)
    else:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-c", "copy", "-movflags", "+faststart", tmp_out], check=True)
    os.replace(tmp_out, out)
    print(f"done: {out}  ({total:.2f}s, {len(nfr)} scenes)")

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "segments":
        segs, dur = speech_segments(sys.argv[2])
        print(f"duration {dur:.2f}s\n#  start   end    pause_after")
        for j, (a, b, p) in enumerate(segs): print(f"{j:<3}{a:6.2f} {b:6.2f}   {p:.2f}")
    elif cmd == "stills":
        L, starts, nfr, total = setup(sys.argv[2], sys.argv[4] if len(sys.argv) > 4 else None)
        os.makedirs("stills", exist_ok=True)
        for i in range(len(nfr)):
            t = float(sys.argv[3]) if len(sys.argv) > 3 else nfr[i] / FPS - 0.6
            frame(i, int(min(t, nfr[i] / FPS - 0.1) * FPS)).save(f"stills/scene{i + 1}.png")
        print("stills/ written")
    elif cmd == "render":
        render(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
