#!/bin/sh
set -eu

matchbox-window-manager &
sleep 0.2
exec java -Xmx1g -jar /opt/freej2me/freej2me.jar file:///input/game.jar
