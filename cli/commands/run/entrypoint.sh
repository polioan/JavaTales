#!/bin/sh
set -eu

mkdir -p \
	/tmp/nginx/client_body \
	/tmp/nginx/proxy \
	/tmp/nginx/fastcgi \
	/tmp/nginx/uwsgi \
	/tmp/nginx/scgi

exec nginx -e /dev/stderr -c /opt/run/nginx.conf
