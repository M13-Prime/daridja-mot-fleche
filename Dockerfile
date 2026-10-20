# Variante Cloud Run (au lieu de la VM) : python3 build.py, puis
#   gcloud run deploy daridja --source . --region europe-west1 --allow-unauthenticated
FROM nginx:1.27-alpine
COPY deploy/nginx-cloudrun.conf /etc/nginx/conf.d/default.conf
COPY dist/site /usr/share/nginx/html
EXPOSE 8080
