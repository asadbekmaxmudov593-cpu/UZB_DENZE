"""Shaded, more natural-proportioned schoolboy (light from the window, upper-left)."""
import math
from PIL import Image, ImageDraw, ImageFilter, ImageChops

SK = 2
BOY_X, FLOOR = 330, 1050

SKIN = (226, 178, 142); SKIN_SH = (178, 122, 94); SKIN_HL = (244, 206, 176)
HAIR = (34, 25, 20); HAIR_HL = (92, 70, 54)
JKT = (30, 31, 36); JKT_SH = (8, 8, 11); JKT_HL = (82, 84, 96)      # black suit jacket
SHIRT = (246, 246, 244); SHIRT_SH = (186, 192, 206)
PANTS = (32, 33, 38); PANTS_SH = (10, 10, 13); PANTS_HL = (74, 76, 86)   # black suit trousers
SHOE = (26, 22, 22); SHOE_HL = (110, 108, 112)

def blur(m, r): return m.filter(ImageFilter.GaussianBlur(r))

def shaded(mask, base, sh, hl, depth=14, sh_k=0.85, hl_k=0.6):
    """Return RGBA: base colour inside mask with edge-shadow (lower-right) and edge-light (upper-left)."""
    d = depth * SK
    dx, dy = int(d), int(d * 0.7)
    to_light = blur(ImageChops.offset(mask, -dx, -dy), d * 0.8)
    from_light = blur(ImageChops.offset(mask, dx, dy), d * 0.8)
    dark = ImageChops.multiply(mask, ImageChops.invert(to_light)).point(lambda v: int(v * sh_k))
    lite = ImageChops.multiply(mask, ImageChops.invert(from_light)).point(lambda v: int(v * hl_k))
    out = Image.new("RGBA", mask.size, base + (0,))
    out.putalpha(mask)
    out = Image.composite(Image.new("RGBA", mask.size, sh + (255,)), out, dark)
    out = Image.composite(Image.new("RGBA", mask.size, hl + (255,)), out, lite)
    out.putalpha(mask)
    return out

def smooth(mask, r=4):
    return blur(mask, r * SK).point(lambda v: 255 if v > 127 else 0).filter(ImageFilter.GaussianBlur(0.8))

# ---------------- static body (pre-rendered once) ----------------
CX0, CY0, CW, CH = -300, -960, 600, 1000      # local box of static canvas

def _P(x, y): return ((x - CX0) * SK, (y - CY0) * SK)
def _R(x0, y0, x1, y1): a, b = _P(x0, y0), _P(x1, y1); return [a[0], a[1], b[0], b[1]]

def _mask(): return Image.new("L", (CW * SK, CH * SK), 0)

def build_static():
    lower = Image.new("RGBA", (CW * SK, CH * SK), (0, 0, 0, 0))
    upper = Image.new("RGBA", (CW * SK, CH * SK), (0, 0, 0, 0))
    # ---- legs
    for sgn in (-1, 1):
        m = _mask(); d = ImageDraw.Draw(m)
        pts = [(sgn * 4, -452), (sgn * 100, -452), (sgn * 84, -40), (sgn * 10, -40)]
        d.polygon([_P(*p) for p in pts], fill=255)
        lower.alpha_composite(shaded(smooth(m, 2), PANTS, PANTS_SH, PANTS_HL, 16, 0.8, 0.45))
        ImageDraw.Draw(lower).line([_P(sgn * 50, -380), _P(sgn * 47, -46)], fill=(20, 20, 24, 200), width=2 * SK)
    # ---- shoes
    for sgn in (-1, 1):
        m = _mask(); d = ImageDraw.Draw(m)
        d.rounded_rectangle(_R(min(sgn * 6, sgn * 98), -48, max(sgn * 6, sgn * 98), 0), 20 * SK, fill=255)
        d.ellipse(_R(sgn * 58 - 40, -50, sgn * 58 + 44, 0) if sgn > 0 else _R(sgn * 58 - 44, -50, sgn * 58 + 40, 0), fill=255)
        lower.alpha_composite(shaded(smooth(m, 2), SHOE, (8, 8, 8), SHOE_HL, 10, 0.7, 0.8))
    # ---- neck
    m = _mask(); ImageDraw.Draw(m).rounded_rectangle(_R(-21, -790, 21, -728), 8 * SK, fill=255)
    nk = shaded(m, SKIN_SH, (150, 98, 76), SKIN, 8, 0.6, 0.4)
    upper.alpha_composite(nk)
    # ---- shirt (visible in V)
    m = _mask(); ImageDraw.Draw(m).polygon([_P(-40, -752), _P(40, -752), _P(0, -600)], fill=255)
    upper.alpha_composite(shaded(m, SHIRT, SHIRT_SH, (255, 255, 255), 10, 0.7, 0.3))
    # ---- jacket body
    m = _mask(); d = ImageDraw.Draw(m)
    body = [(-40, -752), (-80, -746), (-110, -728), (-120, -690), (-114, -560), (-108, -410), (-60, -402),
            (0, -398), (60, -402), (108, -410), (114, -560), (120, -690), (110, -728), (80, -746), (40, -752),
            (0, -604)]
    d.polygon([_P(*p) for p in body], fill=255)
    m = smooth(m, 3)
    upper.alpha_composite(shaded(m, JKT, JKT_SH, JKT_HL, 26, 0.85, 0.5))
    du = ImageDraw.Draw(upper)
    # lapels
    for sgn in (-1, 1):
        lap = [(sgn * 40, -752), (sgn * 62, -742), (sgn * 52, -700), (sgn * 66, -690), (sgn * 4, -604)]
        lm = _mask(); ImageDraw.Draw(lm).polygon([_P(*p) for p in lap], fill=255)
        upper.alpha_composite(shaded(lm, (42, 43, 50), JKT_SH, JKT_HL, 8, 0.6, 0.5))
        du.line([_P(*p) for p in lap], fill=(6, 6, 8, 220), width=2 * SK, joint="curve")
    # collar points
    for sgn in (-1, 1):
        cm = _mask(); ImageDraw.Draw(cm).polygon([_P(sgn * 4, -756), _P(sgn * 26, -760), _P(sgn * 22, -718)], fill=255)
        upper.alpha_composite(shaded(cm, SHIRT, SHIRT_SH, (255, 255, 255), 5, 0.6, 0.3))
    # front edge, buttons, pockets
    du.line([_P(2, -604), _P(2, -402)], fill=(6, 6, 8, 230), width=3 * SK)
    for by in (-570, -505):
        du.ellipse(_R(10, by - 7, 24, by + 7), fill=(18, 18, 22, 255))
        du.ellipse(_R(12, by - 5, 20, by + 2), fill=(96, 96, 106, 255))
    for sgn in (-1, 1):
        x0, x1 = sorted((sgn * 36, sgn * 94))
        du.rounded_rectangle(_R(x0, -505, x1, -490), 4 * SK, fill=(22, 22, 28, 255))
        du.line([_P(x0, -505), _P(x1, -505)], fill=(6, 6, 8, 200), width=2 * SK)
    du.line([_P(-90, -665), _P(-48, -665)], fill=(6, 6, 8, 200), width=2 * SK)
    # ---- head
    hm = _mask(); d = ImageDraw.Draw(hm)
    d.ellipse(_R(-57, -905, 57, -790), fill=255)
    d.polygon([_P(-57, -850), _P(57, -850), _P(46, -800), _P(22, -768), _P(-22, -768), _P(-46, -800)], fill=255)
    d.ellipse(_R(-65, -842, -47, -808), fill=255); d.ellipse(_R(47, -842, 65, -808), fill=255)  # ears
    hm = smooth(hm, 3)
    head = shaded(hm, SKIN, SKIN_SH, SKIN_HL, 20, 0.7, 0.55)
    dh = ImageDraw.Draw(head)
    ear = Image.new("L", hm.size, 0); de = ImageDraw.Draw(ear)
    for sgn in (-1, 1):   # inner ear fold (C shape opening toward the face)
        x0, x1 = sorted((sgn * 51, sgn * 61))
        de.arc(_R(x0, -837, x1, -813), 280 if sgn > 0 else 100, 80 if sgn > 0 else 260, fill=170, width=3 * SK)
        de.ellipse(_R(min(sgn * 53, sgn * 57), -828, max(sgn * 53, sgn * 57), -820), fill=120)
    ear = ImageChops.multiply(blur(ear, 1.5 * SK), hm)
    head = Image.composite(Image.new("RGBA", hm.size, SKIN_SH + (255,)), head, ear)
    head.putalpha(hm)
    # soft facial shading layer
    sh = Image.new("L", hm.size, 0); ds = ImageDraw.Draw(sh)
    ds.polygon([_P(4, -842), _P(10, -812), _P(2, -808)], fill=150)              # nose side
    ds.ellipse(_R(-8, -812, 10, -803), fill=110)                                   # under nose
    ds.ellipse(_R(-36, -848, -10, -830), fill=60); ds.ellipse(_R(10, -848, 36, -830), fill=80)   # eye sockets
    ds.ellipse(_R(-16, -786, 16, -776), fill=70)                                   # under lip
    sh = ImageChops.multiply(blur(sh, 4 * SK), hm)
    head = Image.composite(Image.new("RGBA", hm.size, SKIN_SH + (255,)), head, sh)
    bl = Image.new("L", hm.size, 0); ImageDraw.Draw(bl).ellipse(_R(-46, -818, -22, -800), fill=80)
    ImageDraw.Draw(bl).ellipse(_R(22, -818, 46, -800), fill=70)
    head = Image.composite(Image.new("RGBA", hm.size, (236, 140, 130, 255)), head, ImageChops.multiply(blur(bl, 5 * SK), hm))
    head.putalpha(hm)
    dh = ImageDraw.Draw(head)
    dh.ellipse(_R(-7, -810, -2, -806), fill=(140, 88, 70, 255)); dh.ellipse(_R(2, -810, 7, -806), fill=(140, 88, 70, 255))
    upper.alpha_composite(head)
    # ---- hair
    hr = _mask(); d = ImageDraw.Draw(hr)
    d.ellipse(_R(-63, -918, 63, -812), fill=255)
    d.polygon([_P(-50, -864), _P(-34, -852), _P(-20, -862), _P(-4, -850), _P(12, -861), _P(28, -851),
               _P(42, -862), _P(52, -858), _P(48, -800), _P(-48, -800)], fill=0)
    d.rectangle(_R(-48, -836, 48, -760), fill=0)
    d.rectangle(_R(-80, -830, 80, -760), fill=0)
    hr = smooth(hr, 2)
    hair = shaded(hr, HAIR, (14, 10, 8), HAIR_HL, 12, 0.7, 0.7)
    strands = Image.new('RGBA', hr.size, (0, 0, 0, 0)); dha = ImageDraw.Draw(strands)
    import random; random.seed(7)
    for i in range(90):   # strands flowing from crown to fringe
        fx = -54 + 108 * i / 89 + random.uniform(-2, 2)
        cx_, cy_ = 4, -918
        mx, my = (cx_ + fx) / 2 + random.uniform(-6, 6) + fx * 0.25, -900 + abs(fx) * 0.3
        ey = -858 + random.uniform(-6, 4) + abs(fx) * 0.15
        col = (HAIR_HL if fx < 0 else (64, 48, 38)) + (random.randint(35, 80),)
        dha.line([_P(cx_ + fx * 0.3, cy_ + 8), _P(mx, my), _P(fx, ey)], fill=col, width=SK, joint="curve")
    sheen = Image.new("L", hr.size, 0)
    ImageDraw.Draw(sheen).arc(_R(-50, -912, 40, -840), 200, 290, fill=90, width=10 * SK)
    hair = Image.composite(Image.new("RGBA", hr.size, (110, 88, 70, 255)), hair, blur(sheen, 6 * SK))
    hair.alpha_composite(strands)
    hair.putalpha(ImageChops.multiply(hair.getchannel("A"), hr))
    upper.alpha_composite(hair)
    # eyebrows
    du = ImageDraw.Draw(upper)
    for sgn in (-1, 1):
        du.line([_P(sgn * 10, -851), _P(sgn * 22, -855), _P(sgn * 36, -851)], fill=(42, 30, 24, 255), width=5 * SK, joint="curve")
    lo = lower.resize((CW, CH), Image.LANCZOS); up = upper.resize((CW, CH), Image.LANCZOS)
    return lo, up

LOWER, UPPER = build_static()

# ---------------- per-frame face ----------------
FX0, FY0, FW, FH = -48, -848, 96, 76
def face(blink, talk):
    img = Image.new("RGBA", (FW * SK, FH * SK), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    P = lambda x, y: ((x - FX0) * SK, (y - FY0) * SK)
    R = lambda a, b, c, e: [*P(a, b), *P(c, e)]
    for ex in (-22, 22):
        if blink:
            d.arc(R(ex - 12, -842, ex + 12, -830), 10, 170, fill=(50, 34, 28), width=3 * SK)
        else:
            d.ellipse(R(ex - 12, -841, ex + 12, -829), fill=(242, 238, 234))
            d.ellipse(R(ex - 5, -841, ex + 7, -829), fill=(84, 54, 36))
            d.ellipse(R(ex - 2, -838, ex + 4, -832), fill=(18, 12, 10))
            d.ellipse(R(ex + 2, -839, ex + 5, -836), fill=(255, 255, 255))
            d.arc(R(ex - 13, -843, ex + 13, -826), 190, 350, fill=(38, 26, 22), width=3 * SK)
    if talk < 0.08:
        d.arc(R(-16, -800, 16, -786), 20, 160, fill=(150, 74, 66), width=3 * SK)
        d.ellipse(R(-9, -790, 9, -785), fill=(206, 130, 116, 160))
    else:
        h = 4 + 11 * talk
        d.ellipse(R(-13, -793 - h * 0.3, 13, -793 + h), fill=(96, 32, 34), outline=(176, 92, 84), width=2 * SK)
        d.rectangle(R(-9, -793 - h * 0.3 + 1, 9, -793 - h * 0.3 + 3.5), fill=(245, 242, 236))
    return img.resize((FW, FH), Image.LANCZOS)

# ---------------- per-frame arms ----------------
AX0, AY0, AW, AH = -320, -1080, 920, 820
def arms(a_left, a_right, hand_mode, bob):
    """a_* = (upper_angle, fore_angle) in degrees, screen coords; hand_mode: 0 rest, 1 point, 2 wave"""
    out = Image.new("RGBA", (AW * SK, AH * SK), (0, 0, 0, 0))
    P = lambda x, y: ((x - AX0) * SK, (y + bob - AY0) * SK)
    for sx, (a1, a2), mode in ((-100, a_left, 0), (100, a_right, hand_mode)):
        S = (sx, -714)
        r1, r2 = math.radians(a1), math.radians(a2)
        E = (S[0] + 158 * math.cos(r1), S[1] + 158 * math.sin(r1))
        Wr = (E[0] + 138 * math.cos(r2), E[1] + 138 * math.sin(r2))
        u = (math.cos(r2), math.sin(r2))
        # sleeve: tapered from shoulder to wrist
        m = Image.new("L", out.size, 0); d = ImageDraw.Draw(m)
        def seg(A, B, wa, wb):
            dx, dy = B[0] - A[0], B[1] - A[1]; L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L, dx / L
            d.polygon([P(A[0] + nx * wa, A[1] + ny * wa), P(B[0] + nx * wb, B[1] + ny * wb),
                       P(B[0] - nx * wb, B[1] - ny * wb), P(A[0] - nx * wa, A[1] - ny * wa)], fill=255)
        seg(S, E, 25, 21); seg(E, Wr, 21, 18)
        d.ellipse([P(S[0] - 25, S[1] - 25), P(S[0] + 25, S[1] + 25)], fill=255)
        d.ellipse([P(E[0] - 21, E[1] - 21), P(E[0] + 21, E[1] + 21)], fill=255)
        bb = m.getbbox(); pad = 40 * SK
        box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(m.width, bb[2] + pad), min(m.height, bb[3] + pad))
        out.alpha_composite(shaded(m.crop(box), JKT, JKT_SH, JKT_HL, 14, 0.8, 0.55), (box[0], box[1]))
        d2 = ImageDraw.Draw(out)
        d2.line([P(E[0] - 10 * u[1], E[1] + 10 * u[0]), P(E[0] + 4 * u[1], E[1] - 4 * u[0])], fill=JKT_SH + (150,), width=2 * SK)
        # shirt cuff
        c0 = (Wr[0] - 2 * u[0], Wr[1] - 2 * u[1]); c1 = (Wr[0] + 6 * u[0], Wr[1] + 6 * u[1])
        d2.line([P(*c0), P(*c1)], fill=SHIRT + (255,), width=34 * SK)
        # hand
        side = -1 if sx > 0 else 1                     # thumb toward the body when hanging
        n = (-u[1] * side, u[0] * side)
        hm = Image.new("L", out.size, 0); dh = ImageDraw.Draw(hm)
        def at(a, b): return (Wr[0] + a * u[0] + b * n[0], Wr[1] + a * u[1] + b * n[1])
        palm = [at(6, -13), at(6, 13), at(36, 15), at(40, 5), at(40, -6), at(36, -14)]
        dh.polygon([P(*p) for p in palm], fill=255)
        dh.ellipse([P(*at(20, 0))[0] - 15 * SK, P(*at(20, 0))[1] - 15 * SK, P(*at(20, 0))[0] + 15 * SK, P(*at(20, 0))[1] + 15 * SK], fill=255)
        def finger(base, ang, length, w):
            ca, sa = math.cos(ang), math.sin(ang)
            dirx = u[0] * ca - u[1] * sa * side; diry = u[1] * ca + u[0] * sa * side
            tip = (base[0] + dirx * length, base[1] + diry * length)
            dh.line([P(*base), P(*tip)], fill=255, width=int(w * SK))
            r = w / 2
            dh.ellipse([P(tip[0] - r, tip[1] - r), P(tip[0] + r, tip[1] + r)], fill=255)
            return base, tip
        offs = [-10, -3.5, 3, 9.5]                     # index .. little finger
        if mode == 0:
            lens, angs = [26, 28, 26, 21], [0.10, 0.03, -0.04, -0.12]
        elif mode == 1:
            lens, angs = [38, 9, 8, 7], [0.0, 0.0, 0.0, 0.0]
        else:
            lens, angs = [30, 33, 31, 25], [-0.40, -0.13, 0.13, 0.38]
        if mode == 2: offs = [-13, -4.5, 4.5, 12.5]
        fl = [finger(at(36 if mode != 2 else 32, o), a, L, 8.4 if k < 3 else 7.4) for k, (o, a, L) in enumerate(zip(offs, angs, lens))]
        finger(at(14, -14), 0.6 if mode != 2 else -0.9, 22, 10)   # thumb
        bb = hm.getbbox(); pad = 30 * SK
        box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(hm.width, bb[2] + pad), min(hm.height, bb[3] + pad))
        out.alpha_composite(shaded(hm.crop(box), SKIN, SKIN_SH, SKIN_HL, 6, 0.6, 0.5), (box[0], box[1]))
        d2 = ImageDraw.Draw(out)
        if mode == 0:                                   # gaps between fingers
            for k in range(3):
                g = (offs[k] + offs[k + 1]) / 2
                d2.line([P(*at(40, g)), P(*at(58, g))], fill=SKIN_SH + (170,), width=SK)
        if mode == 2:
            for k in range(3):
                g = (offs[k] + offs[k + 1]) / 2
                d2.line([P(*at(34, g)), P(*at(42, g))], fill=SKIN_SH + (200,), width=SK)
        if mode == 1:
            d2.line([P(*at(40, -6)), P(*at(44, 12))], fill=SKIN_SH + (170,), width=SK)   # curled knuckles
    return out.resize((AW, AH), Image.LANCZOS)

# ---------------- compose ----------------
_shadow = None
def composite(img, gt, point, wave, talk, blink, bob, a_left, a_right):
    global _shadow
    if _shadow is None:
        m = Image.new("L", (520, 80), 0)
        ImageDraw.Draw(m).ellipse([60, 20, 460, 60], fill=110)
        _shadow = Image.new("RGBA", m.size, (50, 32, 20, 0)); _shadow.putalpha(blur(m, 12))
    img.alpha_composite(_shadow, (BOY_X - 260, FLOOR - 40))
    x0 = BOY_X + CX0; y0 = FLOOR + CY0
    img.alpha_composite(LOWER, (x0, y0))
    b = int(round(bob))
    img.alpha_composite(UPPER, (x0, y0 + b))
    img.alpha_composite(face(blink, talk), (BOY_X + FX0, FLOOR + FY0 + b))
    mode = 2 if wave > 0.5 else (1 if point > 0.5 else 0)
    img.alpha_composite(arms(a_left, a_right, mode, 0), (BOY_X + AX0, FLOOR + AY0 + b))
