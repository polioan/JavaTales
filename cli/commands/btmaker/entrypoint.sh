#!/bin/sh
set -eu

export HOME=/tmp
export TMPDIR=/tmp
export XDG_CACHE_HOME=/tmp
export XDG_CONFIG_HOME=/tmp/.config
export GDK_BACKEND=x11

mkdir -p "$XDG_CONFIG_HOME/openbox"
cat > "$XDG_CONFIG_HOME/openbox/menu.xml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_menu xmlns="http://openbox.org/3.4/menu">
<menu id="root-menu" label="Openbox" />
</openbox_menu>
EOF

ln -sfn /work /tmp/JavaTales

openbox >/tmp/openbox.log 2>&1 &
sleep 0.3

exec java \
	--module-path /opt/btmaker/classes:/opt/btmaker/modules \
	--enable-native-access=javafx.graphics \
	-Duser.home=/tmp \
	-Dprism.order=sw \
	-Dprism.lcdtext=false \
	-m BTMaker.BTMaker/BTMaker.BTMaker.TrueMain
