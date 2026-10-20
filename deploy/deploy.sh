#!/usr/bin/env bash
# Met le jeu en ligne sur une VM Google Cloud (ex. l'e2-micro gratuite) avec nginx, derrière Cloudflare.
#
# Usage :
#   DOMAIN=alice-daridja.fr VM=ma-vm ZONE=europe-west1-b ./deploy/deploy.sh
# Variables optionnelles : PROJECT (projet GCP, sinon celui par défaut de gcloud)
#
# À lancer depuis Cloud Shell ou un ordinateur où `gcloud auth login` est fait.
set -euo pipefail

: "${DOMAIN:?Indique DOMAIN, par exemple DOMAIN=alice-daridja.fr}"
: "${VM:?Indique VM, le nom de ta VM (gcloud compute instances list)}"
: "${ZONE:?Indique ZONE, la zone de ta VM, par exemple europe-west1-b}"
PROJECT_FLAG=${PROJECT:+--project=$PROJECT}

cd "$(dirname "$0")/.."
echo "1/4  Construction du site"
python3 build.py
sed "s/__DOMAIN__/$DOMAIN/g" deploy/nginx-daridja.conf > dist/nginx-daridja.conf
tar -czf dist/site.tgz -C dist/site .

echo "2/4  Envoi sur la VM $VM"
gcloud compute scp $PROJECT_FLAG --zone "$ZONE" dist/site.tgz dist/nginx-daridja.conf "$VM":/tmp/

echo "3/4  Installation"
gcloud compute ssh $PROJECT_FLAG --zone "$ZONE" "$VM" --command '
  set -e
  if ! command -v nginx >/dev/null; then sudo apt-get update -qq && sudo apt-get install -y -qq nginx; fi
  sudo mkdir -p /var/www/daridja.new
  sudo tar -xzf /tmp/site.tgz -C /var/www/daridja.new
  sudo rm -rf /var/www/daridja.old
  if [ -d /var/www/daridja ]; then sudo mv /var/www/daridja /var/www/daridja.old; fi
  sudo mv /var/www/daridja.new /var/www/daridja
  sudo chown -R www-data:www-data /var/www/daridja
  sudo cp /tmp/nginx-daridja.conf /etc/nginx/sites-available/daridja
  sudo ln -sf /etc/nginx/sites-available/daridja /etc/nginx/sites-enabled/daridja
  sudo nginx -t
  sudo systemctl reload nginx
  rm -f /tmp/site.tgz /tmp/nginx-daridja.conf
'

echo "4/4  Vérification"
IP=$(gcloud compute instances describe "$VM" $PROJECT_FLAG --zone "$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
if curl -fsS -o /dev/null -H "Host: $DOMAIN" "http://$IP/"; then
  echo "En ligne sur la VM ($IP)."
  echo "Dans Cloudflare : A « @ » → $IP et CNAME « www » → $DOMAIN, proxy activé (nuage orange)."
else
  echo "La VM ne répond pas sur le port 80. Vérifie la règle de pare-feu « allow-http » de la VM."
  exit 1
fi
