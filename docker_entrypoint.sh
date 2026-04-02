#!/bin/sh
cat << EOF > /var/www/html/env.js
window.APP_MAIN_BACKEND_URL="${APP_MAIN_BACKEND_URL}"
if(!window.APP_MAIN_BACKEND_URL) {console.error("APP_MAIN_BACKEND_URL must be specified")}

window.APP_KEYCLOAK_URL="${APP_KEYCLOAK_URL}"
if(!window.APP_KEYCLOAK_URL) {console.error("APP_KEYCLOAK_URL must be specified")}

window.APP_KEYCLOAK_REALM="${APP_KEYCLOAK_REALM}"
if(!window.APP_KEYCLOAK_REALM) {console.error("APP_KEYCLOAK_REALM must be specified")}

window.APP_KEYCLOAK_CLIENT_ID="${APP_KEYCLOAK_CLIENT_ID}"
if(!window.APP_KEYCLOAK_CLIENT_ID) {console.error("APP_KEYCLOAK_CLIENT_ID must be specified")}

EOF

env_js="/var/www/html/env.js"
sw_js="/var/www/html/service-worker.js"
index_html="/var/www/html/index.html"
if [ ! -f "$env_js" ]; then
echo "Файл $env_js не найден."
fi
if [ ! -f "$sw_js" ]; then
echo "Файл $env_js не найден."
fi
if [ ! -f "$index_html" ]; then
echo "Файл $index_html не найден."
fi
env_hash=$(openssl dgst -sha256 -binary "$env_js" | openssl base64 -A)
echo $env_hash
if [ -z "$env_hash" ]; then
echo "Не удалось вычислить хеш для $env_js"
exit 1
fi
sed -i "s|<script src=\"/env.js\"></script>|<script src=\"/env.js\" integrity=\"sha256-${env_hash}\"></script>|g" "$index_html"

sw_hash=$(openssl dgst -sha256 -binary "$sw_js" | openssl base64 -A)
echo $sw_hash
if [ -z "$sw_hash" ]; then
echo "Не удалось вычислить хеш для $sw_hash"
exit 1
fi
sed -i "s|<script src=\"/service-worker.js\"></script>|<script src=\"/service-worker.js\" integrity=\"sha256-${sw_hash}\"></script>|g" "$index_html"

nginx -g 'daemon off;'
