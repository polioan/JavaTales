# syntax=docker/dockerfile:1

FROM eclipse-temurin:8-jdk-jammy AS jdk8

FROM eclipse-temurin:17-jdk-jammy

COPY --from=jdk8 /opt/java/openjdk /opt/jdk8

ADD --checksum=sha256:f86f41bfb4097e4bd9cdfeca528960f6977cbda0f5785342adef9909a6a3baef \
  https://repo1.maven.org/maven2/org/microemu/cldcapi11/2.0.4/cldcapi11-2.0.4.jar \
  /opt/me/cldcapi11.jar

ADD --checksum=sha256:b7f6ed5e0344c7000643ecc114e6edff3587e8e77face546af0e12ffd6dbe826 \
  https://repo1.maven.org/maven2/org/microemu/midpapi20/2.0.4/midpapi20-2.0.4.jar \
  /opt/me/midpapi20.jar

ADD --checksum=sha256:ce491ec6ed3a8c03b663db65ea31702acd710d7b0af16e12b81a016da57600d6 \
  https://github.com/Guardsquare/proguard/releases/download/v7.6.1/proguard-7.6.1.zip \
  /tmp/proguard.zip

RUN jar xf /tmp/proguard.zip proguard-7.6.1/lib/proguard.jar \
  && mkdir -p /opt/proguard \
  && mv proguard-7.6.1/lib/proguard.jar /opt/proguard/proguard.jar \
  && rm -rf /tmp/proguard.zip proguard-7.6.1 \
  && chmod -R a+rX /opt/me /opt/proguard /opt/jdk8

COPY api /opt/pack/api

RUN mkdir -p /tmp/nokia \
  && /opt/jdk8/bin/javac -source 1.3 -target 1.3 -encoding UTF-8 \
  -bootclasspath /opt/me/cldcapi11.jar:/opt/me/midpapi20.jar \
  -extdirs "" \
  -d /tmp/nokia \
  /opt/pack/api/com/nokia/mid/ui/DirectGraphics.java \
  /opt/pack/api/com/nokia/mid/ui/DirectUtils.java \
  /opt/pack/api/com/nokia/mid/ui/DeviceControl.java \
  && /opt/jdk8/bin/jar cf /opt/me/nokiaui.jar -C /tmp/nokia . \
  && chmod a+r /opt/me/nokiaui.jar \
  && rm -rf /tmp/nokia

COPY Pack.java /opt/pack/Pack.java
COPY entrypoint.sh /opt/pack/entrypoint.sh

RUN chmod 755 /opt/pack/entrypoint.sh \
  && mkdir -p /input /output /sources

ENTRYPOINT ["/opt/pack/entrypoint.sh"]
