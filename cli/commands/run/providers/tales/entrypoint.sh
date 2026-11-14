#!/bin/sh
set -eu

export HOME=/tmp
export TMPDIR=/tmp

work=/tmp/work
www=/tmp/www

rm -rf "$work" "$www"
mkdir -p \
	"$work/game" \
	"$work/main" \
	"$www" \
	/tmp/nginx/client_body \
	/tmp/nginx/proxy \
	/tmp/nginx/fastcgi \
	/tmp/nginx/uwsgi \
	/tmp/nginx/scgi

(
	cd "$work/game"
	jar xf /input/game.jar
)

java -cp "/opt/run/prepare.jar:/opt/teavm/lib/*" javatales.prepare.Prepare \
	"$work/game" \
	"$www/resources.js" \
	"$work/Main.java"

javac --release 17 -encoding UTF-8 \
	-cp "/opt/run/runtime:$work/game" \
	-d "$work/main" \
	"$work/Main.java"
entry=$(cat "$work/entry.txt")

java -Xmx2g -cp "/opt/teavm/lib/*:/opt/teavm/teavm.jar:/opt/run/runtime:$work/main:$work/game" \
	org.teavm.cli.TeaVMRunner \
	-t js \
	-d "$www" \
	-f classes.js \
	-O 2 \
	--js-module-type none \
	"$entry"

cp /opt/run/page.html "$www/index.html"
chmod -R a+rX "$www"
exec nginx -p /tmp -c /opt/run/nginx.conf
