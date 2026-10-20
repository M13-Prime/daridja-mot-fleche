"""Générateur de grilles de mots fléchés en darija.

Chaque mot est précédé d'une case définition : à gauche pour un mot horizontal (▸),
au-dessus pour un mot vertical (▾). Une case définition peut porter deux définitions.

Usage : python3 generator/generate.py [--seed N]
Produit web/levels.js : 252 niveaux en lettres latines, 252 en lettres arabes.
"""
import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

N_LEVELS = 252  # par clavier : 2 × 252 = 504 niveaux = 168 cadeaux (un tous les 3 niveaux)
MODES = {"latin": "word", "arabic": "ar"}  # mode -> champ de réponse dans words.json


def level_config(n):
    """Niveau n (1..252) -> (taille de grille, poids par palier).

    La grille grandit de 5×5 à 10×10 sur les 100 premiers niveaux, puis les mots rares
    prennent de plus en plus de place jusqu'au bout.
    """
    size = 5 if n <= 10 else 6 if n <= 25 else 7 if n <= 45 else 8 if n <= 70 else 9 if n <= 100 else 10
    t = (n - 1) / (N_LEVELS - 1)
    w = {1: max(0.15, 1 - 1.3 * t)}
    if n > 8:
        w[2] = min(1.0, 0.25 + 2 * t)
    if n > 40:
        w[3] = min(1.0, (n - 40) / 120)
    return size, w


DIRS = {"right": (0, 1), "down": (1, 0)}
PERP = {"right": (1, 0), "down": (0, 1)}


class Grid:
    def __init__(self, rows, cols):
        self.rows, self.cols = rows, cols
        self.cells = {}  # (r,c) -> {"t": "L", "ch", "dirs"} | {"t": "C", "clues"} | {"t": "X"}
        self.words = []

    def inside(self, r, c):
        return 0 <= r < self.rows and 0 <= c < self.cols

    def get(self, r, c):
        return self.cells.get((r, c))

    def is_letter(self, r, c):
        cell = self.get(r, c)
        return cell is not None and cell["t"] == "L"

    def check(self, word, r, c, d):
        """Nombre de croisements si le mot peut être placé, sinon None."""
        dr, dc = DIRS[d]
        pr, pc = PERP[d]
        L = len(word)
        cr, cc = r - dr, c - dc  # case définition
        if not self.inside(cr, cc):
            return None
        clue = self.get(cr, cc)
        if clue is not None and (clue["t"] == "L" or (clue["t"] == "C" and d in clue["clues"])):
            return None
        er, ec = r + L * dr, c + L * dc  # case après la fin
        if self.inside(er, ec) and self.is_letter(er, ec):
            return None
        crossings = 0
        for i, ch in enumerate(word):
            rr, cc2 = r + i * dr, c + i * dc
            if not self.inside(rr, cc2):
                return None
            cell = self.get(rr, cc2)
            if cell is None:
                for s in (-1, 1):
                    if self.is_letter(rr + s * pr, cc2 + s * pc):
                        return None
            elif cell["t"] == "L":
                if cell["ch"] != ch or d in cell["dirs"]:
                    return None
                crossings += 1
            else:
                return None
        return crossings

    def place(self, entry, r, c, d):
        word = entry["word"]
        dr, dc = DIRS[d]
        cr, cc = r - dr, c - dc
        clue = self.get(cr, cc)
        if clue is None or clue["t"] == "X":
            clue = {"t": "C", "clues": {}}
            self.cells[(cr, cc)] = clue
        clue["clues"][d] = entry["clue"]
        for i, ch in enumerate(word):
            key = (r + i * dr, c + i * dc)
            cell = self.cells.setdefault(key, {"t": "L", "ch": ch, "dirs": set()})
            cell["dirs"].add(d)
        er, ec = r + len(word) * dr, c + len(word) * dc
        if self.inside(er, ec) and (er, ec) not in self.cells:
            self.cells[(er, ec)] = {"t": "X"}
        self.words.append({**entry, "r": r, "c": c, "dir": d})

    def candidates(self, entry):
        word = entry["word"]
        seen = set()
        for (r, c), cell in list(self.cells.items()):
            if cell["t"] != "L":
                continue
            for d, (dr, dc) in DIRS.items():
                if d in cell["dirs"]:
                    continue
                for k, ch in enumerate(word):
                    if ch != cell["ch"]:
                        continue
                    sr, sc = r - k * dr, c - k * dc
                    if (sr, sc, d) in seen:
                        continue
                    seen.add((sr, sc, d))
                    x = self.check(word, sr, sc, d)
                    if x:
                        yield sr, sc, d, x

    def letters(self):
        return sum(1 for v in self.cells.values() if v["t"] == "L")

    def export(self):
        out = []
        for r in range(self.rows):
            row = []
            for c in range(self.cols):
                cell = self.get(r, c)
                if cell is None or cell["t"] == "X":
                    row.append({"t": "B"})
                elif cell["t"] == "C":
                    row.append({"t": "C", "clues": cell["clues"]})
                else:
                    row.append({"t": "L", "a": cell["ch"]})
            out.append(row)
        return out


def build(words, rows, cols, weights, rng):
    pool = [w for w in words if w["tier"] in weights and 2 <= len(w["word"]) <= max(rows, cols) - 1]
    g = Grid(rows, cols)
    first_choices = [w for w in pool if len(w["word"]) >= cols - 3]
    first = rng.choice(first_choices or pool)
    d = rng.choice(["right", "down"])
    if d == "right":
        g.place(first, rng.randrange(1, rows - 1), 1, d)
    else:
        g.place(first, 1, rng.randrange(1, cols - 1), d)
    used = {first["word"]}
    while True:
        best = []
        for entry in pool:
            if entry["word"] in used:
                continue
            w = weights[entry["tier"]]
            for r, c, d, x in g.candidates(entry):
                score = (x * 3 + len(entry["word"])) * w + rng.random() * 2
                best.append((score, entry, r, c, d))
        if not best:
            break
        best.sort(key=lambda t: -t[0])
        _, entry, r, c, d = rng.choice(best[:3])
        g.place(entry, r, c, d)
        used.add(entry["word"])
    return g


def generate(words, size, weights, rng, attempts=25):
    best, best_score = None, -1
    for _ in range(attempts):
        g = build(words, size, size, weights, rng)
        score = g.letters() + 2 * len(g.words)
        if score > best_score:
            best, best_score = g, score
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=2026)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    raw = json.loads((ROOT / "data" / "words.json").read_text(encoding="utf-8"))
    out = {}
    for mode, field in MODES.items():
        seen, words = set(), []
        for w in raw:
            ans = w[field]
            if ans not in seen:
                seen.add(ans)
                words.append({"word": ans, "clue": w["clue"], "tier": w["tier"], "latin": w["word"], "ar": w["ar"]})
        levels = []
        for n in range(1, N_LEVELS + 1):
            size, weights = level_config(n)
            g = generate(words, size, weights, rng)
            # Format compact : la grille se déduit des mots (case définition juste avant chaque mot).
            levels.append({"n": n, "s": size, "w": [
                [w["word"], w["clue"], w["latin"], w["ar"], w["r"], w["c"], 0 if w["dir"] == "right" else 1]
                for w in g.words]})
            if n % 25 == 1:
                print(f"{mode} {n:>3}: {size}×{size}, {len(g.words)} mots", flush=True)
        out[mode] = levels
    dest = ROOT / "web" / "levels.js"
    dest.write_text("window.LEVELS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"→ {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
