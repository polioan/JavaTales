# syntax=docker/dockerfile:1

FROM eclipse-temurin:25-jdk-jammy AS build

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  unzip \
  && rm -rf /var/lib/apt/lists/*

ARG MAVEN_VERSION=3.9.16
ARG MAVEN_SHA512=831a8591fe20c8243b1dbe7d71e3244f31d1665b0804b2e825e38cbbe5ce0cafb8338851f90780735568773e0a6cd07bbec107cda0b896b008b861075358b6f6

RUN curl -fsSL -o /tmp/maven.tgz "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/${MAVEN_VERSION}/apache-maven-${MAVEN_VERSION}-bin.tar.gz" \
  && echo "${MAVEN_SHA512}  /tmp/maven.tgz" | sha512sum -c - \
  && tar -xzf /tmp/maven.tgz -C /opt \
  && rm /tmp/maven.tgz

COPY --from=editor pom.xml /tmp/btmaker/pom.xml
COPY --from=editor src /tmp/btmaker/src
COPY build.sh /tmp/btmaker/build.sh

WORKDIR /tmp/btmaker

RUN chmod 755 /tmp/btmaker/build.sh \
  && MAVEN_VERSION="${MAVEN_VERSION}" /tmp/btmaker/build.sh

FROM eclipse-temurin:25-jdk-jammy

ARG SELKIES_VERSION=2.2.1

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  ca-certificates \
  fontconfig \
  fonts-dejavu-core \
  libasound2 \
  libasound2-plugins \
  libgbm1 \
  libgl1 \
  libgl1-mesa-dri \
  libgtk-3-0 \
  libx11-6 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxkbcommon0 \
  libxrandr2 \
  libxrender1 \
  libxtst6 \
  libxxf86vm1 \
  openbox \
  pulseaudio \
  python3 \
  python3-pip \
  xvfb \
  && rm -rf /var/lib/apt/lists/* \
  && printf '%s\n' 'pcm.!default { type pulse }' 'ctl.!default { type pulse }' > /etc/asound.conf \
  && pip3 install --no-cache-dir "selkies==${SELKIES_VERSION}"

COPY --from=build /opt/btmaker /opt/btmaker
COPY entrypoint.sh /opt/btmaker/entrypoint.sh

# dbus-daemon refuses a uid that is not in /etc/passwd, and Selkies wraps the session with dbus-run-session when that binary is present
RUN chmod 755 /opt/btmaker/entrypoint.sh \
  && chmod -R a+rX /opt/btmaker /etc/asound.conf \
  && rm -f /usr/bin/dbus-run-session

ENV HOME=/tmp \
  TMPDIR=/tmp \
  XDG_CACHE_HOME=/tmp

WORKDIR /tmp
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix && exec selkies session --session=/opt/btmaker/entrypoint.sh --public=true --enable-basic-auth=false --ui-show-sidebar=false --ui-show-logo=false --ui-show-core-buttons=false --ui-show-connection-indicator=false --ui-title=BTMaker --manual-width=1440 --manual-height=900 --encoder=jpeg --framerate=60 --gamepad-enabled=false --port=8080"]
