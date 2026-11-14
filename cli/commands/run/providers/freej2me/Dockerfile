# syntax=docker/dockerfile:1

FROM eclipse-temurin:17-jdk-jammy

ARG FREEJ2ME_COMMIT=eb4ac87e9a0b212ba701691eb67ee4892b2b1173
ARG SELKIES_VERSION=2.2.1

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  fontconfig \
  fonts-dejavu-core \
  libasound2 \
  libasound2-plugins \
  libgbm1 \
  libx11-6 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxkbcommon0 \
  libxrandr2 \
  libxrender1 \
  libxtst6 \
  matchbox-window-manager \
  pulseaudio \
  python3 \
  python3-pip \
  xvfb \
  && rm -rf /var/lib/apt/lists/* \
  && printf '%s\n' 'pcm.!default { type pulse }' 'ctl.!default { type pulse }' > /etc/asound.conf \
  && pip3 install --no-cache-dir "selkies==${SELKIES_VERSION}"

RUN curl -fsSL -o /tmp/freej2me.tar.gz "https://github.com/hex007/freej2me/archive/${FREEJ2ME_COMMIT}.tar.gz" \
  && mkdir -p /tmp/freej2me /opt/freej2me \
  && tar -xzf /tmp/freej2me.tar.gz -C /tmp/freej2me --strip-components=1 \
  && mkdir -p /tmp/freej2me/classes \
  && find /tmp/freej2me/src -name '*.java' > /tmp/freej2me.sources \
  && javac --release 17 -encoding UTF-8 -d /tmp/freej2me/classes @/tmp/freej2me.sources \
  && jar cfe /opt/freej2me/freej2me.jar org.recompile.freej2me.FreeJ2ME -C /tmp/freej2me/classes . -C /tmp/freej2me/resources . -C /tmp/freej2me META-INF \
  && rm -rf /tmp/freej2me /tmp/freej2me.tar.gz /tmp/freej2me.sources

COPY entrypoint.sh /opt/freej2me/entrypoint.sh

# dbus-daemon refuses a uid that is not in /etc/passwd, and Selkies wraps the session with dbus-run-session when that binary is present
RUN chmod 755 /opt/freej2me/entrypoint.sh \
  && chmod -R a+rX /opt/freej2me /etc/asound.conf \
  && rm -f /usr/bin/dbus-run-session

ENV HOME=/tmp \
  TMPDIR=/tmp \
  XDG_CACHE_HOME=/tmp

WORKDIR /tmp
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix && exec selkies session --session=/opt/freej2me/entrypoint.sh --public=true --enable-basic-auth=false --ui-show-sidebar=false --ui-show-logo=false --ui-show-core-buttons=false --ui-show-connection-indicator=false --ui-title=FreeJ2ME --manual-width=512 --manual-height=704 --encoder=jpeg --framerate=60 --gamepad-enabled=false --port=8080"]
