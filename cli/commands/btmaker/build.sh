#!/bin/sh
set -eu

maven="/opt/apache-maven-${MAVEN_VERSION:?set MAVEN_VERSION}/bin/mvn"

"$maven" -B \
	org.apache.maven.plugins:maven-dependency-plugin:3.8.1:copy-dependencies \
	-DoutputDirectory=/tmp/deps \
	-DincludeScope=compile

mkdir -p /opt/btmaker/classes /opt/btmaker/modules

for jar in /tmp/deps/*.jar; do
	base=$(basename "$jar")
	case "$base" in
	javafx-*)
		size=$(wc -c < "$jar")
		if [ "$size" -gt 10000 ] && unzip -l "$jar" | grep -q 'module-info.class'; then
			cp "$jar" /opt/btmaker/modules/
		fi
		;;
	*)
		cp "$jar" /opt/btmaker/modules/
		;;
	esac
done

test -n "$(find /opt/btmaker/modules -name 'javafx-graphics-*.jar' -print -quit)"
test -n "$(find /opt/btmaker/modules -name 'javafx-controls-*.jar' -print -quit)"
test -n "$(find /opt/btmaker/modules -name 'javafx-fxml-*.jar' -print -quit)"
test -n "$(find /opt/btmaker/modules -name 'commons-lang3-*.jar' -print -quit)"

find src/main/java -name '*.java' > /tmp/sources.list
javac --release 25 -encoding UTF-8 \
	--module-path /opt/btmaker/modules \
	-d /opt/btmaker/classes \
	@/tmp/sources.list
cp -a src/main/resources/. /opt/btmaker/classes/
test -f /opt/btmaker/classes/module-info.class
test -f /opt/btmaker/classes/btMaker.fxml
chmod -R a+rX /opt/btmaker
