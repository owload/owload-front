FROM nginx:alpine

RUN apk add --no-cache openssl

ADD ./nginx_conf/default.conf /etc/nginx/conf.d/default.conf

COPY ./dist /var/www/html
COPY docker_entrypoint.sh /docker_entrypoint.sh

CMD ["/bin/sh","docker_entrypoint.sh"]

EXPOSE 80
