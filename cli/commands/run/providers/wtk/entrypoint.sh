#!/bin/sh
set -eu

mkdir -p /tmp/suite /tmp/.config/openbox
cat > /tmp/.config/openbox/menu.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_menu xmlns="http://openbox.org/3.4/menu">
<menu id="root-menu" label="Openbox" />
</openbox_menu>
EOF

openbox >/tmp/openbox.log 2>&1 &
sleep 0.3

cp /input/game.jar /tmp/suite/game.jar
(
  cd /tmp/suite
  /opt/java/bin/jar xf /opt/wtk/lib/nokiaui.jar com
  /opt/java/bin/jar uf game.jar com
  rm -rf com
)

class=$(unzip -p /input/game.jar META-INF/MANIFEST.MF | tr -d '\r' | awk '
  /^[ \t]/ { sub(/^[ \t]/, ""); line = line $0; next }
  { if (line != "") print line; line = $0 }
  END { if (line != "") print line }
' | awk -F, '/^MIDlet-1:/ { gsub(/^[ \t]+|[ \t]+$/, "", $NF); print $NF; exit }')

if [ -z "$class" ]; then
  echo "the jar manifest has no MIDlet-1" >&2
  exit 1
fi

cd /tmp/suite
exec /opt/wtk/bin/emulator -Xdevice:DefaultColorPhone -Xheapsize:2M -classpath /tmp/suite/game.jar "$class"
