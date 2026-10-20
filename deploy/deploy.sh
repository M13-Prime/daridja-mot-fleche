#!/usr/bin/env bash
# Met le jeu en ligne sur une VM Google Cloud avec nginx, derrière Cloudflare.
#
# Usage, VM avec Cloudflare Tunnel (cas de signal-tracker) :
#   TUNNEL=1 DOMAIN=alice-daridja.fr VM=signal-tracker ZONE=us-central1-a ./deploy/deploy.sh
#   nginx n'écoute que sur 127.0.0.1:8081, invisible depuis Internet ; le tunnel y amène le trafic.
#
# Usage, VM exposée sur le port 80 (proxy Cloudflare classique) :
#   DOMAIN=alice-daridja.fr VM=ma-vm ZONE=us-central1-a ./deploy/deploy.sh
#
# Variables optionnelles : PROJECT (projet GCP), PORT (port local en mode tunnel, 8081 par défaut)
# À lancer depuis Cloud Shell ou un ordinateur où `gcloud auth login` est fait.
set -euo pipefail

: "${DOMAIN:?Indique DOMAIN, par exemple DOMAIN=alice-daridja.fr}"
: "${VM:?Indique VM, le nom de ta VM (gcloud compute instances list)}"
: "${ZONE:?Indique ZONE, la zone de ta VM, par exemple us-central1-a}"
TUNNEL=${TUNNEL:-0}
PORT=${PORT:-8081}
PROJECT_FLAG=${PROJECT:+--project=$PROJECT}

cd "$(dirname "$0")/.."
echo "1/4  Construction du site"
python3 build.py
sed "s/__DOMAIN__/$DOMAIN/g" deploy/nginx-daridja.conf > dist/nginx-daridja.conf
if [ "$TUNNEL" = "1" ]; then
  # Écoute locale uniquement : seul cloudflared, sur la même machine, peut joindre le site.
  sed -i "s/listen 80;/listen 127.0.0.1:$PORT;/; /listen \[::\]:80;/d" dist/nginx-daridja.conf
  URL="http://127.0.0.1:$PORT/"
else
  URL="http://127.0.0.1/"
fi
tar -czf dist/site.tgz -C dist/site .

echo "2/4  Envoi sur la VM $VM"
gcloud compute scp $PROJECT_FLAG --zone "$ZONE" dist/site.tgz dist/nginx-daridja.conf "$VM":/tmp/

echo "3/4  Installation"
gcloud compute ssh $PROJECT_FLAG --zone "$ZONE" "$VM" --command "TUNNEL=$TUNNEL; "'
  set -e
  FRESH=0
  if ! command -v nginx >/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq nginx
    FRESH=1
  fi
  # En mode tunnel, on retire la page par défaut de nginx qui écouterait sur le port 80 public.
  if [ "$TUNNEL" = "1" ] && [ "$FRESH" = "1" ]; then sudo rm -f /etc/nginx/sites-enabled/default; fi
  sudo mkdir -p /var/www/daridja.new
  sudo tar -xzf /tmp/site.tgz -C /var/www/daridja.new
  sudo rm -rf /var/www/daridja.old
  if [ -d /var/www/daridja ]; then sudo mv /var/www/daridja /var/www/daridja.old; fi
  sudo mv /var/www/daridja.new /var/www/daridja
  sudo chown -R www-data:www-data /var/www/daridja
  sudo cp /tmp/nginx-daridja.conf /etc/nginx/sites-available/daridja
  sudo ln -sf /etc/nginx/sites-available/daridja /etc/nginx/sites-enabled/daridja
  sudo nginx -t
  sudo systemctl enable --now nginx >/dev/null 2>&1
  sudo systemctl reload nginx
  rm -f /tmp/site.tgz /tmp/nginx-daridja.conf
'

echo "4/4  Vérification"
if gcloud compute ssh $PROJECT_FLAG --zone "$ZONE" "$VM" --command "curl -fsS -o /dev/null -H 'Host: $DOMAIN' $URL"; then
  echo "Le jeu répond sur la VM ($URL)."
  if [ "$TUNNEL" = "1" ]; then
    echo "Dans Cloudflare : ajoute $DOMAIN et www.$DOMAIN au tunnel, service HTTP → localhost:$PORT."
  else
    IP=$(gcloud compute instances describe "$VM" $PROJECT_FLAG --zone "$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    echo "Dans Cloudflare : A « @ » → $IP et CNAME « www » → $DOMAIN, proxy activé (nuage orange)."
  fi
else
  echo "nginx ne répond pas. Erreurs : gcloud compute ssh $VM --zone $ZONE --command 'sudo journalctl -u nginx -n 30'"
  exit 1
fi
