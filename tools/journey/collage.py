"""Build ready-to-post images for the development journey from docs/journey/milestones.json.

    python3 tools/journey/collage.py

Writes to docs/journey/social/:
  then-and-now.jpg     first milestone beside the latest, 1600x900 (landscape posts)
  then-and-now-sq.jpg  the same, stacked, 1080x1350 (portrait feeds)
  timeline.jpg         every milestone's hero shot in order, with its date and title
  <id>.jpg             each milestone on its own with a caption bar, 1600x1000 (carousel posts)

Needs Pillow (pip install pillow). Milestone entries: {"id", "commit", "date", "title", "short"?, "hero", "shots"}.
hero and shots are files inside docs/journey/<id>/; short is used where only one line fits.
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
J = os.path.join(ROOT, 'docs', 'journey')
OUT = os.path.join(J, 'social')
INK, PAPER, ACCENT, MUTED = (28, 30, 34), (247, 244, 236), (201, 105, 44), (110, 112, 118)


def font(size, bold=False):
    for f in (['DejaVuSans-Bold.ttf', 'LiberationSans-Bold.ttf'] if bold else ['DejaVuSans.ttf', 'LiberationSans-Regular.ttf']):
        for d in ('/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/truetype/liberation', '/Library/Fonts', 'C:/Windows/Fonts'):
            p = os.path.join(d, f)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def fit(im, w, h):
    """Cover-crop to w x h, keeping the centre."""
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def wrap(d, text, f, width, max_lines=2):
    """Split text into lines that fit width; the last line ends with an ellipsis if it had to be cut."""
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while d.textlength(lines[-1] + '…', font=f) > width and ' ' in lines[-1]:
            lines[-1] = lines[-1].rsplit(' ', 1)[0]
        lines[-1] += '…'
    return lines


def text(d, xy, s, f, fill, width, max_lines=2, gap=6):
    x, y = xy
    for line in wrap(d, s, f, width, max_lines):
        d.text((x, y), line, font=f, fill=fill); y += f.size + gap
    return y


def hero(m):
    return Image.open(os.path.join(J, m['id'], m['hero'])).convert('RGB')


def label(d, x, y, m, big, small, w):
    d.text((x, y), m['date'], font=small, fill=ACCENT)
    text(d, (x, y + small.size + 8), m['title'], big, INK, w)


def then_and_now(ms):
    a, b = ms[0], ms[-1]
    W, H, pad = 1600, 900, 28
    S = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(S)
    d.text((pad, 22), 'The development journey', font=font(40, True), fill=INK)
    iw, ih = (W - pad * 3) // 2, 560
    for i, m in enumerate((a, b)):
        x = pad + i * (iw + pad)
        S.paste(fit(hero(m), iw, ih), (x, 96))
        d.text((x, 96 + ih + 18), 'THEN' if i == 0 else 'NOW', font=font(22, True), fill=MUTED)
        label(d, x, 96 + ih + 50, m, font(30, True), font(22), iw)
    S.save(os.path.join(OUT, 'then-and-now.jpg'), quality=90)

    W, H = 1080, 1350
    S = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(S)
    d.text((pad, 24), 'The development journey', font=font(40, True), fill=INK)
    iw, ih = W - pad * 2, 520
    for i, m in enumerate((a, b)):
        y = 96 + i * (ih + 120)
        S.paste(fit(hero(m), iw, ih), (pad, y))
        d.text((pad, y + ih + 12), ('THEN · ' if i == 0 else 'NOW · ') + m['date'], font=font(22, True), fill=ACCENT)
        text(d, (pad, y + ih + 44), m.get('short', m['title']), font(30, True), INK, iw, max_lines=1)
    S.save(os.path.join(OUT, 'then-and-now-sq.jpg'), quality=90)


def timeline(ms):
    cols, tw, th, pad, cap = 4, 480, 300, 20, 90
    rows = (len(ms) + cols - 1) // cols
    W, H = cols * tw + (cols + 1) * pad, 100 + rows * (th + cap + pad) + pad
    S = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(S)
    d.text((pad, 26), 'From first prototype to today', font=font(40, True), fill=INK)
    for k, m in enumerate(ms):
        x, y = pad + (k % cols) * (tw + pad), 100 + (k // cols) * (th + cap + pad)
        S.paste(fit(hero(m), tw, th), (x, y))
        d.text((x, y + th + 8), f"{k + 1:02d} · {m['date']}", font=font(18, True), fill=ACCENT)
        text(d, (x, y + th + 34), m['title'], font(20), INK, tw, gap=4)
    S.save(os.path.join(OUT, 'timeline.jpg'), quality=88)


def cards(ms):
    for k, m in enumerate(ms):
        W, H, bar = 1600, 1000, 120
        S = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(S)
        S.paste(fit(hero(m), W, H - bar), (0, 0))
        d.text((32, H - bar + 18), f"{k + 1:02d} / {len(ms):02d} · {m['date']}", font=font(24, True), fill=ACCENT)
        text(d, (32, H - bar + 56), m.get('short', m['title']) if len(m['title']) > 70 else m['title'], font(34, True), INK, W - 64, max_lines=1)
        S.save(os.path.join(OUT, f"{m['id']}.jpg"), quality=88)


if __name__ == '__main__':
    ms = json.load(open(os.path.join(J, 'milestones.json')))
    os.makedirs(OUT, exist_ok=True)
    then_and_now(ms); timeline(ms); cards(ms)
    print(f'{len(ms)} milestones → {os.path.relpath(OUT, ROOT)}')
