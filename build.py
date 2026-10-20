"""Assemble le jeu en un seul fichier HTML autonome : dist/daridja.html.

Le fichier n'a pas besoin de serveur : on peut l'ouvrir sur iPhone ou le publier tel quel.
Usage : python3 build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
web = ROOT / "web"
index = (web / "index.html").read_text(encoding="utf-8")
body = index.split("<!--BODY-->")[1].split("<!--/BODY-->")[0]
fonts = re.search(r'<link href="(https://fonts\.googleapis\.com/[^"]+)"', index).group(1)

out = f"""<title>Daridja Mots Fléchés</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="{fonts}" rel="stylesheet">
<style>
{(web / "app.css").read_text(encoding="utf-8")}
</style>
{body}
<script>
{(web / "levels.js").read_text(encoding="utf-8")}
</script>
<script>
{(web / "app.js").read_text(encoding="utf-8")}
</script>
"""
dest = ROOT / "dist" / "daridja.html"
dest.parent.mkdir(exist_ok=True)
dest.write_text(out, encoding="utf-8")
print(f"→ {dest.relative_to(ROOT)} ({len(out.encode()) // 1024} Ko)")
