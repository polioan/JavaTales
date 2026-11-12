#!/bin/sh
set -eu

sources=/sources
input=/input/game.jar
output=/output
build=/tmp/unpack-build
classes="$build/classes"

libs="$sources/BounceTales/BounceTools/submodules/XStandard/lib"
cp="$classes:$libs/joml-1.10.0.jar:$libs/frankenjfx.jar:$libs/frankenjfx-natives-win32.jar"

export HOME=/tmp
export TMPDIR=/tmp

rm -rf "$build"
mkdir -p "$classes" "$output"

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
echo '/opt/unpack/Unpack.java' >> "$build/tools.list"
javac -encoding UTF-8 -classpath "$cp" -d "$classes" @"$build/tools.list"

java -Djava.awt.headless=true -Duser.home=/tmp -classpath "$cp" javatales.unpack.Unpack "$input" "$output" > /dev/null

rm -rf "$output/src"
cp -R "$sources/BounceTales/BounceTales/src" "$output/src"

cat > "$output/composer.yml" << 'EOF'
Obfuscate: true
DestDir: res
IncludeRoot: src
ResMapIncludeClass: bouncetales.ResourceID
MsgMapIncludeClass: bouncetales.MessageID
EOF
