# Mise en ligne (Google Cloud + Cloudflare)

Le jeu est un site statique : une page, des icônes, les photos. On le sert avec nginx sur la VM e2-micro gratuite, et Cloudflare s'occupe du HTTPS, du cache et de l'accès privé.

Domaine : **alice-daridja.fr** (et www.alice-daridja.fr, redirigé vers alice-daridja.fr).

## 0. Le domaine dans Cloudflare

Cloudflare ne vend pas les .fr : le domaine s'achète chez un registraire français (OVH, Gandi, Infomaniak…).

1. Cloudflare → **Add a site** → `alice-daridja.fr` → offre Free.
2. Cloudflare affiche deux serveurs de noms (`xxx.ns.cloudflare.com`). Chez le registraire, remplace les serveurs DNS du domaine par ces deux-là.
3. Attends l'e-mail « alice-daridja.fr is now active on Cloudflare » (souvent moins d'une heure, parfois jusqu'à 24 h).

## 1. Les photos

```bash
mkdir photos_src            # y copier les 168 photos (JPEG, PNG ou HEIC)
pip install pillow pillow-heif
python3 scripts/prepare_photos.py
```

L'ordre des cadeaux suit l'ordre alphabétique des fichiers : nomme-les `001.jpg` … `168.jpg` pour le choisir.
Légendes optionnelles dans `photos_src/captions.json` : `{"001.jpg": "Notre premier café"}`.
`photos_src/` et `web/photos/` sont ignorés par git : les photos ne partent jamais sur GitHub.

## 2. Créer la VM (une seule fois)

```bash
./deploy/create-vm.sh
```

Crée une VM e2-micro Debian 12 nommée `daridja` dans `us-central1-a`, une IP fixe, nginx, et un pare-feu qui n'ouvre le port 80 qu'aux serveurs de Cloudflare (personne ne peut contourner Cloudflare Access en appelant l'IP directement). Le script affiche l'IP à mettre dans Cloudflare.

Google n'offre qu'une seule e2-micro gratuite par compte de facturation, dans `us-west1`, `us-central1` ou `us-east1`. Si celle de signaltracker.fr l'utilise déjà, cette deuxième VM coûte environ 7 € par mois.

## 3. Envoyer sur la VM

Depuis Cloud Shell ou ton ordinateur (avec `gcloud auth login` fait) :

```bash
DOMAIN=alice-daridja.fr VM=daridja ZONE=us-central1-a ./deploy/deploy.sh
```

Le script construit le site, l'envoie, installe nginx si besoin, ajoute un bloc `server` pour ce domaine seulement (tes autres sites ne bougent pas) et vérifie que ça répond. Relance la même commande à chaque mise à jour.

## 4. Cloudflare

1. **DNS** :
   - `A`, nom `@`, valeur = IP externe de la VM, **proxy activé** (nuage orange)
   - `CNAME`, nom `www`, valeur `alice-daridja.fr`, proxy activé
2. **SSL/TLS** (nouveau domaine, donc à régler) :
   SSL/TLS → Overview → **Flexible** (Cloudflare chiffre jusqu'au téléphone, la VM reste en HTTP sur le port 80), puis SSL/TLS → Edge Certificates → **Always Use HTTPS** activé.
   Pour chiffrer aussi entre Cloudflare et la VM : **Full (strict)** avec un *Origin Certificate* (SSL/TLS → Origin Server) installé sur nginx en `listen 443 ssl`.
3. **Accès privé (recommandé, gratuit)** : Zero Trust → Access → Applications → *Self-hosted*, domaine `alice-daridja.fr` (ajoute aussi `www.alice-daridja.fr`), règle *Allow* avec son adresse e-mail et la tienne. Elle reçoit un code par e-mail une seule fois par mois. Sans ça, n'importe qui avec le lien voit vos photos.
4. **Après une mise à jour** : Caching → Purge Everything, pour que son téléphone récupère la nouvelle version tout de suite.

## 5. Sur son iPhone

Ouvrir le lien dans Safari → bouton Partager → **Sur l'écran d'accueil**. Le jeu s'ouvre alors en plein écran avec son icône, comme une application.

Sa progression est enregistrée dans Safari sur son téléphone. Si elle efface les données de Safari, elle repart du niveau 1.

## Variante : Cloud Run

Si tu préfères ne pas toucher à la VM :

```bash
python3 scripts/prepare_photos.py && python3 build.py
gcloud run deploy daridja --source . --region europe-west1 --allow-unauthenticated
```

Puis, pour le domaine : `gcloud beta run domain-mappings create --service daridja --domain alice-daridja.fr --region europe-west1`, puis dans Cloudflare les enregistrements `A`/`AAAA` que Google affiche, en **DNS only** (nuage gris) le temps que Google émette le certificat.
