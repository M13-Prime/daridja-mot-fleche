"""Assemble le jeu.

  dist/site/        le site complet à mettre en ligne (index.html autonome, icônes, manifeste, photos)
  dist/daridja.html un seul fichier pour l'aperçu (sans les photos)

Usage : python3 build.py
"""
import json
import math
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
DIST = ROOT / "dist"
SITE = DIST / "site"

index = (WEB / "index.html").read_text(encoding="utf-8")
css = (WEB / "app.css").read_text(encoding="utf-8")
js = (WEB / "app.js").read_text(encoding="utf-8")
levels = (WEB / "levels.js").read_text(encoding="utf-8")
body = index.split("<!--BODY-->")[1].split("<!--/BODY-->")[0]
fonts = re.search(r'<link href="(https://fonts\.googleapis\.com/[^"]+)"', index).group(1)


def site_index():
    head = index.split("<body>")[0].replace('<link rel="stylesheet" href="app.css">', f"<style>\n{css}</style>")
    return (f"{head}<body>\n{body}\n<script>\n{levels}</script>\n"
            f'<script src="photos/manifest.js"></script>\n<script>\n{js}</script>\n</body>\n</html>\n')


def preview():
    return (f'<title>Daridja Mots Fléchés</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="{fonts}" rel="stylesheet">\n'
            f"<style>\n{css}</style>\n{body}\n<script>\n{levels}</script>\n<script>\n{js}</script>\n")


def icon(size):
    """Icône : carreau bleu Méditerranée avec l'étoile à huit branches des zelliges."""
    from PIL import Image, ImageDraw
    s = size * 4
    im = Image.new("RGB", (s, s), "#3d7fd9")
    d = ImageDraw.Draw(im)
    for y in range(s):  # léger dégradé vertical
        t = y / s
        d.line([(0, y), (s, y)], fill=(int(61 + 30 * t), int(127 - 20 * t), int(217 - 25 * t)))
    c, r = s / 2, s * 0.30
    for rot in (0, 45):
        pts = [(c + r * math.cos(math.radians(a + rot)), c + r * math.sin(math.radians(a + rot))) for a in (45, 135, 225, 315)]
        d.polygon(pts, fill="#f2b33d")
    d.ellipse([c - r * 0.42, c - r * 0.42, c + r * 0.42, c + r * 0.42], fill="#ffffff")
    d.ellipse([c - r * 0.2, c - r * 0.2, c + r * 0.2, c + r * 0.2], fill="#e98aa0")
    return im.resize((size, size), Image.LANCZOS)


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    (SITE / "index.html").write_text(site_index(), encoding="utf-8")
    icon(180).save(SITE / "icon-180.png")
    icon(512).save(SITE / "icon-512.png")
    (SITE / "manifest.webmanifest").write_text(json.dumps({
        "name": "Daridja Mots Fléchés", "short_name": "Daridja", "start_url": "./", "display": "standalone",
        "background_color": "#f6f8fc", "theme_color": "#3d7fd9", "lang": "fr",
        "icons": [{"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                  {"src": "icon-180.png", "sizes": "180x180", "type": "image/png"}],
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    photos = WEB / "photos"
    if (photos / "manifest.js").exists():
        shutil.copytree(photos, SITE / "photos")
        n = len(list((SITE / "photos").glob("*.webp")))
        print(f"photos : {n} copiées")
    else:
        (SITE / "photos").mkdir()
        (SITE / "photos" / "manifest.js").write_text("window.PHOTOS = [];\n", encoding="utf-8")
        print("photos : aucune pour l'instant (lancer scripts/prepare_photos.py)")
    (DIST / "daridja.html").write_text(preview(), encoding="utf-8")
    size = sum(p.stat().st_size for p in SITE.rglob("*") if p.is_file())
    print(f"→ dist/site/ ({size // 1024} Ko) et dist/daridja.html")


if __name__ == "__main__":
    main()
