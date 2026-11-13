"""Draw a chalkboard map of the Chagatai Ulus split (XIV c.): Movarounnahr vs Mo'g'uliston.

Usage:  python3 chigatoy_video/make_map.py   ->  chigatoy_video/map_blackboard.png
Only needs Pillow. Borders are approximate (school-level illustration).
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1200
OUT = Path(__file__).with_name("map_blackboard.png")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

LON0, LON1, LAT0, LAT1 = 49.0, 93.0, 34.5, 50.5
MX, MY, MW, MH = 90, 250, W - 180, H - 330  # map box

random.seed(7)
CHALK = (236, 238, 230)
YELLOW = (244, 222, 120)
ORANGE = (245, 170, 110)
BLUE = (150, 200, 240)
PINK = (240, 160, 180)


def xy(lon, lat):
    k = math.cos(math.radians(42))
    sx = MW / ((LON1 - LON0) * k)
    sy = MH / (LAT1 - LAT0)
    s = min(sx, sy)
    ox = MX + (MW - (LON1 - LON0) * k * s) / 2
    return ox + (lon - LON0) * k * s, MY + (LAT1 - lat) * s


def font(size, bold=True):
    return ImageFont.truetype(FONT if bold else FONT_REG, size)


def chalk_line(d, pts, color, width=4, dashed=False):
    pts = [xy(*p) for p in pts]
    for i in range(len(pts) - 1):
        (x1, y1), (x2, y2) = pts[i], pts[i + 1]
        steps = max(2, int(math.hypot(x2 - x1, y2 - y1) / 6))
        for s in range(steps):
            if dashed and (s // 3) % 2:
                continue
            a, b = s / steps, (s + 1) / steps
            j = lambda: random.uniform(-1.2, 1.2)
            d.line([(x1 + (x2 - x1) * a + j(), y1 + (y2 - y1) * a + j()),
                    (x1 + (x2 - x1) * b + j(), y1 + (y2 - y1) * b + j())],
                   fill=color + (random.randint(170, 240),), width=width)


def chalk_poly(d, pts, color, width=4, fill_alpha=0):
    if fill_alpha:
        d.polygon([xy(*p) for p in pts], fill=color + (fill_alpha,))
    chalk_line(d, pts + [pts[0]], color, width)


def label(d, lon, lat, text, size, color=CHALK, anchor="mm", bold=True):
    d.text(xy(lon, lat), text, font=font(size, bold), fill=color + (235,), anchor=anchor)


def city(d, lon, lat, name, dx=10, dy=0, anchor="lm"):
    x, y = xy(lon, lat)
    d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=CHALK + (235,))
    d.text((x + dx, y + dy), name, font=font(30, bold=False), fill=CHALK + (235,), anchor=anchor)


def main():
    # blackboard with smudges
    img = Image.new("RGB", (W, H), (38, 66, 52))
    noise = Image.effect_noise((W, H), 22).convert("L")
    img = Image.composite(Image.new("RGB", (W, H), (48, 80, 64)), img, noise.point(lambda v: v // 3))
    smudge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(smudge)
    for _ in range(40):
        x, y, r = random.randint(0, W), random.randint(0, H), random.randint(80, 300)
        sd.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, random.randint(4, 10)))
    img = Image.alpha_composite(img.convert("RGBA"), smudge.filter(ImageFilter.GaussianBlur(40)))

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # regions (approximate)
    movarounnahr = [(59.5, 43.3), (63.0, 44.3), (67.0, 44.0), (70.5, 43.6), (72.0, 42.2),
                    (73.2, 40.4), (72.6, 38.6), (71.0, 37.2), (68.5, 36.9), (66.0, 37.3),
                    (63.5, 38.2), (61.6, 39.6), (60.4, 41.4)]
    moguliston = [(70.5, 43.6), (71.5, 46.5), (74.5, 48.5), (79.5, 49.5), (85.5, 48.6),
                  (89.5, 46.0), (90.5, 43.0), (88.0, 41.6), (84.0, 40.8), (80.0, 39.0),
                  (77.5, 37.3), (75.0, 37.6), (73.2, 40.4), (72.0, 42.2)]
    chalk_poly(d, movarounnahr, YELLOW, 4, fill_alpha=42)
    chalk_poly(d, moguliston, BLUE, 4, fill_alpha=38)

    # seas & lakes
    caspian = [(50.2, 46.6), (52.8, 46.8), (53.2, 45.2), (51.4, 44.4), (52.8, 42.0), (53.9, 40.6),
               (53.9, 38.4), (53.2, 37.2), (51.0, 36.8), (49.4, 37.6), (49.9, 40.2), (48.6, 41.8),
               (47.6, 43.4), (49.0, 45.6)]
    aral = [(58.4, 45.9), (60.4, 46.4), (61.6, 45.6), (61.0, 44.2), (59.8, 43.5), (58.6, 44.2)]
    balkhash = [(73.6, 46.4), (75.5, 46.7), (77.5, 46.4), (79.2, 46.5), (79.0, 46.0),
                (77.0, 45.9), (75.0, 46.0), (73.8, 45.9)]
    issykkul = [(76.2, 42.5), (77.2, 42.85), (78.3, 42.6), (77.4, 42.2)]
    for poly in (caspian, aral, balkhash, issykkul):
        chalk_poly(d, poly, BLUE, 3, fill_alpha=70)

    # rivers
    chalk_line(d, [(68.4, 37.0), (67.3, 37.2), (65.2, 38.3), (63.6, 39.2), (62.0, 40.5),
                   (60.8, 41.9), (59.9, 43.4)], BLUE, 3)                       # Amudaryo
    chalk_line(d, [(72.6, 40.8), (71.0, 40.9), (69.6, 40.3), (68.8, 41.2), (68.2, 42.6),
                   (66.4, 44.2), (64.2, 44.9), (61.8, 46.0)], BLUE, 3)         # Sirdaryo
    chalk_line(d, [(80.5, 44.0), (78.5, 44.2), (77.0, 44.6), (76.0, 45.6)], BLUE, 3)  # Ili

    # dividing line
    chalk_line(d, [(70.5, 43.6), (72.0, 42.2), (73.2, 40.4), (72.6, 38.6), (71.8, 36.2)],
               PINK, 7, dashed=True)

    # labels
    label(d, 65.0, 42.7, "MOVAROUNNAHR", 46, YELLOW)
    label(d, 84.0, 46.0, "MO'G'ULISTON", 46, BLUE)
    label(d, 84.0, 45.15, "(Yettisuv, Sharqiy Turkiston)", 24, BLUE, bold=False)
    label(d, 52.2, 41.9, "Kaspiy", 26, BLUE, bold=False)
    label(d, 52.2, 41.3, "dengizi", 26, BLUE, bold=False)
    label(d, 60.1, 47.0, "Orol", 26, BLUE, bold=False)
    label(d, 76.4, 47.4, "Balxash", 26, BLUE, bold=False)
    label(d, 77.3, 41.7, "Issiqko'l", 24, BLUE, bold=False)
    label(d, 60.2, 39.2, "Amudaryo", 24, BLUE, bold=False)
    label(d, 66.0, 45.0, "Sirdaryo", 24, BLUE, bold=False)
    label(d, 60.8, 36.4, "g'arb: o'troq aholi, Islom", 28, YELLOW, bold=False)
    label(d, 84.6, 38.0, "sharq: ko'chmanchilar, eski tartib", 28, BLUE, bold=False)

    city(d, 66.96, 39.65, "Samarqand", dx=12, dy=-14)
    city(d, 64.42, 39.77, "Buxoro", dx=-12, dy=-14, anchor="rm")
    city(d, 65.80, 38.86, "Qarshi", dx=12, dy=6)
    city(d, 67.28, 37.22, "Termiz", dx=0, dy=12, anchor="mt")
    city(d, 69.24, 41.30, "Toshkent", dx=-12, anchor="rm")
    city(d, 80.90, 43.95, "Olmaliq", dx=12, dy=14)
    city(d, 75.99, 39.47, "Qashqar", dx=12)

    # 1348 marker
    x, y = xy(84.6, 36.6)
    d.text((x, y), "1348: Tug'luq Temur xon", font=font(34), fill=ORANGE + (240,), anchor="mm")
    d.text((x, y + 42), "Mo'g'uliston alohida davlat", font=font(28, bold=False),
           fill=ORANGE + (230,), anchor="mm")
    d.text((MX + MW, H - 52), "chegaralar taxminiy", font=font(24, bold=False),
           fill=CHALK + (160,), anchor="rm")

    # title
    d.text((W / 2, 70), "CHIG'ATOY ULUSINING BO'LINISHI", font=font(66), fill=CHALK + (245,), anchor="mm")
    d.text((W / 2, 140), "XIV asr o'rtalari", font=font(40, bold=False), fill=YELLOW + (235,), anchor="mm")
    d.line([(W * 0.25, 180), (W * 0.75, 180)], fill=CHALK + (120,), width=2)

    # wooden frame
    img = Image.alpha_composite(img, layer.filter(ImageFilter.GaussianBlur(0.6)))
    fr = ImageDraw.Draw(img)
    for i, c in enumerate([(92, 60, 34), (120, 82, 48), (100, 68, 40)]):
        fr.rectangle([i * 8, i * 8, W - 1 - i * 8, H - 1 - i * 8], outline=c + (255,), width=8)
    img.convert("RGB").save(OUT, optimize=True)
    print(f"saved {OUT}")


if __name__ == "__main__":
    main()
