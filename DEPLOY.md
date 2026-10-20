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

## 2. La VM

**Option conseillée : la VM de signaltracker.fr.** Le jeu est un petit site statique, il ne la ralentit pas et reste gratuit. Passe directement à l'étape 3 avec le nom et la zone de cette VM. nginx refuse alice-daridja.fr à tout ce qui n'est pas Cloudflare, donc le pare-feu partagé ne pose pas de problème.

**Sinon, une VM dédiée** (une seule fois) :

```bash
./deploy/create-vm.sh
```

Crée une VM e2-micro Debian 12 nommée `daridja` dans `us-central1-a`, une IP fixe, nginx, et un pare-feu qui n'ouvre le port 80 qu'aux serveurs de Cloudflare (personne ne peut contourner Cloudflare Access en appelant l'IP directement). Le script affiche l'IP à mettre dans Cloudflare.

Google n'offre qu'une seule e2-micro gratuite par compte de facturation, dans `us-west1`, `us-central1` ou `us-east1`. Si celle de signaltracker.fr l'utilise déjà, cette deuxième VM coûte environ 7 € par mois.

## 3. Envoyer sur la VM

La VM `signal-tracker` (us-central1-a) passe par un **Cloudflare Tunnel** : aucun port web n'est ouvert, `cloudflared` amène le trafic aux services locaux. Le jeu suit le même chemin : nginx écoute seulement sur `127.0.0.1:8081`.

Depuis Cloud Shell :

```bash
TUNNEL=1 DOMAIN=alice-daridja.fr VM=signal-tracker ZONE=us-central1-a ./deploy/deploy.sh
```

Puis, une seule fois, brancher le domaine sur le tunnel.

**Tunnel géré localement** (cas de signal-tracker, la page du tunnel indique « managed locally ») :

```bash
DOMAIN=alice-daridja.fr VM=signal-tracker ZONE=us-central1-a ./deploy/tunnel-route.sh
```

Le script ajoute les deux noms dans `config.yml` sur la VM (sauvegarde, validation par cloudflared, retour arrière si erreur), puis redémarre le tunnel. Ensuite, dans Cloudflare → alice-daridja.fr → DNS, deux enregistrements proxifiés (nuage orange) :

| Type | Nom | Cible |
|---|---|---|
| CNAME | `@` | `5ab1fa74-7d81-4f8f-a4bb-05c220f8df95.cfargotunnel.com` |
| CNAME | `www` | `5ab1fa74-7d81-4f8f-a4bb-05c220f8df95.cfargotunnel.com` |

**Tunnel géré depuis le tableau de bord** : Zero Trust → Networks → Tunnels → le tunnel de signal-tracker → **Public Hostname** → *Add a public hostname*, deux fois :

| Subdomain | Domain | Service |
|---|---|---|
| *(vide)* | alice-daridja.fr | HTTP → `localhost:8081` |
| `www` | alice-daridja.fr | HTTP → `localhost:8081` |

Cloudflare crée lui-même les enregistrements DNS. Supprime les anciens `A` et `AAAA` sur `@` s'il en reste (sinon il refuse d'ajouter le nom).

Pour une VM sans tunnel, exposée sur le port 80 : même commande sans `TUNNEL=1`, puis l'enregistrement `A` décrit plus bas.

Le script construit le site, l'envoie, installe nginx si besoin, ajoute un bloc `server` pour ce domaine seulement (tes autres sites ne bougent pas) et vérifie que ça répond. Relance la même commande à chaque mise à jour.

## 4. Cloudflare

1. **DNS** : avec le tunnel, rien à faire (fait à l'étape 3). Sans tunnel : `A @` → IP de la VM et `CNAME www` → `alice-daridja.fr`, nuage orange.
2. **SSL/TLS** : SSL/TLS → Edge Certificates → **Always Use HTTPS** activé. Avec le tunnel, le trafic jusqu'à la VM est déjà chiffré, le mode SSL n'a pas d'importance. Sans tunnel, choisis **Flexible**.
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
