# syntax=docker/dockerfile:1

FROM eclipse-temurin:17-jdk-jammy

RUN mkdir -p /opt/unpack /input /output /sources

COPY Unpack.java /opt/unpack/Unpack.java
COPY entrypoint.sh /opt/unpack/entrypoint.sh

RUN chmod 755 /opt/unpack/entrypoint.sh

ENTRYPOINT ["/opt/unpack/entrypoint.sh"]
