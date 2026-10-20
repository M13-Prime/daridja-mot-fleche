#!/usr/bin/env bash
# Ajoute le jeu à un Cloudflare Tunnel géré localement (config.yml sur la VM).
#
# Usage :
#   DOMAIN=alice-daridja.fr VM=signal-tracker ZONE=us-central1-a ./deploy/tunnel-route.sh
# Variables optionnelles : PROJECT, PORT (8081 par défaut)
#
# Sécurité : sauvegarde de config.yml, validation par cloudflared, et retour à l'ancienne
# configuration si la validation échoue. Les routes existantes (signaltracker.fr) ne changent pas.
set -euo pipefail

: "${DOMAIN:?Indique DOMAIN, par exemple DOMAIN=alice-daridja.fr}"
: "${VM:?Indique VM}"
: "${ZONE:?Indique ZONE}"
PORT=${PORT:-8081}
PROJECT_FLAG=${PROJECT:+--project=$PROJECT}

gcloud compute ssh $PROJECT_FLAG --zone "$ZONE" "$VM" --command "DOMAIN='$DOMAIN' PORT='$PORT' bash -s" <<'REMOTE'
set -euo pipefail

# Où est le fichier de configuration utilisé par le service ?
CFG=$(systemctl cat cloudflared 2>/dev/null | grep -oE -- '--config[= ][^ ]+' | head -1 | sed -E 's/--config[= ]//' || true)
if [ -z "$CFG" ]; then
  for f in /etc/cloudflared/config.yml /etc/cloudflared/config.yaml /root/.cloudflared/config.yml "$HOME/.cloudflared/config.yml"; do
    if sudo test -f "$f"; then CFG=$f; break; fi
  done
fi
if [ -z "$CFG" ] || ! sudo test -f "$CFG"; then
  echo "config.yml introuvable. Montre-moi : systemctl cat cloudflared" >&2; exit 1
fi
echo "Configuration : $CFG"

if sudo grep -qE "hostname:[[:space:]]*$DOMAIN[[:space:]]*$" "$CFG"; then
  echo "$DOMAIN est déjà dans le tunnel, rien à changer."
  sudo grep -oE 'tunnel:[[:space:]]*[0-9a-f-]+' "$CFG" || true
  exit 0
fi

BACKUP="$CFG.bak-$(date +%Y%m%d-%H%M%S)"
sudo cp "$CFG" "$BACKUP"
echo "Sauvegarde : $BACKUP"

# Insère les deux noms juste avant la règle finale « - service: http_status:404 », avec la même indentation.
TMP=$(mktemp)
sudo awk -v d="$DOMAIN" -v p="$PORT" '
  !done && /^[[:space:]]*- service:[[:space:]]*http_status/ {
    match($0, /^[[:space:]]*/); ind = substr($0, 1, RLENGTH)
    print ind "- hostname: " d;        print ind "  service: http://localhost:" p
    print ind "- hostname: www." d;    print ind "  service: http://localhost:" p
    done = 1
  }
  { print }
  END { if (!done) exit 3 }
' "$CFG" > "$TMP" || { echo "Pas de règle finale « - service: http_status:404 » dans $CFG : je ne touche à rien." >&2; rm -f "$TMP"; exit 1; }
sudo cp "$TMP" "$CFG"; rm -f "$TMP"

if ! sudo cloudflared tunnel --config "$CFG" ingress validate; then
  echo "Configuration refusée par cloudflared : retour à l'ancienne." >&2
  sudo cp "$BACKUP" "$CFG"; exit 1
fi

sudo systemctl restart cloudflared
sleep 3
if ! systemctl is-active --quiet cloudflared; then
  echo "cloudflared ne redémarre pas : retour à l'ancienne configuration." >&2
  sudo cp "$BACKUP" "$CFG"; sudo systemctl restart cloudflared; exit 1
fi

echo
echo "Tunnel mis à jour. Règles actuelles :"
sudo cloudflared tunnel --config "$CFG" ingress rule "https://$DOMAIN" || true
sudo grep -A1 -E 'hostname:' "$CFG"
REMOTE

echo
echo "Reste à créer dans Cloudflare → alice-daridja.fr → DNS, nuage orange :"
echo "  CNAME  @    → <ID du tunnel>.cfargotunnel.com"
echo "  CNAME  www  → <ID du tunnel>.cfargotunnel.com"
