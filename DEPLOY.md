# Mise en ligne (Google Cloud + Cloudflare)

Le jeu est un site statique : une page, des icônes, les photos. On le sert avec nginx sur la VM e2-micro gratuite, et Cloudflare s'occupe du HTTPS, du cache et de l'accès privé.

## 1. Les photos

```bash
mkdir photos_src            # y copier les 168 photos (JPEG, PNG ou HEIC)
pip install pillow pillow-heif
python3 scripts/prepare_photos.py
```

L'ordre des cadeaux suit l'ordre alphabétique des fichiers : nomme-les `001.jpg` … `168.jpg` pour le choisir.
Légendes optionnelles dans `photos_src/captions.json` : `{"001.jpg": "Notre premier café"}`.
`photos_src/` et `web/photos/` sont ignorés par git : les photos ne partent jamais sur GitHub.

## 2. Envoyer sur la VM

Depuis Cloud Shell ou ton ordinateur (avec `gcloud auth login` fait) :

```bash
DOMAIN=daridja.tondomaine.fr VM=nom-de-ta-vm ZONE=europe-west1-b ./deploy/deploy.sh
```

Le script construit le site, l'envoie, installe nginx si besoin, ajoute un bloc `server` pour ce domaine seulement (tes autres sites ne bougent pas) et vérifie que ça répond. Relance la même commande à chaque mise à jour.

Si la VM sert déjà un autre site avec Caddy ou un conteneur sur le port 80 au lieu de nginx, dis-le avant de lancer le script.

## 3. Cloudflare

1. **DNS** : enregistrement `A`, nom `daridja`, valeur = IP externe de la VM, **proxy activé** (nuage orange).
2. **SSL/TLS** : garde le mode de ta zone.
   - En **Flexible**, rien à faire.
   - En **Full (strict)**, crée un *Origin Certificate* (SSL/TLS → Origin Server) pour `daridja.tondomaine.fr`, copie-le sur la VM et ajoute un `listen 443 ssl` avec ces fichiers dans `/etc/nginx/sites-available/daridja`.
3. **Accès privé (recommandé, gratuit)** : Zero Trust → Access → Applications → *Self-hosted*, domaine `daridja.tondomaine.fr`, règle *Allow* avec son adresse e-mail et la tienne. Elle reçoit un code par e-mail une seule fois par mois. Sans ça, n'importe qui avec le lien voit vos photos.
4. **Après une mise à jour** : Caching → Purge Everything, pour que son téléphone récupère la nouvelle version tout de suite.

## 4. Sur son iPhone

Ouvrir le lien dans Safari → bouton Partager → **Sur l'écran d'accueil**. Le jeu s'ouvre alors en plein écran avec son icône, comme une application.

Sa progression est enregistrée dans Safari sur son téléphone. Si elle efface les données de Safari, elle repart du niveau 1.

## Variante : Cloud Run

Si tu préfères ne pas toucher à la VM :

```bash
python3 scripts/prepare_photos.py && python3 build.py
gcloud run deploy daridja --source . --region europe-west1 --allow-unauthenticated
```

Puis, pour le domaine : `gcloud beta run domain-mappings create --service daridja --domain daridja.tondomaine.fr --region europe-west1`, et dans Cloudflare un `CNAME daridja → ghs.googlehosted.com` en **DNS only** (nuage gris) le temps que Google émette le certificat.
