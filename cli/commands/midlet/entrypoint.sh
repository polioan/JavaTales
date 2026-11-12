#!/bin/sh
set -eu

input=/input
output=/output/midlet.jar
build=/tmp/midlet-build
classes="$build/classes"
boot=/opt/me/cldcapi11.jar:/opt/me/midpapi20.jar:/opt/me/nokiaui.jar

export HOME=/tmp
export TMPDIR=/tmp

: "${MIDLET_NAME:?set MIDLET_NAME}"
: "${MIDLET_CLASS:?set MIDLET_CLASS}"

rm -rf "$build" /tmp/app /tmp/preverified.jar
mkdir -p "$classes"

find "$input" -type d -name '.*' -prune -o -type f -name '*.java' -print \
	> "$build/sources.list"

if ! [ -s "$build/sources.list" ]; then
	echo "No Java sources under $input" >&2
	exit 1
fi

while IFS= read -r file; do
	[ -n "$file" ] || continue
	printf '"%s"\n' "$file"
done < "$build/sources.list" > "$build/sources.args"

/opt/jdk8/bin/javac -encoding UTF-8 -source 1.3 -target 1.3 -Xlint:-options \
	-bootclasspath "$boot" \
	-extdirs "" \
	-d "$classes" \
	@"$build/sources.args"

cat > "$build/preverify.pro" << EOF
-injars $classes
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

find "$input" -type d -name '.*' -prune -o -type f ! -name '*.java' ! -name '.*' -print \
	> "$build/resources.list"

while IFS= read -r file; do
	[ -n "$file" ] || continue
	rel=${file#"$input"/}
	case "$rel" in
	META-INF|META-INF/*) continue ;;
	esac
	dest="/tmp/app/$rel"
	mkdir -p "$(dirname "$dest")"
	cp -- "$file" "$dest"
done < "$build/resources.list"

if [ -f "$input/META-INF/MANIFEST.MF" ]; then
	cp -- "$input/META-INF/MANIFEST.MF" /tmp/MANIFEST.MF
else
	icon=""
	if [ -f "$input/icon.png" ]; then
		icon="/icon.png"
	fi

	{
		printf '%s\n' \
			'Manifest-Version: 1.0' \
			"MIDlet-Name: $MIDLET_NAME" \
			'MIDlet-Version: 1.0' \
			'MIDlet-Vendor: JavaTales' \
			"MIDlet-1: $MIDLET_NAME,$icon,$MIDLET_CLASS" \
			'MicroEdition-Profile: MIDP-2.1' \
			'MicroEdition-Configuration: CLDC-1.1' \
			'MIDlet-Data-Size: 1024' \
			'Nokia-Platform: *'
		if [ -n "$icon" ]; then
			printf '%s\n' "MIDlet-Icon: $icon"
		fi
		printf '\n'
	} > /tmp/MANIFEST.MF
fi

jar cfm /tmp/midlet.jar /tmp/MANIFEST.MF -C /tmp/app .
cat /tmp/midlet.jar > "$output"
