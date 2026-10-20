#!/usr/bin/env bash
# Crée la VM du jeu, une IP fixe et un pare-feu qui n'accepte le web que depuis Cloudflare.
# Usage : ./deploy/create-vm.sh   (variables optionnelles : VM, ZONE, PROJECT)
set -euo pipefail
VM=${VM:-daridja}
ZONE=${ZONE:-us-central1-a}
REGION=${ZONE%-*}
PROJECT_FLAG=${PROJECT:+--project=$PROJECT}

# Plages IPv4 de Cloudflare (liste officielle : https://www.cloudflare.com/ips-v4)
CF_IPS=173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22

echo "1/3  IP fixe (pour que l'enregistrement DNS ne casse pas au redémarrage)"
gcloud compute addresses create "$VM-ip" $PROJECT_FLAG --region "$REGION" 2>/dev/null || echo "     déjà créée"
IP=$(gcloud compute addresses describe "$VM-ip" $PROJECT_FLAG --region "$REGION" --format='get(address)')

echo "2/3  VM $VM (e2-micro, Debian 12) dans $ZONE"
gcloud compute instances create "$VM" $PROJECT_FLAG --zone "$ZONE" \
  --machine-type e2-micro --image-family debian-12 --image-project debian-cloud \
  --boot-disk-size 10GB --boot-disk-type pd-standard \
  --address "$IP" --tags daridja-web \
  --metadata startup-script='#!/bin/bash
command -v nginx >/dev/null || (apt-get update -qq && apt-get install -y -qq nginx)
rm -f /etc/nginx/sites-enabled/default && systemctl reload nginx'

echo "3/3  Pare-feu : port 80 ouvert uniquement à Cloudflare"
gcloud compute firewall-rules create "$VM-cloudflare-http" $PROJECT_FLAG \
  --allow tcp:80 --target-tags daridja-web --source-ranges "$CF_IPS" 2>/dev/null || echo "     règle déjà présente"

echo
echo "VM prête. IP : $IP"
echo "Dans Cloudflare → DNS : A « @ » → $IP et CNAME « www » → alice-daridja.fr, nuage orange."
echo "Ensuite : DOMAIN=alice-daridja.fr VM=$VM ZONE=$ZONE ./deploy/deploy.sh"
