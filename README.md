# Daridja Mot Fléché

Mots fléchés en darija : une grille où les définitions sont en français et les réponses en darija.

## Statut

Squelette initial. Hypothèses de départ (à valider) :

- Jeu web statique (HTML/CSS/JS), jouable dans le navigateur, sans backend.
- Darija écrite en alphabet latin (arabizi : `3`, `7`, `9`…) pour tenir dans une grille.
- Dictionnaire de mots dans `data/words.json`, grilles générées ou écrites à la main.

## Lancer

```
python3 generator/generate.py   # régénère web/grids.js
open web/index.html             # aucune installation nécessaire
```

## Structure

```
data/words.json         dictionnaire de départ (mot, définition, thème, palier 1-3)
generator/generate.py   générateur de grilles (facile 7×7, moyen 9×9, difficile 11×11)
web/                    le jeu (HTML/CSS/JS statique)
```

## Orthographe

`3` = ع, `7` = ح, `q` = ق, `kh` = خ, `gh` = غ, `ch` = ش. Une lettre par case.

## Prochaines étapes

- Remplacer le dictionnaire de départ par MADAR (Alger) et classer les mots par fréquence (corpus ayoubkirouane/Algerian-Darija).
- Gamification : progression, séries, XP, révision des mots ratés.
- Récompenses : images, poésie et musique.
