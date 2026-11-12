#!/bin/sh
set -eu

sources=/sources
input=/input
output=/output/game.jar
work=/tmp/work
build=/tmp/pack-build
classes="$build/classes"
midlet=/tmp/midlet
boot=/opt/me/cldcapi11.jar:/opt/me/midpapi20.jar:/opt/me/nokiaui.jar

libs="$sources/BounceTales/BounceTools/submodules/XStandard/lib"
cp="$classes:$libs/joml-1.10.0.jar:$libs/frankenjfx.jar:$libs/frankenjfx-natives-win32.jar"

export HOME=/tmp
export TMPDIR=/tmp

rm -rf "$build" "$work" "$midlet" /tmp/app
mkdir -p "$classes" "$work" "$midlet"

cp -R "$input/." "$work/"

find "$sources/BounceTales/BounceTools/submodules/XStandard/src" -name '*.java' > "$build/xstandard.list"
javac -encoding UTF-8 -classpath "$cp" -d "$classes" @"$build/xstandard.list"

cat > "$build/game.list" << EOF
$sources/BounceTales/BounceTales/src/bouncetales/LevelKey.java
$sources/BounceTales/BounceTales/src/bouncetales/LP32.java
$sources/BounceTales/BounceTales/src/bouncetales/Matrix.java
EOF
find "$sources/BounceTales/BounceTales/src/bouncetales/ext/rsc" -name '*.java' >> "$build/game.list"
javac -encoding UTF-8 -classpath "$cp" -d "$classes" @"$build/game.list"

find "$sources/BounceTales/BounceTools/src" -name '*.java' ! -name 'ResourceDump.java' > "$build/tools.list"
echo '/opt/pack/Pack.java' >> "$build/tools.list"
javac -encoding UTF-8 -classpath "$cp" -d "$classes" @"$build/tools.list"

java -Djava.awt.headless=true -Duser.home=/tmp -classpath "$cp" javatales.pack.Pack "$work"

find "$work/src" -name '*.java' > "$build/midlet.list"
/opt/jdk8/bin/javac -encoding UTF-8 -source 1.3 -target 1.3 -Xlint:-options \
	-bootclasspath "$boot" \
	-extdirs "" \
	-d "$midlet" \
	@"$build/midlet.list"

cat > "$build/preverify.pro" << EOF
-injars $midlet
-outjars /tmp/preverified.jar
-libraryjars /opt/me/cldcapi11.jar
-libraryjars /opt/me/midpapi20.jar
-libraryjars /opt/me/nokiaui.jar
-microedition
-target 1.3
-dontshrink
-dontoptimize
-dontobfuscate
-dontnote
EOF

java -jar /opt/proguard/proguard.jar @"$build/preverify.pro"

mkdir -p /tmp/app
(
	cd /tmp/app
	jar xf /tmp/preverified.jar
)
rm -rf /tmp/app/META-INF
cp -R "$work/res/." /tmp/app/

cat > /tmp/MANIFEST.MF << 'EOF'
Manifest-Version: 1.0
MIDlet-Name: Bounce Tales
MIDlet-Version: 2.0.25
MIDlet-Vendor: Nokia
MIDlet-1: Bounce Tales,/icon.png,bouncetales.RMIDlet
MIDlet-Icon: /icon.png
MicroEdition-Profile: MIDP-2.0
MicroEdition-Configuration: CLDC-1.1
MIDlet-Data-Size: 1024
Nokia-MIDlet-Category: Game
Nokia-Platform: *

EOF

jar cfm /tmp/game.jar /tmp/MANIFEST.MF -C /tmp/app .
cat /tmp/game.jar > "$output"
