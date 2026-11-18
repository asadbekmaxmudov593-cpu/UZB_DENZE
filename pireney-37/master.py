"""master.py · loudness to −14 LUFS and a true peak ≤ −1 dBTP after AAC (limited to −1.7 before encoding), then mux (stands in for core/render/mux.sh where only ffmpeg 6 exists; CRT detail: grain 2, CRF 23).
  python master.py out/video.mp4 out/mix.wav bayroq-kuni.mp4 [fps=24] [grain=1]
Loudness is measured with ffmpeg's ebur128 filter (reliable in 6.x); the gain and a 4× oversampled peak limiter are applied here in numpy,
so ffmpeg's loudnorm (whose 6.x length reporting the library's mux.sh refuses) is never used."""
import re, subprocess, sys, os
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d

V, A, O = sys.argv[1:4]
FPS = sys.argv[4] if len(sys.argv) > 4 else '24'
GR = sys.argv[5] if len(sys.argv) > 5 else '1'
TARGET, CEIL_DB = -14.0, -1.7

def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)[-1]); tp = float(re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', r.stderr)[-1])
    return I, tp

x, sr = sf.read(A, always_2d=True)
I0, _ = lufs(A)
y = x * 10 ** ((TARGET - I0) / 20)
ceil = 10 ** (CEIL_DB / 20)
for _ in range(3):                                   # true-peak limiter: detect on 4× oversampled audio, smooth gain, apply
    up = np.abs(resample_poly(y, 4, 1, axis=0)).max(1)
    pk = maximum_filter1d(up.reshape(-1, 4).max(1)[:len(y)], int(.004 * sr) * 2 + 1)
    g = np.minimum(1, ceil / np.maximum(pk, 1e-9))
    g = np.minimum(g, uniform_filter1d(g, int(.003 * sr)))
    g = uniform_filter1d(g, int(.002 * sr))
    y = y * g[:, None]
    if np.abs(resample_poly(y, 4, 1, axis=0)).max() <= ceil * 1.001: break
tmpw = os.path.splitext(O)[0] + '.master.wav'
sf.write(tmpw, y.astype(np.float32), sr, subtype='FLOAT')
I1, tp1 = lufs(tmpw)
print(f'mix {I0:.1f} LUFS → {I1:.1f} LUFS, true peak {tp1:.1f} dBTP')

vf = f'fps={FPS},' + (f'noise=c0s={GR}:allf=t,' if GR != '0' else '') + 'format=yuv420p'
tmp = O + '.part.mp4'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', V, '-i', tmpw, '-filter_complex', f'[0:v]{vf}[v];[1:a]aresample=48000[a]',
                '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-r', FPS,
                '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', tmp], check=True)
os.replace(tmp, O); os.remove(tmpw)
I2, tp2 = lufs(O)
print(f'{O}: {I2:.1f} LUFS, true peak {tp2:.1f} dBTP')
