# syntax=docker/dockerfile:1

FROM eclipse-temurin:17-jdk-jammy

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nginx maven \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/teavm
COPY pom.xml /opt/teavm/pom.xml
RUN mvn -q -DskipTests -DoutputDirectory=/opt/teavm/lib dependency:copy-dependencies \
  && find /opt/teavm/lib -name '*-all.jar' -exec mv {} /opt/teavm/teavm.jar \; \
  && rm -rf /root/.m2

COPY runtime /opt/run/src/runtime
COPY prepare /opt/run/src/prepare
COPY nginx.conf /opt/run/nginx.conf
COPY entrypoint.sh /opt/run/entrypoint.sh

RUN mkdir -p /opt/run/runtime /tmp/prepare-classes \
  && javac --release 17 -encoding UTF-8 -cp '/opt/teavm/lib/*' -d /opt/run/runtime $(find /opt/run/src/runtime -name '*.java') \
  && javac --release 17 -encoding UTF-8 -cp '/opt/teavm/lib/*' -d /tmp/prepare-classes $(find /opt/run/src/prepare -name '*.java') \
  && jar cfe /opt/run/prepare.jar javatales.prepare.Prepare -C /tmp/prepare-classes . \
  && rm -rf /tmp/prepare-classes \
  && chmod 755 /opt/run/entrypoint.sh \
  && chmod -R a+rX /opt/run /opt/teavm

WORKDIR /tmp
EXPOSE 8080
ENTRYPOINT ["/opt/run/entrypoint.sh"]
