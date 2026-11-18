from engine import *

# 18-noyabr — Davlat bayrog'i kuni. No voice yet: scene lengths from (words ÷ 2.2) + 1 s.
# Once the voice arrives: `python engine.py segments voice.mp3`, then move each boundary into a pause.
BOUNDS = [0, 5.5, 11.5, 18.0, 31.5, 41.0, 47.5]

# chalk versions of the flag colours
CB = (92, 172, 214); CG = (126, 198, 120); CR = (226, 100, 100); CW = CHALK

def star_pts(cx, cy, R):
    r = R * 0.381966
    return [(cx + math.cos(-math.pi / 2 + k * math.pi / 5) * (R if k % 2 == 0 else r),
             cy + math.sin(-math.pi / 2 + k * math.pi / 5) * (R if k % 2 == 0 else r)) for k in range(10)]

# 12 stars in the 500×250 flag construction: rows of 3 / 4 / 5, right-aligned
STARS = [(136, 16), (160, 16), (184, 16), (112, 40), (136, 40), (160, 40), (184, 40), (88, 64), (112, 64), (136, 64), (160, 64), (184, 64)]

def chalk_flag(d, x, y, w, a_blue=1, a_white=1, a_green=1, a_red=1, n_stars=12, a_moon=1):
    """flag drawn in chalk colours, 2:1, top-left (x, y), width w; each part has its own appear amount"""
    s = w / 500; A = lambda v: int(255 * clamp(v))
    if a_blue > 0: d.rectangle([x, y, x + w, y + 80 * s], fill=CB + (A(a_blue),))
    if a_white > 0:
        d.rectangle([x, y + 85 * s, x + w, y + 165 * s], fill=CW + (A(a_white * .92),))
    if a_green > 0: d.rectangle([x, y + 170 * s, x + w, y + 250 * s], fill=CG + (A(a_green),))
    if a_red > 0:
        d.rectangle([x, y + 80 * s, x + w, y + 85 * s], fill=CR + (A(a_red),))
        d.rectangle([x, y + 165 * s, x + w, y + 170 * s], fill=CR + (A(a_red),))
    if a_moon > 0 and a_blue > 0:
        d.ellipse([x + 40 * s, y + 10 * s, x + 100 * s, y + 70 * s], fill=CW + (A(a_moon * a_blue),))
        d.ellipse([x + 50 * s, y + 10 * s, x + 110 * s, y + 70 * s], fill=CB + (255,))
    for k, (sx, sy) in enumerate(STARS[:n_stars]):
        if a_blue > 0: d.polygon(star_pts(x + sx * s, y + sy * s, 6.5 * s), fill=CW + (A(a_blue),))
    d.rectangle([x, y, x + w, y + 250 * s], outline=CHALK + (int(120 * clamp(max(a_blue, a_green))),), width=3)

def chip_card(d, x, y, w, h, col, word, meaning, a, white=False):
    if a <= 0: return
    y += (1 - a) * 30; A = int(255 * a)
    d.rounded_rectangle([x, y, x + w, y + h], 22, fill=col + (int(34 * a),), outline=col + (A,), width=4)
    cs = h - 50
    if white: d.rounded_rectangle([x + 25, y + 25, x + 25 + cs, y + 25 + cs], 10, outline=CHALK + (A,), width=4)
    else: d.rounded_rectangle([x + 25, y + 25, x + 25 + cs, y + 25 + cs], 10, fill=col + (A,))
    tx = x + 25 + cs + 28
    d.text((tx, y + 16), word, font=F(SANS_B, 42), fill=col + (A,))
    fm = F(SANS, 31)
    for j, ln in enumerate(wrap(d, meaning, fm, x + w - tx - 18)[:2]):
        d.text((tx, y + 70 + j * 38), ln, font=fm, fill=CHALK + (A,))

def s1(d, t):   # "Assalomu alaykum! Men Asadbek, 54-maktabning 8-E sinfida oʻqiyman."
    text_c(d, 200, "Assalomu alaykum!", F(SERIF_B, 104), YELLOW, prog(t, 0.2))
    underline(d, 345, t, 1.2, 440)
    text_c(d, 420, "Men Asadbek", F(SANS_B, 76), CHALK, prog(t, 1.6))
    pill(d, 570, "54-maktab  •  8-E sinf", F(SANS_B, 50), YELLOW, prog(t, 2.8))

def s2(d, t):   # "Bugun sizga 18-noyabr — Davlat bayrogʻimiz qabul qilingan kun haqida gapirib beraman."
    text_c(d, 140, "BUGUNGI MAVZU", F(SANS_B, 44), YELLOW, prog(t, 0.2))
    pill(d, 250, "18-noyabr", F(SANS_B, 72), YELLOW, prog(t, 0.9), filled=True)
    text_c(d, 410, "Davlat bayrogʻi", F(SERIF_B, 92), CHALK, prog(t, 2.0))
    text_c(d, 525, "qabul qilingan kun", F(SERIF_B, 92), CHALK, prog(t, 2.6))
    underline(d, 660, t, 3.4, 330)

def s3(d, t):   # "1991-yil 18-noyabrda Oliy Kengash «Oʻzbekiston Respublikasining Davlat bayrogʻi toʻgʻrisida»gi qonunni qabul qilgan."
    a = prog(t, 0.2, 0.8); sc = 0.75 + 0.25 * a
    text_c(d, 120 + (1 - sc) * 60, "1991", F(SERIF_B, int(170 * sc)), YELLOW, a)
    text_c(d, 320, "18-noyabr", F(SANS_B, 70), CHALK, prog(t, 1.4))
    underline(d, 420, t, 1.8, 300)
    text_c(d, 455, "Oliy Kengash qonun qabul qildi:", F(SANS, 42), DIM, prog(t, 2.6))
    pill(d, 560, "«Davlat bayrogʻi toʻgʻrisida»", F(SANS_B, 52), YELLOW, prog(t, 3.6))
    chalk_flag(d, BCX - 75, 690, 150, prog(t, 4.4), prog(t, 4.4), prog(t, 4.4), prog(t, 4.4))

def s4(d, t):   # the colours, each card as its sentence is spoken
    text_c(d, 98, "RANGLAR MAʼNOSI", F(SANS_B, 44), YELLOW, prog(t, 0.1))
    tb, tw, tg, tr = 0.6, 4.2, 6.9, 9.2
    chalk_flag(d, BCX - 210, 165, 420, prog(t, tb), prog(t, tw), prog(t, tg), prog(t, tr), 12, prog(t, tb))
    cw, ch, gap = 560, 150, 30; x0, x1 = BCX - cw - gap // 2, BCX + gap // 2; y0, y1 = 440, 620
    chip_card(d, x0, y0, cw, ch, CB, "MOVIY", "mangu osmon va obihayot ramzi", prog(t, tb + 0.3))
    chip_card(d, x1, y0, cw, ch, CHALK, "OQ", "tinchlik va poklik ramzi", prog(t, tw + 0.3), white=True)
    chip_card(d, x0, y1, cw, ch, CG, "YASHIL", "yangilanayotgan tabiat ramzi", prog(t, tg + 0.3))
    chip_card(d, x1, y1, cw, ch, CR, "QIZIL", "vujudimizdagi hayotiy kuch", prog(t, tr + 0.3))

def s5(d, t):   # crescent and twelve stars; the stars are counted in as he speaks
    a = prog(t, 0.2)
    px, py, pw, ph = BCX - 260, 110, 520, 260
    if a > 0:
        d.rounded_rectangle([px, py + (1 - a) * 20, px + pw, py + ph + (1 - a) * 20], 16, fill=CB + (int(255 * a),))
        cx, cy, R = px + 110, py + 130 + (1 - a) * 20, 78
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=CHALK + (int(255 * a),))
        d.ellipse([cx - R + 26, cy - R, cx + R + 26, cy + R], fill=CB + (255,))
        n = int(clamp((t - 3.6) / 2.4) * 12 + 0.999) if t > 3.6 else 0
        for k, (sx, sy) in enumerate(STARS[:n]):
            X = px + 250 + (sx - 88) * 2.5; Y = py + 55 + (sy - 16) * 3.1 + (1 - a) * 20
            d.polygon(star_pts(X, Y, 19), fill=CHALK + (255,))
    two_color(d, 420, "YARIM OY", "  —  mustaqil respublikamiz ramzi", F(SANS_B, 44), YELLOW, CHALK, prog(t, 0.6), prog(t, 1.2))
    two_color(d, 540, "12 YULDUZ", "  —  tarixiy anʼanalarimiz va", F(SANS_B, 44), YELLOW, CHALK, prog(t, 3.6), prog(t, 4.8))
    text_c(d, 610, "qadimiy quyosh yil hisobi bilan bogʻliq", F(SANS_B, 44), CHALK, prog(t, 5.6))

def s6(d, t):   # "Bayrogʻimiz — gʻururimiz! Barchangizni bayram bilan tabriklayman. Eʼtiboringiz uchun rahmat!"
    text_c(d, 120, "Bayrogʻimiz —", F(SERIF_B, 90), CHALK, prog(t, 0.2))
    text_c(d, 225, "gʻururimiz!", F(SERIF_B, 124), YELLOW, prog(t, 0.7))
    chalk_flag(d, BCX - 150, 410, 300, prog(t, 1.2), prog(t, 1.2), prog(t, 1.2), prog(t, 1.2))
    text_c(d, 585, "Bayramingiz muborak!", F(SANS_B, 56), CHALK, prog(t, 2.4))
    text_c(d, 700, "Asadbek  •  54-maktab, 8-E sinf", F(SANS, 36), DIM, prog(t, 3.4))

SCENES = [s1, s2, s3, s4, s5, s6]
