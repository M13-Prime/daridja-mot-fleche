# Daridja Mot Fléché

Mots fléchés en darija : une grille où les définitions sont en français et les réponses en darija.

## Jouer

Ouvrir `dist/daridja.html` (un seul fichier, pensé pour iPhone). Deux claviers au choix, latin ou arabe, chacun avec 30 niveaux du plus simple au plus corsé, répartis en 5 chapitres (La Casbah, Oran, Tlemcen, Djurdjura, Tassili). On peut sauter à n'importe quel niveau depuis la carte.

## Développer

```
python3 generator/generate.py   # régénère web/levels.js (30 niveaux par clavier)
python3 build.py                # assemble dist/daridja.html
```

- `data/words.json` : mots (arabizi + arabe), définition française, thème, palier 1 à 3
- `generator/generate.py` : générateur de grilles
- `web/` : le jeu (HTML/CSS/JS sans dépendance)

Orthographe latine : `3` = ع, `7` = ح, `q` = ق, `kh` = خ, `gh` = غ, `ch` = ش.

## Prochaines étapes

- Enrichir le dictionnaire avec MADAR (Alger) et classer les mots par fréquence (ayoubkirouane/Algerian-Darija).
- Récompenses : poésie (Hizia de Ben Guittoun), images, musique chaâbi et raï.
- Révision des mots ratés.
