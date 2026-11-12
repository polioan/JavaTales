# syntax=docker/dockerfile:1

FROM nginx:1.27-alpine

ADD --checksum=sha256:1c63cb85ad2fb6cfd7f7f1737cb28ccb0b9b9871b4a97ac5271c1fb5c9789049 \
  https://github.com/zb3/freej2me-web/archive/c19416e75cbc15f9a27f7e967ee81cb108761e30.tar.gz \
  /tmp/freej2me-web.tar.gz

RUN tar -xzf /tmp/freej2me-web.tar.gz -C /tmp \
  && mkdir -p /usr/share/nginx/html \
  && cp -R /tmp/freej2me-web-c19416e75cbc15f9a27f7e967ee81cb108761e30/web/. /usr/share/nginx/html/ \
  && rm -rf \
  /usr/share/nginx/html/libmidi/wasm \
  /usr/share/nginx/html/libmidi/test \
  /usr/share/nginx/html/libmedia/transcode/wasm \
  /usr/share/nginx/html/libmedia/test \
  /tmp/freej2me-web.tar.gz \
  /tmp/freej2me-web-c19416e75cbc15f9a27f7e967ee81cb108761e30 \
  && chmod -R a+rX /usr/share/nginx/html

COPY nginx.conf /opt/run/nginx.conf
COPY entrypoint.sh /opt/run/entrypoint.sh

RUN chmod 755 /opt/run/entrypoint.sh \
  && chmod a+r /opt/run/nginx.conf \
  && mkdir -p /input

EXPOSE 8080

ENTRYPOINT ["/opt/run/entrypoint.sh"]
