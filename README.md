# Daridja Mot Fléché

Mots fléchés en darija : une grille où les définitions sont en français et les réponses en darija.

## Jouer

Pensé pour iPhone (à ajouter sur l'écran d'accueil depuis Safari). Deux claviers au choix, latin ou arabe, chacun avec 252 niveaux du plus simple au plus corsé, répartis en 21 étapes d'un voyage en Algérie, de La Casbah jusqu'à l'Assekrem. On peut sauter à n'importe quel niveau depuis la carte. Tous les 3 niveaux réussis, une photo cadeau se débloque (168 en tout), à revoir dans la galerie. Thème clair, sombre ou automatique.

Mise en ligne : voir [DEPLOY.md](DEPLOY.md).

## Développer

```
python3 generator/generate.py   # régénère web/levels.js (252 niveaux par clavier)
python3 scripts/prepare_photos.py  # photos_src/ → web/photos/ (privé, hors git)
python3 build.py                # assemble dist/site/ (à déployer) et dist/daridja.html (aperçu)
```

- `data/words.json` : mots (arabizi + arabe), définition française, thème, palier 1 à 3
- `generator/generate.py` : générateur de grilles
- `web/` : le jeu (HTML/CSS/JS sans dépendance)

Orthographe latine : `3` = ع, `7` = ح, `q` = ق, `kh` = خ, `gh` = غ, `ch` = ش.

## Prochaines étapes

- Enrichir le dictionnaire avec MADAR (Alger) et classer les mots par fréquence (ayoubkirouane/Algerian-Darija).
- Récompenses en plus des photos : poésie (Hizia de Ben Guittoun), musique chaâbi et raï.
- Plus de mots : avec 140 mots, les niveaux avancés se répètent beaucoup.
- Révision des mots ratés.
