# syntax=docker/dockerfile:1

FROM ubuntu:22.04

ARG ZULU_URL=https://cdn.azul.com/zulu/bin/zulu8.98.0.111-ca-jdk8.0.512-linux_i686.tar.gz
ARG ZULU_SHA256=e286bfe31e9f4d787a58912898b961869721562d7d89048841d011720dd8c18b
ARG WTK_URL=https://download.oracle.com/otn-pub/java/sun_java_wireless_toolkit/2.5.2_01/sun_java_wireless_toolkit-2.5.2_01-linuxi486.bin.sh
ARG WTK_SHA256=416ea8c8dc56e3563fc92e89bb9dde243662272bc4c88121d8fc1074044b4bb2
ARG SELKIES_VERSION=2.2.1

RUN dpkg --add-architecture i386 \
  && apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  ca-certificates \
  fontconfig \
  fonts-dejavu-core \
  libasound2:i386 \
  libasound2-plugins:i386 \
  libfontconfig1:i386 \
  libfreetype6:i386 \
  libgbm1 \
  libgcc-s1:i386 \
  libice6:i386 \
  libnsl2:i386 \
  libpulsedsp:i386 \
  libsm6:i386 \
  libstdc++6:i386 \
  libx11-6:i386 \
  libxext6:i386 \
  libxi6:i386 \
  libxkbcommon0 \
  libxrandr2:i386 \
  libxrender1:i386 \
  libxt6:i386 \
  libxtst6:i386 \
  openbox \
  pulseaudio \
  python3 \
  python3-pip \
  unzip \
  wget \
  xvfb \
  zlib1g:i386 \
  && rm -rf /var/lib/apt/lists/* \
  && printf '%s\n' 'pcm.!default { type pulse }' 'ctl.!default { type pulse }' > /etc/asound.conf \
  && pip3 install --no-cache-dir "selkies==${SELKIES_VERSION}"

RUN wget -q -O /tmp/zulu.tgz "$ZULU_URL" \
  && echo "$ZULU_SHA256  /tmp/zulu.tgz" | sha256sum -c - \
  && mkdir -p /opt/java \
  && tar -xzf /tmp/zulu.tgz -C /opt/java --strip-components=1 \
  && rm /tmp/zulu.tgz

RUN wget -q --no-cookies --header "Cookie: oraclelicense=accept-securebackup-cookie" -O /tmp/wtk.bin.sh "$WTK_URL" \
  && echo "$WTK_SHA256  /tmp/wtk.bin.sh" | sha256sum -c - \
  && tail -c +26625 /tmp/wtk.bin.sh > /tmp/wtk.zip \
  && mkdir -p /opt/wtk \
  && unzip -q /tmp/wtk.zip -d /opt/wtk \
  && rm /tmp/wtk.bin.sh /tmp/wtk.zip \
  && ldd /opt/java/bin/java \
  && ldd /opt/wtk/bin/libzayit.so \
  && test -f /usr/lib/i386-linux-gnu/pulseaudio/libpulsedsp.so

COPY nokia-ui /opt/nokia-ui
COPY entrypoint.sh /opt/wtk/entrypoint.sh

# dbus-daemon refuses a uid that is not in /etc/passwd, and Selkies wraps the session with dbus-run-session when that binary is present
RUN mkdir -p /tmp/nokia-ui/raw /tmp/nokia-ui/classes /opt/wtk/java-bin \
  && /opt/java/bin/javac -source 1.4 -target 1.4 -encoding UTF-8 -Xlint:-options \
  -bootclasspath /opt/wtk/lib/cldcapi11.jar:/opt/wtk/lib/midpapi21.jar \
  -d /tmp/nokia-ui/raw /opt/nokia-ui/src/com/nokia/mid/ui/*.java \
  && /opt/wtk/bin/preverify -classpath /opt/wtk/lib/cldcapi11.jar:/opt/wtk/lib/midpapi21.jar \
  -d /tmp/nokia-ui/classes /tmp/nokia-ui/raw \
  && /opt/java/bin/jar cf /opt/wtk/lib/nokiaui.jar -C /tmp/nokia-ui/classes . \
  && rm -rf /tmp/nokia-ui /opt/nokia-ui \
  && printf '%s\n' '#!/bin/sh' \
  'export LD_PRELOAD="/usr/lib/i386-linux-gnu/pulseaudio/libpulsedsp.so${LD_PRELOAD:+:$LD_PRELOAD}"' \
  'exec /opt/java/bin/java "$@"' > /opt/wtk/java-bin/java \
  && chmod 755 /opt/wtk/java-bin/java \
  && sed -i 's|^javapathtowtk=.*|javapathtowtk=/opt/wtk/java-bin/|' /opt/wtk/bin/emulator \
  && chmod 755 /opt/wtk/entrypoint.sh \
  && chmod -R a+rX /opt/wtk /opt/java /etc/asound.conf \
  && rm -f /usr/bin/dbus-run-session \
  && test -f /opt/wtk/lib/nokiaui.jar

ENV HOME=/tmp \
  TMPDIR=/tmp \
  XDG_CACHE_HOME=/tmp \
  JAVA_HOME=/opt/java \
  PATH=/opt/java/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

WORKDIR /tmp
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix && exec selkies session --session=/opt/wtk/entrypoint.sh --public=true --enable-basic-auth=false --ui-show-sidebar=false --ui-show-logo=false --ui-show-core-buttons=false --ui-show-connection-indicator=false --ui-title=WTK --manual-width=352 --manual-height=720 --encoder=jpeg --framerate=60 --gamepad-enabled=false --port=8080"]
