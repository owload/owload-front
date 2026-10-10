FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The editor extensions come from GitHub at the exact commits pinned in package-lock.json and are built here (git is in this image).
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.31-alpine

LABEL org.opencontainers.image.title="owload-frontend" \
      org.opencontainers.image.description="The web client of Owload, an encrypted virtual drive" \
      org.opencontainers.image.source="https://github.com/owload/owload-front"

RUN apk add --no-cache openssl
COPY nginx_conf/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /var/www/html
COPY docker_entrypoint.sh /docker_entrypoint.sh

# The address of the API and of Keycloak are not in the image: the start-up script writes them into env.js from
# APP_MAIN_BACKEND_URL, APP_KEYCLOAK_URL, APP_KEYCLOAK_REALM and APP_KEYCLOAK_CLIENT_ID, so the same image serves any installation.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["/bin/sh", "/docker_entrypoint.sh"]
