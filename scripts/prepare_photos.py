"""Prépare les photos cadeaux pour le jeu.

1. Mettre les photos originales dans photos_src/ (JPEG, PNG ou HEIC de l'iPhone).
   Elles sont offertes dans l'ordre alphabétique des noms : 001.jpg, 002.jpg… pour choisir l'ordre.
2. (Optionnel) photos_src/captions.json : {"001.jpg": "Notre premier café", ...}
3. python3 scripts/prepare_photos.py

Résultat dans web/photos/ (ignoré par git, les photos restent privées) :
  NNN.webp         grande version, 1600 px max, orientation corrigée, métadonnées GPS retirées
  thumbs/NNN.webp  miniature carrée 400 px pour la galerie
  manifest.js      liste lue par le jeu
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener  # photos HEIC de l'iPhone
    register_heif_opener()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photos_src"
OUT = ROOT / "web" / "photos"
EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}
MAX_GIFTS = 168


def main():
    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in EXTS) if SRC.exists() else []
    if not files:
        sys.exit(f"Aucune photo dans {SRC.relative_to(ROOT)}/")
    if len(files) > MAX_GIFTS:
        print(f"{len(files)} photos trouvées : seules les {MAX_GIFTS} premières seront utilisées.")
        files = files[:MAX_GIFTS]
    captions = {}
    cap_file = SRC / "captions.json"
    if cap_file.exists():
        captions = json.loads(cap_file.read_text(encoding="utf-8"))

    (OUT / "thumbs").mkdir(parents=True, exist_ok=True)
    manifest = []
    for i, f in enumerate(files, 1):
        name = f"{i:03d}.webp"
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")  # redresse, et on ne garde aucune métadonnée
        big = im.copy()
        big.thumbnail((1600, 1600), Image.LANCZOS)
        big.save(OUT / name, "WEBP", quality=82, method=6)
        ImageOps.fit(im, (400, 400), Image.LANCZOS).save(OUT / "thumbs" / name, "WEBP", quality=78, method=6)
        manifest.append({"src": f"photos/{name}", "thumb": f"photos/thumbs/{name}", "caption": captions.get(f.name, "")})
        print(f"{i:>3}/{len(files)}  {f.name} → {name}")

    (OUT / "manifest.js").write_text(
        "window.PHOTOS = " + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    if len(manifest) < MAX_GIFTS:
        print(f"Attention : {len(manifest)} photos pour {MAX_GIFTS} cadeaux, les suivantes afficheront leur numéro.")
    print(f"→ web/photos/ ({len(manifest)} photos)")


if __name__ == "__main__":
    main()
